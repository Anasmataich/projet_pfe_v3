/**
 * csp.config.ts — Configuration Content Security Policy (CSP).
 *
 * Définit les directives CSP pour protéger la plateforme GED contre
 * les attaques XSS, injection de scripts et data exfiltration.
 *
 * @see https://developer.mozilla.org/fr/docs/Web/HTTP/CSP
 * @module security/csp
 */

export interface CspDirectives {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  mediaSrc: string[];
  objectSrc: string[];
  frameSrc: string[];
  frameAncestors: string[];
  formAction: string[];
  baseUri: string[];
  workerSrc: string[];
  manifestSrc: string[];
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
}

export interface CspConfig {
  directives: CspDirectives;
  reportOnly: boolean;
  reportUri?: string;
}

export const developmentCsp: CspConfig = {
  reportOnly: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    connectSrc: [
      "'self'",
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8000',
      'ws://localhost:5173',
    ],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
    manifestSrc: ["'self'"],
  },
};

export const productionCsp: CspConfig = {
  reportOnly: false,
  reportUri: '/api/v1/csp-report',
  directives: {
    defaultSrc: ["'none'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'blob:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
  },
};

export function getCspConfig(env: string = 'development', apiUrl?: string): CspConfig {
  const isProduction = env === 'production';
  const config = isProduction
    ? structuredClone(productionCsp)
    : structuredClone(developmentCsp);

  if (apiUrl) {
    config.directives.connectSrc = [
      ...new Set([...config.directives.connectSrc, apiUrl]),
    ];
  }

  return config;
}

export function toHelmetDirectives(config: CspConfig): Record<string, string[] | boolean> {
  const directives: Record<string, string[] | boolean> = {};

  for (const [key, value] of Object.entries(config.directives)) {
    if (key === 'upgradeInsecureRequests' && value === true) {
      directives['upgrade-insecure-requests'] = [];
      continue;
    }
    if (key === 'blockAllMixedContent' && value === true) {
      directives['block-all-mixed-content'] = [];
      continue;
    }
    if (Array.isArray(value)) {
      const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      directives[kebab] = value;
    }
  }

  if (config.reportUri) {
    directives['report-uri'] = [config.reportUri];
  }

  return directives;
}
