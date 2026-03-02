import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import { LoginPage } from '@/pages/LoginPage';
import { MFAPage } from '@/pages/MFAPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { DocumentViewerPage } from '@/pages/DocumentViewerPage';
import { UploadPage } from '@/pages/UploadPage';
import { WorkflowPage } from '@/pages/WorkflowPage';
import { AIToolsPage } from '@/pages/AIToolsPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { UserManagementPage } from '@/pages/UserManagementPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mfa" element={<MFAPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected — wrapped in MainLayout */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/:id" element={<DocumentViewerPage />} />
        <Route path="upload" element={<ProtectedRoute roles={['ADMIN', 'CADRE', 'INSPECTEUR', 'RH', 'COMPTABLE']}><UploadPage /></ProtectedRoute>} />
        <Route path="workflow" element={<ProtectedRoute roles={['ADMIN', 'CADRE', 'INSPECTEUR']}><WorkflowPage /></ProtectedRoute>} />
        <Route path="ai" element={<ProtectedRoute roles={['ADMIN', 'CADRE', 'INSPECTEUR', 'RH', 'COMPTABLE']}><AIToolsPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['ADMIN', 'CADRE', 'COMPTABLE', 'RH']}><ReportsPage /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute roles={['ADMIN', 'CADRE']}><AuditLogsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['ADMIN']}><UserManagementPage /></ProtectedRoute>} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
