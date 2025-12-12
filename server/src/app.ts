import express from "express";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./api/user/userRouter";
import tourRouter from "./api/tours/tourRouter";
import tourSearchRouter from "./api/tours/tourSearchRouter";
import cors from "cors";
import { config } from "./config/config";
import breadcrumbsMiddleware from "./middlewares/breadcrumbsMiddleware";
import galleryRoutes from "./api/gallery/galleryRoutes";
import generateRouter from "./api/generate/generateRoute";
import subscriberRouter from "./api/subscriber/subscriberRouter";
import factsRouter from "./api/user/facts/factsRoutes";
import faqsRouter from "./api/user/faq/faqRouter";
import postRouter from "./api/post/postRoute";
import reviewRoutes from "./api/review/reviewRoutes";
import globalRoutes from "./api/global";
import bookingRouter from "./api/bookings/bookingRoutes";
// import fixedDepartureRouter from "./api/fixedDepartureRouter";
// import schemaRoutes from "./api/tours/schemaRoutes";

// Add multer for handling multipart/form-data
import multer from 'multer';

const app = express();

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


// Apply breadcrumbsMiddleware before specific routes
app.use(breadcrumbsMiddleware);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Hello, this is TourBNT APIs" });
});

app.use("/api/users", userRouter);
app.use("/api/tours", tourRouter);
app.use("/api/tour-search", tourSearchRouter);
app.use('/api/subscribers', subscriberRouter);
app.use("/api/gallery", galleryRoutes);
app.use("/api/generate", generateRouter);
app.use("/api/posts", postRouter);
app.use("/api/facts", factsRouter);
app.use("/api/faqs", faqsRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/api/global", globalRoutes);
app.use("/api/bookings", bookingRouter);
// app.use("/api/fixed-departures", fixedDepartureRouter);
// app.use("/api/schema", schemaRoutes);

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

// Global error handler
app.use(globalErrorHandler);

export default app;
