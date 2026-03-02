<#
.SYNOPSIS
    GED Platform Health Check — Verifie que tous les services sont operationnels.
.DESCRIPTION
    Compatible PowerShell 5.1+ et PowerShell 7+.
    Checks: Backend (5000), AI Service (8000), Frontend (3000), MinIO (9000),
    MailHog (8025), PostgreSQL, Redis.
.PARAMETER Compose
    Also checks Docker container status.
.EXAMPLE
    .\scripts\health-check.ps1
    .\scripts\health-check.ps1 -Compose
#>

param(
    [switch]$Compose
)

$ErrorActionPreference = "SilentlyContinue"

# ── Configuration (PS 5.1 compatible) ─────────────────────────────────
# No ?? operator, no if-expression assignment
$BackendUrl  = $env:BACKEND_URL;  if (-not $BackendUrl)  { $BackendUrl  = "http://localhost:5000" }
$AiUrl       = $env:AI_URL;       if (-not $AiUrl)       { $AiUrl       = "http://localhost:8000" }
$FrontendUrl = $env:FRONTEND_URL; if (-not $FrontendUrl) { $FrontendUrl = "http://localhost:3000" }
$MinioUrl    = $env:MINIO_URL;    if (-not $MinioUrl)    { $MinioUrl    = "http://localhost:9000" }
$MailhogUrl  = $env:MAILHOG_URL;  if (-not $MailhogUrl)  { $MailhogUrl  = "http://localhost:8025" }

$DbContainer    = "ged-postgres"
$RedisContainer = "ged-redis"
$DbName  = $env:POSTGRES_DB;   if (-not $DbName)  { $DbName  = "ged_db" }
$DbUser  = $env:POSTGRES_USER; if (-not $DbUser)  { $DbUser  = "ged_user" }
$RedisPassword = $env:REDIS_PASSWORD

$Timeout       = 5
$script:Errors = 0
$script:Passed = 0

# ── Output helpers ────────────────────────────────────────────────────
function Write-Check {
    param(
        [string]$Label,
        [string]$Status,
        [string]$Detail
    )
    $padded = $Label.PadRight(34)
    switch ($Status) {
        "PASS" {
            Write-Host ("  [") -NoNewline
            Write-Host "OK"   -ForegroundColor Green -NoNewline
            Write-Host ("]   " + $padded + " ") -NoNewline
            Write-Host $Detail -ForegroundColor DarkGray
            $script:Passed++
        }
        "FAIL" {
            Write-Host ("  [") -NoNewline
            Write-Host "FAIL" -ForegroundColor Red -NoNewline
            Write-Host ("] " + $padded + " ") -NoNewline
            Write-Host $Detail -ForegroundColor Red
            $script:Errors++
        }
        "WARN" {
            Write-Host ("  [") -NoNewline
            Write-Host "WARN" -ForegroundColor Yellow -NoNewline
            Write-Host ("] " + $padded + " ") -NoNewline
            Write-Host $Detail -ForegroundColor Yellow
        }
    }
}

# ── HTTP check (expects 200) ─────────────────────────────────────────
function Test-HttpEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$ExpectedContent
    )
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing -ErrorAction Stop
        if ($ExpectedContent -and ($response.Content -notlike ("*" + $ExpectedContent + "*"))) {
            Write-Check -Label $Name -Status "WARN" -Detail ("Response missing '" + $ExpectedContent + "' at " + $Url)
        } else {
            Write-Check -Label $Name -Status "PASS" -Detail $Url
        }
    } catch {
        $code = 0
        if ($_.Exception -and $_.Exception.Response) {
            try { $code = [int]$_.Exception.Response.StatusCode } catch { $code = 0 }
        }
        if ($code -gt 0) {
            Write-Check -Label $Name -Status "WARN" -Detail ("HTTP " + $code + " at " + $Url + " (service is up)")
        } else {
            Write-Check -Label $Name -Status "FAIL" -Detail ("Unreachable - " + $Url)
        }
    }
}

# ── HTTP check (expects 401 on protected route) ──────────────────────
function Test-ProtectedRoute {
    param(
        [string]$Name,
        [string]$Url
    )
    try {
        $null = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing -ErrorAction Stop
        Write-Check -Label $Name -Status "WARN" -Detail "Expected 401, got 200 - auth middleware issue"
    } catch {
        $code = 0
        if ($_.Exception -and $_.Exception.Response) {
            try { $code = [int]$_.Exception.Response.StatusCode } catch { $code = 0 }
        }
        if ($code -eq 401) {
            Write-Check -Label $Name -Status "PASS" -Detail "401 Unauthorized (correct)"
        } elseif ($code -gt 0) {
            Write-Check -Label $Name -Status "WARN" -Detail ("Expected 401, got " + $code)
        } else {
            Write-Check -Label $Name -Status "FAIL" -Detail ("Backend unreachable - " + $Url)
        }
    }
}

# ── Docker container check ───────────────────────────────────────────
function Test-DockerContainer {
    param(
        [string]$Name,
        [string]$ContainerName
    )

    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Check -Label $Name -Status "WARN" -Detail "docker not available"
        return
    }

    $running = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -eq $ContainerName }
    if ($running) {
        $cStatus = docker inspect --format="{{.State.Status}}" $ContainerName 2>$null
        $cHealth = docker inspect --format="{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" $ContainerName 2>$null
        if (-not $cHealth) { $cHealth = "none" }

        if ($cStatus -eq "running" -and ($cHealth -eq "healthy" -or $cHealth -eq "none")) {
            Write-Check -Label $Name -Status "PASS" -Detail ("running / " + $cHealth)
        } elseif ($cStatus -eq "running") {
            Write-Check -Label $Name -Status "WARN" -Detail ("running / " + $cHealth)
        } else {
            Write-Check -Label $Name -Status "FAIL" -Detail ("status: " + $cStatus)
        }
    } else {
        Write-Check -Label $Name -Status "WARN" -Detail ("Container '" + $ContainerName + "' not found")
    }
}

# ── Database connectivity (via docker exec) ──────────────────────────
function Test-DatabaseConnection {
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Check -Label "PostgreSQL Connection" -Status "WARN" -Detail "docker not available - skipped"
        return
    }

    $running = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -eq $DbContainer }
    if (-not $running) {
        Write-Check -Label "PostgreSQL Connection" -Status "WARN" -Detail ("Container '" + $DbContainer + "' not running")
        return
    }

    $null = docker exec $DbContainer pg_isready -U $DbUser -d $DbName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Check -Label "PostgreSQL Connection" -Status "PASS" -Detail ($DbUser + "@" + $DbName + " (pg_isready)")
    } else {
        Write-Check -Label "PostgreSQL Connection" -Status "FAIL" -Detail ("pg_isready failed inside " + $DbContainer)
    }

    $tableCount = docker exec $DbContainer psql -U $DbUser -d $DbName -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>$null
    if ($LASTEXITCODE -eq 0 -and $tableCount) {
        $count = $tableCount.Trim()
        $countInt = 0
        $parsed = [int]::TryParse($count, [ref]$countInt)
        if ($parsed -and $countInt -gt 0) {
            Write-Check -Label "PostgreSQL Schema" -Status "PASS" -Detail ($count + " tables in public schema")
        } else {
            Write-Check -Label "PostgreSQL Schema" -Status "WARN" -Detail "0 tables - migrations may not have run"
        }
    } else {
        Write-Check -Label "PostgreSQL Schema" -Status "WARN" -Detail "Could not query tables"
    }
}

# ── Redis connectivity (via docker exec) ─────────────────────────────
function Test-RedisConnection {
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Check -Label "Redis Connection" -Status "WARN" -Detail "docker not available - skipped"
        return
    }

    $running = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -eq $RedisContainer }
    if (-not $running) {
        Write-Check -Label "Redis Connection" -Status "WARN" -Detail ("Container '" + $RedisContainer + "' not running")
        return
    }

    $pong = ""
    if ($RedisPassword) {
        $pong = docker exec $RedisContainer redis-cli -a $RedisPassword --no-auth-warning ping 2>$null
    } else {
        $pong = docker exec $RedisContainer redis-cli ping 2>$null
    }

    if ($pong -and $pong.Trim() -eq "PONG") {
        Write-Check -Label "Redis Connection" -Status "PASS" -Detail "PONG received"
    } else {
        Write-Check -Label "Redis Connection" -Status "FAIL" -Detail "No PONG - check REDIS_PASSWORD"
    }
}

# ══════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GED Platform - Health Check" -ForegroundColor Cyan
$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host ("  " + $now) -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. HTTP Services ─────────────────────────────────────────────────
Write-Host "  HTTP Services" -ForegroundColor Cyan
Write-Host "  ---------------------------------------------" -ForegroundColor DarkGray
Test-HttpEndpoint -Name "Backend API (port 5000)"  -Url ($BackendUrl + "/health")            -ExpectedContent "status"
Test-HttpEndpoint -Name "AI Service (port 8000)"   -Url ($AiUrl + "/health")                 -ExpectedContent "status"
Test-HttpEndpoint -Name "AI Swagger Docs"          -Url ($AiUrl + "/docs")                   -ExpectedContent "swagger"
Test-HttpEndpoint -Name "Frontend (port 3000)"     -Url $FrontendUrl                         -ExpectedContent ""
Test-HttpEndpoint -Name "MinIO Health (port 9000)" -Url ($MinioUrl + "/minio/health/live")   -ExpectedContent ""
Test-HttpEndpoint -Name "MailHog UI (port 8025)"   -Url $MailhogUrl                          -ExpectedContent ""
Write-Host ""

# ── 2. API Security ──────────────────────────────────────────────────
Write-Host "  API Security (expect 401 without token)" -ForegroundColor Cyan
Write-Host "  ---------------------------------------------" -ForegroundColor DarkGray
Test-ProtectedRoute -Name "GET /api/v1/documents" -Url ($BackendUrl + "/api/v1/documents")
Test-ProtectedRoute -Name "GET /api/v1/users"     -Url ($BackendUrl + "/api/v1/users")
Write-Host ""

# ── 3. Database & Redis ──────────────────────────────────────────────
Write-Host "  Database & Cache" -ForegroundColor Cyan
Write-Host "  ---------------------------------------------" -ForegroundColor DarkGray
Test-DatabaseConnection
Test-RedisConnection
Write-Host ""

# ── 4. Docker Containers (optional) ──────────────────────────────────
if ($Compose) {
    Write-Host "  Docker Containers" -ForegroundColor Cyan
    Write-Host "  ---------------------------------------------" -ForegroundColor DarkGray
    Test-DockerContainer -Name "PostgreSQL"    -ContainerName "ged-postgres"
    Test-DockerContainer -Name "Redis"         -ContainerName "ged-redis"
    Test-DockerContainer -Name "MinIO"         -ContainerName "ged-minio"
    Test-DockerContainer -Name "Backend"       -ContainerName "ged-backend"
    Test-DockerContainer -Name "AI Service"    -ContainerName "ged-ai-service"
    Test-DockerContainer -Name "Frontend"      -ContainerName "ged-frontend"
    Test-DockerContainer -Name "MailHog"       -ContainerName "ged-mailhog"
    Write-Host ""
}

# ── Summary ───────────────────────────────────────────────────────────
Write-Host "================================================================" -ForegroundColor Cyan
if ($script:Errors -eq 0) {
    $msg = "  All checks passed (" + $script:Passed + " OK) - Platform is healthy!"
    Write-Host $msg -ForegroundColor Green
} else {
    $msg = "  " + $script:Errors + " check(s) FAILED, " + $script:Passed + " passed"
    Write-Host $msg -ForegroundColor Red
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Gray
    Write-Host "    docker compose ps                      # container status" -ForegroundColor DarkGray
    Write-Host "    docker compose logs backend             # backend logs" -ForegroundColor DarkGray
    Write-Host "    docker compose logs ai-service          # AI service logs" -ForegroundColor DarkGray
    Write-Host "    cat .env                                # verify env vars" -ForegroundColor DarkGray
}
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

exit $script:Errors
