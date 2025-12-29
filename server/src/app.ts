import express from "express";
import { errorHandler, notFoundHandler } from "./utils/apiResponse";
import authRouter from "./api/auth/authRouter";
import userRouter from "./api/user/userRouter";
import tourRouter from "./api/tours/tourRouter";
import tourRouterV2 from "./api/tours/tourRouterV2";
import tourSearchRouter from "./api/tours/tourSearchRouter";
import galleryRoutes from "./api/gallery/galleryRoutes";
import generateRouter from "./api/generate/generateRoute";
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
import cors from "cors";
import { config } from "./config/config";
import breadcrumbsMiddleware from "./middlewares/breadcrumbsMiddleware";
import { metricsMiddleware } from "./middlewares/metricsMiddleware";
import swaggerUi from 'swagger-ui-express';
import { getSwaggerSpec } from './config/swagger';
import { logger } from './utils/logger';
import cookieParser from 'cookie-parser';

const app = express();

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



app.use(express.json());

// Apply metrics middleware to track all requests
app.use(metricsMiddleware);

// Apply breadcrumbsMiddleware before specific routes
app.use(breadcrumbsMiddleware);

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
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/tour-search', tourSearchRouter);
app.use('/api/v1/subscribers', subscriberRouter);
app.use('/api/v1/gallery', galleryRoutes);
app.use('/api/v1/generate', generateRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/facts', factsRouter);
app.use('/api/v1/faqs', faqsRouter);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/global', globalRoutes);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/monitoring', monitoringRouter);

// API v2 routes - selective endpoint upgrades
app.use('/api/v2/tours', tourRouterV2);

// Debug endpoint to show all registered routes
app.get('/debug/routes', (req, res) => {
  const routes: any[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler: any) => {
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

// 404 Not Found handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
