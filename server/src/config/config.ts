import { config as conf } from "dotenv";
conf();

// Required environment variables
const requiredEnvVars = [
  'MONGO_CONNECTION_STRING',
  'JWT_SECRET'
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
  databaseUrl: process.env.MONGO_CONNECTION_STRING!,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'secret',

  // Cloudinary configuration
  cloudinary: {
    cloud: process.env.CLOUDINARY_CLOUD,
    apiKey: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET
  },

  // Legacy cloudinary fields (for backward compatibility)
  cloudinaryCloud: process.env.CLOUDINARY_CLOUD,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinarySecret: process.env.CLOUDINARY_API_SECRET,

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
} as const;

export const config = Object.freeze(_config);