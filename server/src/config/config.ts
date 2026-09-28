import { config as conf } from "dotenv";
conf();

// Required environment variables
// DATABASE_URL (Postgres) is the single source of truth database for the whole platform.
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLOUDFLARE_R2_ACCOUNT_ID',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET_NAME',
  'CLOUDFLARE_R2_ENDPOINT',
  'CLOUDFLARE_R2_PUBLIC_URL'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  } else {
    console.warn('⚠️  Running in development mode with missing variables');
  }
}

const _config = {
  port: Number(process.env.PORT) || 4000,
  // Postgres — single source of truth (see packages/db for the shared Drizzle schema).
  postgresUrl: process.env.DATABASE_URL!,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET ?? '',

  // Cloudflare R2 configuration (S3-compatible object storage)
  r2: {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID!,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    publicUrl: (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/+$/, ''),
  },


  // Frontend configuration
  frontend: {
    domain: process.env.FRONTEND_DOMAIN,
    homePage: process.env.HOME_PAGE
  },
  frontendDomain: process.env.FRONTEND_DOMAIN,
  homePage: process.env.HOME_PAGE,

  // Email configuration
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD
  },
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,

  // API configuration
  baseUrl: process.env.BASE_URL,

  // OAuth configuration
  oauth: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
    accessToken: process.env.ACCESS_TOKEN
  },
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN,
  accessToken: process.env.ACCESS_TOKEN,

  // OpenAI configuration
  openAI: {
    baseUrl: process.env.OPENAI_API_BASE_URL
  },
  openAIApiBaseUrl: process.env.OPENAI_API_BASE_URL,

  // SendGrid configuration
  sendGrid: {
    apiKey: process.env.SENDGRID_API_KEY
  },
  sendGridKey: process.env.SENDGRID_API_KEY,

  // Maileroo SMTP configuration
  maileroo: {
    smtp: {
      host: process.env.MAILEROO_SMTP_HOST || 'smtp.maileroo.com',
      port: parseInt(process.env.MAILEROO_SMTP_PORT || '587'),
      user: process.env.MAILEROO_SMTP_USER,
      pass: process.env.MAILEROO_SMTP_PASS
    },
    fromEmail: process.env.MAILEROO_FROM_EMAIL || 'info@tourbnt.com'
  },
} as const;

export const config = Object.freeze(_config);