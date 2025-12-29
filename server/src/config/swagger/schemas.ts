/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - error
 *       properties:
 *         error:
 *           type: object
 *           required:
 *             - code
 *             - message
 *             - timestamp
 *             - path
 *           properties:
 *             code:
 *               type: string
 *               description: Machine-readable error code
 *               example: "VALIDATION_ERROR"
 *             message:
 *               type: string
 *               description: Human-readable error message
 *               example: "Invalid request data"
 *             details:
 *               type: object
 *               description: Additional error details (e.g., validation errors)
 *               example:
 *                 email: "Invalid email format"
 *                 password: "Password must be at least 6 characters"
 *             timestamp:
 *               type: string
 *               format: date-time
 *               description: ISO 8601 timestamp
 *               example: "2025-12-14T10:30:00Z"
 *             path:
 *               type: string
 *               description: Request path
 *               example: "/api/v1/auth/register"
 *             requestId:
 *               type: string
 *               description: Unique request ID for tracking
 *       example:
 *         error:
 *           code: "VALIDATION_ERROR"
 *           message: "Invalid request data"
 *           details:
 *             email: "Invalid email format"
 *             password: "Password must be at least 6 characters"
 *           timestamp: "2025-12-14T10:30:00Z"
 *           path: "/api/v1/auth/register"
 *
 *     RateLimitError:
 *       type: object
 *       required:
 *         - error
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: "RATE_LIMIT_EXCEEDED"
 *             message:
 *               type: string
 *               example: "Too many requests, please try again later"
 *             details:
 *               type: object
 *               properties:
 *                 retryAfter:
 *                   type: number
 *                   description: Seconds until rate limit resets
 *                   example: 900
 *                 limit:
 *                   type: number
 *                   description: Maximum requests allowed
 *                   example: 5
 *                 windowMs:
 *                   type: number
 *                   description: Time window in milliseconds
 *                   example: 900000
 *             timestamp:
 *               type: string
 *               format: date-time
 *             path:
 *               type: string
 *       example:
 *         error:
 *           code: "RATE_LIMIT_EXCEEDED"
 *           message: "Too many requests, please try again later"
 *           details:
 *             retryAfter: 900
 *             limit: 5
 *             windowMs: 900000
 *           timestamp: "2025-12-14T10:30:00Z"
 *           path: "/api/v1/auth/login"
 *
 *     PaginationParams:
 *       type: object
 *       description: Query parameters for pagination
 *       properties:
 *         page:
 *           type: number
 *           default: 1
 *           minimum: 1
 *           description: Page number (starts at 1)
 *           example: 1
 *         limit:
 *           type: number
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *           description: Number of items per page (max 100)
 *           example: 10
 *
 *     FilterParams:
 *       type: object
 *       description: Query parameters for filtering resources
 *       properties:
 *         status:
 *           type: string
 *           description: Filter by status
 *           example: "published"
 *         category:
 *           type: string
 *           description: Filter by category ID
 *           example: "507f1f77bcf86cd799439011"
 *         destination:
 *           type: string
 *           description: Filter by destination ID
 *           example: "507f1f77bcf86cd799439012"
 *       additionalProperties: true
 *
 *     SortParams:
 *       type: object
 *       description: Query parameters for sorting resources
 *       properties:
 *         sort:
 *           type: string
 *           description: Field to sort by
 *           example: "createdAt"
 *         order:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *           description: Sort order (ascending or descending)
 *           example: "desc"
 *
 *     PaginationMetadata:
 *       type: object
 *       required:
 *         - total
 *         - page
 *         - limit
 *         - totalPages
 *       properties:
 *         total:
 *           type: number
 *           description: Total number of items
 *           example: 150
 *         page:
 *           type: number
 *           description: Current page number
 *           example: 1
 *         limit:
 *           type: number
 *           description: Items per page
 *           example: 10
 *         totalPages:
 *           type: number
 *           description: Total number of pages
 *           example: 15
 *
 *     PaginatedResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *           example: true
 *         message:
 *           type: string
 *           description: Human-readable message
 *           example: "Success"
 *         data:
 *           type: object
 *           required:
 *             - items
 *             - pagination
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *               description: Array of normalized resources (no _id, __v fields)
 *             pagination:
 *               $ref: '#/components/schemas/PaginationMetadata'
 *       example:
 *         success: true
 *         message: "Success"
 *         data:
 *           items: []
 *           pagination:
 *             total: 150
 *             page: 1
 *             limit: 10
 *             totalPages: 15
 *
 *     StandardResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *           example: true
 *         message:
 *           type: string
 *           description: Human-readable message
 *           example: "Success"
 *         data:
 *           type: object
 *           description: Normalized resource data (no _id, __v fields, id field added)
 *       example:
 *         success: true
 *         message: "Success"
 *         data:
 *           id: "507f1f77bcf86cd799439011"
 *           title: "Sample Resource"
 *           createdAt: "2025-12-14T10:30:00Z"
 *
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User ID (normalized from _id)
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         roles:
 *           type: string
 *           enum: [user, admin, seller, subscriber]
 *           description: User role
 *         avatar:
 *           type: string
 *           description: Avatar image URL
 *         phone:
 *           type: number
 *           description: Phone number
 *         verified:
 *           type: boolean
 *           description: Email verification status
 *         wishlists:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of tour IDs in wishlist
 *         bookings:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of booking IDs
 *         reviews:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of review IDs
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     UserRegistration:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password
 *       example:
 *         name: "John Doe"
 *         email: "john@example.com"
 *         password: "securePassword123"
 *
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *       example:
 *         email: "john@example.com"
 *         password: "securePassword123"
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         user:
 *           $ref: '#/components/schemas/User'
 *       example:
 *         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           id: "507f1f77bcf86cd799439011"
 *           name: "John Doe"
 *           email: "john@example.com"
 *           roles: "user"
 *
 *     UserSettings:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         openAIKey:
 *           type: string
 *           description: Encrypted OpenAI API key
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Location:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         country:
 *           type: string
 *         lat:
 *           type: number
 *         lng:
 *           type: number
 *
 *     Itinerary:
 *       type: object
 *       properties:
 *         day:
 *           type: number
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         activities:
 *           type: array
 *           items:
 *             type: string
 *
 *     Fact:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         label:
 *           type: string
 *         value:
 *           type: string
 *
 *     FAQ:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         question:
 *           type: string
 *         answer:
 *           type: string
 *
 *     GalleryItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         url:
 *           type: string
 *         caption:
 *           type: string
 *         type:
 *           type: string
 *           enum: [image, video]
 *
 *     Discount:
 *       type: object
 *       properties:
 *         percentageOrPrice:
 *           type: boolean
 *           description: True for percentage, false for fixed price
 *         discountPercentage:
 *           type: number
 *         discountPrice:
 *           type: number
 *         maxDiscountAmount:
 *           type: number
 *         discountDateRange:
 *           type: object
 *           properties:
 *             from:
 *               type: string
 *               format: date
 *             to:
 *               type: string
 *               format: date
 *
 *     PricingOption:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         duration:
 *           type: number
 *
 *     TourDates:
 *       type: object
 *       properties:
 *         scheduleType:
 *           type: string
 *           enum: [fixed, flexible]
 *         departures:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                     format: date
 *                   to:
 *                     type: string
 *                     format: date
 *               availableSeats:
 *                 type: number
 *         defaultDateRange:
 *           type: object
 *           properties:
 *             from:
 *               type: string
 *               format: date
 *             to:
 *               type: string
 *               format: date
 *
 *     Tour:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         code:
 *           type: string
 *         description:
 *           type: string
 *         excerpt:
 *           type: string
 *         category:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of category IDs
 *         destination:
 *           type: string
 *           description: Destination ID
 *         author:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of author user IDs
 *         tourStatus:
 *           type: string
 *           enum: [Draft, Published, Archived]
 *         coverImage:
 *           type: string
 *         price:
 *           type: number
 *         pricePerPerson:
 *           type: boolean
 *         minSize:
 *           type: number
 *         maxSize:
 *           type: number
 *         averageRating:
 *           type: number
 *         reviewCount:
 *           type: number
 *         views:
 *           type: number
 *         isSpecialOffer:
 *           type: boolean
 *         enquiry:
 *           type: boolean
 *         itinerary:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Itinerary'
 *         facts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Fact'
 *         faqs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FAQ'
 *         gallery:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GalleryItem'
 *         location:
 *           $ref: '#/components/schemas/Location'
 *         discount:
 *           $ref: '#/components/schemas/Discount'
 *         pricingOptions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PricingOption'
 *         tourDates:
 *           $ref: '#/components/schemas/TourDates'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     GuestInfo:
 *       type: object
 *       properties:
 *         fullName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         country:
 *           type: string
 *
 *     Participants:
 *       type: object
 *       properties:
 *         adults:
 *           type: number
 *           minimum: 1
 *         children:
 *           type: number
 *           minimum: 0
 *         infants:
 *           type: number
 *           minimum: 0
 *
 *     Traveler:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - phone
 *         - dateOfBirth
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         passportNumber:
 *           type: string
 *
 *     BookingPricing:
 *       type: object
 *       properties:
 *         basePrice:
 *           type: number
 *         adultPrice:
 *           type: number
 *         childPrice:
 *           type: number
 *         infantPrice:
 *           type: number
 *         totalPrice:
 *           type: number
 *         currency:
 *           type: string
 *           default: USD
 *
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         tour:
 *           type: string
 *           description: Tour ID
 *         tourTitle:
 *           type: string
 *         tourCode:
 *           type: string
 *         user:
 *           type: string
 *           description: User ID (optional for guest bookings)
 *         isGuestBooking:
 *           type: boolean
 *         guestInfo:
 *           $ref: '#/components/schemas/GuestInfo'
 *         departureDate:
 *           type: string
 *           format: date
 *         participants:
 *           $ref: '#/components/schemas/Participants'
 *         travelers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Traveler'
 *         pricing:
 *           $ref: '#/components/schemas/BookingPricing'
 *         contactName:
 *           type: string
 *         contactEmail:
 *           type: string
 *           format: email
 *         contactPhone:
 *           type: string
 *         specialRequests:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         paymentStatus:
 *           type: string
 *           enum: [unpaid, partial, paid, refunded]
 *         bookingReference:
 *           type: string
 *         bookingDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Review:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         tour:
 *           type: string
 *           description: Tour ID
 *         user:
 *           type: string
 *           description: User ID
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         author:
 *           type: string
 *           description: User ID
 *         coverImage:
 *           type: string
 *         status:
 *           type: string
 *           enum: [draft, published]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Subscriber:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         subscribedAt:
 *           type: string
 *           format: date-time
 *
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         slug:
 *           type: string
 *
 *     Destination:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         country:
 *           type: string
 *         image:
 *           type: string
 *
 *     BulkDeleteRequest:
 *       type: object
 *       required:
 *         - ids
 *       properties:
 *         ids:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of resource IDs to delete
 *           example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *
 *     BulkDeleteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs of successfully deleted resources
 *         failed:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               error:
 *                 type: string
 *           description: IDs and error messages for failed deletions
 *       example:
 *         success: ["507f1f77bcf86cd799439011"]
 *         failed:
 *           - id: "507f1f77bcf86cd799439012"
 *             error: "Not found"
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *       example:
 *         message: "Operation completed successfully"
 *
 *     StatusUpdateRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           description: New status value
 *       example:
 *         status: "approved"
 *
 *     RoleUpdateRequest:
 *       type: object
 *       required:
 *         - role
 *       properties:
 *         role:
 *           type: string
 *           enum: [user, admin, seller, subscriber]
 *           description: New role for the user
 *       example:
 *         role: "seller"
 *
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Notification ID (normalized from _id)
 *           example: "507f1f77bcf86cd799439011"
 *         recipient:
 *           type: string
 *           description: User ID of the notification recipient
 *           example: "507f1f77bcf86cd799439012"
 *         sender:
 *           type: object
 *           description: User who triggered the notification
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         type:
 *           type: string
 *           enum: [destination_rejected, destination_approved, destination_deleted, general]
 *           description: Type of notification
 *           example: "destination_approved"
 *         title:
 *           type: string
 *           description: Notification title
 *           example: "Destination Approved"
 *         message:
 *           type: string
 *           description: Notification message
 *           example: "Your destination has been approved"
 *         data:
 *           type: object
 *           description: Additional notification data
 *           properties:
 *             destinationId:
 *               type: string
 *             destinationName:
 *               type: string
 *             rejectionReason:
 *               type: string
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *           example: false
 *         readAt:
 *           type: string
 *           format: date-time
 *           description: When the notification was read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the notification was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the notification was last updated
 */

// This file only contains JSDoc comments for schema definitions
// The actual schemas are defined in the Swagger specification
export { };
