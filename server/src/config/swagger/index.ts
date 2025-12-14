import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config';

/**
 * Swagger/OpenAPI 3.0 Configuration
 * This module generates the OpenAPI specification from JSDoc comments in route files
 */

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'TourBNT API',
        version: '1.0.0',
        description: `
# TourBNT REST API Documentation

Comprehensive RESTful API for tour booking and management platform. This API follows REST best practices with consistent naming conventions, proper HTTP verb usage, and standardized error handling.

## Key Features

- **RESTful Design**: Resource-based URLs with proper HTTP verbs (GET, POST, PATCH, DELETE)
- **Rate Limiting**: Protection against abuse with configurable rate limits
- **Pagination**: Consistent pagination across all list endpoints
- **Filtering & Sorting**: Flexible data retrieval with query parameters
- **Authentication**: JWT-based authentication with role-based access control
- **Automatic View Tracking**: Server-side analytics for tours, posts, and reviews

## Rate Limiting

The API implements rate limiting to protect against abuse:

- **Authentication Endpoints** (\`/api/auth/*\`): 5 requests per 15 minutes per IP
- **General Endpoints**: 100 requests per 15 minutes per IP

Rate limit information is included in response headers:
- \`X-RateLimit-Limit\`: Maximum requests allowed
- \`X-RateLimit-Remaining\`: Requests remaining in current window
- \`X-RateLimit-Reset\`: Unix timestamp when limit resets
- \`Retry-After\`: Seconds until limit resets (on 429 responses)

## Pagination

All list endpoints support pagination with consistent query parameters:

- \`page\`: Page number (default: 1, minimum: 1)
- \`limit\`: Items per page (default: 10, minimum: 1, maximum: 100)

Paginated responses include metadata:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
\`\`\`

## Filtering and Sorting

List endpoints support filtering and sorting via query parameters:

**Filtering**: Use resource-specific query parameters
- Example: \`?status=published&category=adventure\`
- Multiple filters are combined with AND logic

**Sorting**: Use \`sort\` and \`order\` parameters
- \`sort\`: Field name to sort by
- \`order\`: \`asc\` (ascending) or \`desc\` (descending)
- Example: \`?sort=createdAt&order=desc\`

## Error Responses

All errors follow a consistent structure:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* Additional context */ },
    "timestamp": "2025-12-14T10:30:00Z",
    "path": "/api/endpoint"
  }
}
\`\`\`

## HTTP Status Codes

- **200 OK**: Successful GET, PATCH requests
- **201 Created**: Successful POST (resource creation)
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Invalid input or validation errors
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource does not exist
- **409 Conflict**: Resource already exists (e.g., duplicate email)
- **429 Too Many Requests**: Rate limit exceeded

## Authentication

Most endpoints require authentication using JWT tokens:

1. Obtain a token via \`POST /api/auth/login\`
2. Include token in Authorization header: \`Bearer <token>\`
3. Token expires based on \`keepMeSignedIn\` setting

## Nested Resources

The API uses nested routes for related resources:
- \`/api/users/{userId}/tours\` - User's tours
- \`/api/tours/{tourId}/reviews\` - Tour reviews
- \`/api/posts/{postId}/comments\` - Post comments

## Automatic View Tracking

GET requests to certain resources automatically increment view counts:
- Tours: \`GET /api/tours/{tourId}\`
- Posts: \`GET /api/posts/{postId}\`
- Reviews: \`GET /api/reviews/{reviewId}\`

No explicit view tracking calls are needed from clients.
        `,
        contact: {
            name: 'TourBNT Support',
            email: 'support@tourbnt.com',
        },
        license: {
            name: 'ISC',
            url: 'https://opensource.org/licenses/ISC',
        },
    },
    servers: [
        {
            url: config.baseUrl || `http://localhost:${config.port}`,
            description: config.env === 'production' ? 'Production server' : 'Development server',
        },
    ],
    tags: [
        {
            name: 'Authentication',
            description: 'User authentication endpoints (register, login, password reset). Rate limited to 5 requests per 15 minutes.',
        },
        {
            name: 'Users',
            description: 'User profile management, role changes, and user-specific resources',
        },
        {
            name: 'Tours',
            description: 'Tour creation, listing, updating, and management. Supports pagination, filtering, and sorting.',
        },
        {
            name: 'Tour Search',
            description: 'Advanced tour search with filters and pagination',
        },
        {
            name: 'Bookings',
            description: 'Booking creation, management, and payment processing. Supports guest bookings.',
        },
        {
            name: 'Gallery',
            description: 'Media gallery management for images and videos',
        },
        {
            name: 'Posts',
            description: 'Blog posts creation and comment management',
        },
        {
            name: 'Reviews',
            description: 'Tour reviews, ratings, and feedback management',
        },
        {
            name: 'Subscribers',
            description: 'Newsletter subscription management',
        },
        {
            name: 'Facts',
            description: 'Tour facts and information management',
        },
        {
            name: 'FAQs',
            description: 'Frequently asked questions management',
        },
        {
            name: 'Global',
            description: 'Global resources: categories, destinations, and seller applications',
        },
        {
            name: 'AI Generation',
            description: 'AI-powered content generation for tours',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token obtained from the login endpoint',
            },
        },
        parameters: {
            pageParam: {
                name: 'page',
                in: 'query',
                description: 'Page number (starts at 1)',
                required: false,
                schema: {
                    type: 'integer',
                    minimum: 1,
                    default: 1,
                },
            },
            limitParam: {
                name: 'limit',
                in: 'query',
                description: 'Number of items per page (max 100)',
                required: false,
                schema: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 100,
                    default: 10,
                },
            },
            sortParam: {
                name: 'sort',
                in: 'query',
                description: 'Field to sort by',
                required: false,
                schema: {
                    type: 'string',
                },
            },
            orderParam: {
                name: 'order',
                in: 'query',
                description: 'Sort order',
                required: false,
                schema: {
                    type: 'string',
                    enum: ['asc', 'desc'],
                    default: 'asc',
                },
            },
        },
        responses: {
            BadRequest: {
                description: 'Bad Request - Invalid input parameters',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse',
                        },
                        example: {
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid request data',
                                details: {
                                    email: 'Invalid email format',
                                },
                                timestamp: '2025-12-14T10:30:00Z',
                                path: '/api/auth/register',
                            },
                        },
                    },
                },
            },
            Unauthorized: {
                description: 'Unauthorized - Authentication required or invalid credentials',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse',
                        },
                        example: {
                            error: {
                                code: 'AUTHENTICATION_FAILED',
                                message: 'Invalid credentials',
                                timestamp: '2025-12-14T10:30:00Z',
                                path: '/api/auth/login',
                            },
                        },
                    },
                },
            },
            Forbidden: {
                description: 'Forbidden - Insufficient permissions',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse',
                        },
                        example: {
                            error: {
                                code: 'AUTHORIZATION_FAILED',
                                message: 'Insufficient permissions',
                                timestamp: '2025-12-14T10:30:00Z',
                                path: '/api/users',
                            },
                        },
                    },
                },
            },
            NotFound: {
                description: 'Not Found - Resource does not exist',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse',
                        },
                        example: {
                            error: {
                                code: 'NOT_FOUND',
                                message: 'Resource not found',
                                timestamp: '2025-12-14T10:30:00Z',
                                path: '/api/tours/123',
                            },
                        },
                    },
                },
            },
            Conflict: {
                description: 'Conflict - Resource already exists',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse',
                        },
                        example: {
                            error: {
                                code: 'CONFLICT',
                                message: 'Email already exists',
                                timestamp: '2025-12-14T10:30:00Z',
                                path: '/api/auth/register',
                            },
                        },
                    },
                },
            },
            TooManyRequests: {
                description: 'Too Many Requests - Rate limit exceeded',
                headers: {
                    'X-RateLimit-Limit': {
                        description: 'Maximum number of requests allowed in the time window',
                        schema: {
                            type: 'integer',
                            example: 5,
                        },
                    },
                    'X-RateLimit-Remaining': {
                        description: 'Number of requests remaining in the current time window',
                        schema: {
                            type: 'integer',
                            example: 0,
                        },
                    },
                    'X-RateLimit-Reset': {
                        description: 'Timestamp when the rate limit resets (Unix epoch)',
                        schema: {
                            type: 'integer',
                            example: 1702554600,
                        },
                    },
                    'Retry-After': {
                        description: 'Seconds until the rate limit resets',
                        schema: {
                            type: 'integer',
                            example: 900,
                        },
                    },
                },
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/RateLimitError',
                        },
                    },
                },
            },
        },
        schemas: {}, // Will be populated from schemas.ts
    },
};

// Always use source files for Swagger JSDoc comments (they're preserved in production)
const options: swaggerJsdoc.Options = {
    definition: swaggerDefinition,
    // Path to the API routes where JSDoc comments are located
    apis: [
        './src/api/auth/*.ts',
        './src/api/user/*.ts',
        './src/api/user/facts/*.ts',
        './src/api/user/faq/*.ts',
        './src/api/tours/*.ts',
        './src/api/bookings/*.ts',
        './src/api/gallery/*.ts',
        './src/api/post/*.ts',
        './src/api/review/*.ts',
        './src/api/subscriber/*.ts',
        './src/api/global/**/*.ts',
        './src/api/generate/*.ts',
        './src/api/comment/*.ts',
        './src/config/swagger/schemas.ts',
    ],
};

/**
 * Generate and return the Swagger specification
 */
export function getSwaggerSpec(): object {
    const swaggerSpec = swaggerJsdoc(options);
    return swaggerSpec;
}

export default getSwaggerSpec;
