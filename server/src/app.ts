import express from "express";
import { errorHandler, notFoundHandler } from "./utils/apiResponse";
import authRouter from "./api/auth/authRouter";
import userRouter from "./api/user/userRouter";
import tourSettingsRouter from "./api/tourSettings/tourSettingsRoutes";
import tourRouter from "./api/tours/tourRouter";
import agencyRouter from "./api/tours/agencyRouter";
import tourRouterV2 from "./api/tours/tourRouterV2";
import tourSearchRouter from "./api/tours/tourSearchRouter";
import galleryRoutes from "./api/gallery/galleryRoutes";
import generateRouter from "./api/generate/generateRoute";
import aiRouter from "./api/ai/aiRoute";
import subscriberRouter from "./api/subscriber/subscriberRouter";
import factsRouter from "./api/user/facts/factsRoutes";
import faqsRouter from "./api/user/faq/faqRouter";
import postRouter from "./api/post/postRoute";
import commentRouter from "./api/comment/commentRouter";
import reviewRoutes from "./api/review/reviewRoutes";
import globalRoutes from "./api/global";
import bookingRouter from "./api/bookings/bookingRoutes";
import notificationRouter from "./api/notifications/notificationRoutes";
import monitoringRouter from "./api/monitoring/monitoringRoutes";
import operationsRouter from "./api/operations/operationsRoutes";
import dashboardSummaryRouter from "./api/dashboardSummary/dashboardSummaryRoutes";
import businessPartnerRouter from "./api/businessPartners/businessPartnerRoutes";
import businessReviewRouter from "./api/businessReviews/businessReviewRoutes";
import adRouter from "./api/ads/adRoutes";
import conversationRouter from "./api/conversations/conversationRoutes";
import homeRouter from "./api/home/homeRoutes";
import cors from "cors";
import { config } from "./config/config";
import { metricsMiddleware } from "./middlewares/metricsMiddleware";
import { generalLimiter } from "./middlewares/rateLimiter";
import swaggerUi from 'swagger-ui-express';
import { getSwaggerSpec } from './config/swagger';
import cookieParser from 'cookie-parser';
import { TRUST_PROXY } from './config/trustProxy';
import helmet from 'helmet';
import { Sentry, sentryEnabled } from './config/sentry';
import healthRouter from "./api/health/healthRoutes";
import promoRouter from "./api/promo/promoRoutes";
import payoutRouter from "./api/payouts/payoutRoutes";
import newsletterRouter from "./api/newsletter/newsletterRoutes";
import passkeyRouter from "./api/auth/passkeyRoutes";
import currencyRouter from "./api/currency/currencyRoutes";

const app = express();
// Believe X-Forwarded-For only from nginx and Cloudflare, so req.ip is the real visitor (see config/trustProxy.ts).
app.set('trust proxy', TRUST_PROXY);

// Standard security headers on every API response (HSTS, nosniff, frame and referrer policy, ...).
// CSP is off here: this app serves JSON plus the Swagger UI (which needs inline scripts). The site's own
// pages get their headers from the Next.js config.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // the site on another origin loads API images/files
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: false },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Split frontendDomain by comma to support multiple domains
      const allowedOrigins = [
        ...(config.frontendDomain?.split(',').map(d => d.trim()) || []),
        config.homePage
      ].filter(Boolean);

      // Check if the origin is in the allowed list or if it's not provided (e.g., for non-browser requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);



// Apply metrics middleware to track all requests
app.use(metricsMiddleware);
app.use('/api', generalLimiter);

// Swagger Documentation
const swaggerSpec = getSwaggerSpec();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TourBNT API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
}));

// Serve OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Hello, this is TourBNT APIs" });
});

// API v1 routes - individual route registrations for flexibility
app.use('/api/v1/home', homeRouter);
// Before /auth so its paths are matched here first.
app.use('/api/v1/auth/passkeys', passkeyRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/users', tourSettingsRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/tour-search', tourSearchRouter);
app.use('/api/v1/subscribers', subscriberRouter);
app.use('/api/v1/gallery', galleryRoutes);
app.use('/api/v1/generate', generateRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/facts', factsRouter);
app.use('/api/v1/faqs', faqsRouter);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/global', globalRoutes);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/monitoring', monitoringRouter);
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/promo-codes', promoRouter);
app.use('/api/v1/payouts', payoutRouter);
app.use('/api/v1/newsletters', newsletterRouter);
app.use('/api/v1/currency', currencyRouter);
app.use('/api/v1/operations', operationsRouter);
app.use('/api/v1/dashboard', dashboardSummaryRouter);
app.use('/api/v1/business-partners', businessPartnerRouter);
app.use('/api/v1/business-reviews', businessReviewRouter);
app.use('/api/v1/ads', adRouter);
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/agencies', agencyRouter);

// API v2 routes - selective endpoint upgrades
app.use('/api/v2/tours', tourRouterV2);

// Local-only route list. Production does not expose the API surface.
if (config.env !== 'production') {
/** The parts of Express's (untyped, internal) router stack this listing reads. */
interface RouterLayer {
  name?: string;
  regexp: RegExp;
  route?: { path: string; methods: Record<string, boolean> };
  handle: { stack?: RouterLayer[] };
}

app.get('/debug/routes', (req, res) => {
  const routes: Array<{ path: string; method: string }> = [];

  (app._router.stack as RouterLayer[]).forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      (middleware.handle.stack ?? []).forEach((handler) => {
        if (handler.route) {
          const path = handler.route.path;
          const baseUrl = middleware.regexp.toString()
            .replace('\\^', '')
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/');

          const fullPath = baseUrl.replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param') + path;

          routes.push({
            path: fullPath,
            method: Object.keys(handler.route.methods)[0].toUpperCase(),
          });
        }
      });
    }
  });

  res.json(routes);
});
}

// Report unhandled route errors (5xx) to Sentry — no-op unless SENTRY_DSN is set. Must precede our own error handler.
if (sentryEnabled) Sentry.setupExpressErrorHandler(app);

// 404 Not Found handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
