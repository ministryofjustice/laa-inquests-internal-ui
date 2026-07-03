// Configuration type definitions

export interface AppConfig {
  port: number;
  environment: string;
  appName: string;
  useHttps: boolean;
  // Add any other app configuration properties
}

export interface CsrfConfig {
  cookieName: string;
  secure: boolean;
  httpOnly: boolean;
}

export interface CookieConfig {
  secure: boolean;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | boolean;
}

export interface SessionConfig {
  secret: string;
  name: string;
  resave: boolean;
  saveUninitialized: boolean;
  cookie: CookieConfig;
}

export interface PathsConfig {
  static: string;
  views: string;
}

export interface Config {
  AUTH_DIRECTORY_URL: string;
  AUTH_CLIENT_ID: string;
  AUTH_CLIENT_SECRET: string;
  AUTH_REDIRECT_URI: string;
  AUTH_POST_LOGOUT_URI: string;
  AUTH_SCOPES: string[];
  CONTACT_EMAIL: string | undefined;
  CONTACT_PHONE: string | undefined;
  DEPARTMENT_NAME: string | undefined;
  DEPARTMENT_URL: string | undefined;
  INQUESTS_API_URL: string;
  MOCK_OAUTH_URL?: string;
  RATELIMIT_HEADERS_ENABLED: string | undefined;
  RATELIMIT_STORAGE_URI: string | undefined;
  RATE_LIMIT_MAX: number | string;
  RATE_WINDOW_MS: number;
  SERVICE_NAME: string | undefined;
  SERVICE_PHASE: string | undefined;
  SERVICE_URL: string | undefined;
  app: AppConfig;
  csrf: CsrfConfig;
  session: SessionConfig;
  paths: PathsConfig;
}
