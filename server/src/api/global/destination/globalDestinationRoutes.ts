import express, { type Request, type Response } from 'express';
import { makeGetAvailable, makeBulkAdd } from '../bulkAdd';
import {
  getApprovedDestinations,
  getDestinationById,
  getDestinationsByCountry,
  searchDestinations,
  getSellerDestinations,
  submitDestination,
  updateDestination,
  updateDestinationPreferences,
  deleteDestination,
  getDestinationUsage,
  getEnabledDestinations,
  getFavoriteDestinations,
  getPendingDestinations,
  approveDestination,
  rejectDestination,
  toggleFavoriteDestination,
  addExistingDestinationToSeller,
  removeExistingDestinationFromSeller,
  toggleDestinationActiveStatus,
  getUserDestinations,
  fixDeletedApprovedDestinations,
  getAllDestinationsAdmin,
  getChangeRequests,
  changeRequestNotFound,
} from './globalDestinationController';
import { authenticate, authorizeRoles } from '../../../middlewares/authenticate';
import { uploadNone } from '../../../middlewares/multer';
import { paginationMiddleware } from '../../../middlewares/pagination';
import { cacheRoute } from '../../../middlewares/cacheMiddleware';
import { invalidateOnWrite } from '../../../services/cacheInvalidation';

const router = express.Router();

router.use(invalidateOnWrite(['destinations', 'destinations-approved', 'destinations-by-country', 'destination-by-id', 'home-feed']));

// Wrapper functions to handle :id parameter for RESTful routes
const updateDestinationById = (req: Request, res: Response) => {
  req.params.destinationId = req.params.id;
  return updateDestination(req, res);
};

const deleteDestinationById = (req: Request, res: Response) => {
  req.params.destinationId = req.params.id;
  return deleteDestination(req, res);
};

// RESTful routes - PUBLIC
/**
 * @swagger
 * /api/v1/global/destinations:
 *   get:
 *     summary: Get all destinations
 *     description: Retrieve all approved global destinations with pagination
 *     tags: [Global]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Destinations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Destination'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', cacheRoute('destinations', 120), paginationMiddleware(), getApprovedDestinations);

// RESTful routes - ADMIN ONLY
/**
 * @swagger
 * /api/v1/global/destinations:
 *   post:
 *     summary: Create new destination (Admin only)
 *     description: Create a new destination (admin only)
 *     tags: [Global]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - country
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               country:
 *                 type: string
 *               image:
 *                 type: string
 *     responses:
 *       201:
 *         description: Destination created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Destination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticate, authorizeRoles('admin'), uploadNone, submitDestination);

/**
 * @swagger
 * /api/v1/global/destinations/{id}:
 *   patch:
 *     summary: Update destination (Admin only)
 *     description: Update a destination (admin only)
 *     tags: [Global]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Destination ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: Destination updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Destination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Destination not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authenticate, authorizeRoles('admin'), uploadNone, updateDestinationById);

/**
 * @swagger
 * /api/v1/global/destinations/{id}:
 *   delete:
 *     summary: Delete destination (Admin only)
 *     description: Delete a destination (admin only)
 *     tags: [Global]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Destination ID
 *     responses:
 *       200:
 *         description: Destination deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Destination not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteDestinationById);

// Legacy route for backward compatibility
/**
 * @swagger
 * /api/v1/global/destinations/approved:
 *   get:
 *     summary: Get approved destinations (legacy)
 *     description: Retrieve all approved global destinations
 *     tags: [Global]
 *     deprecated: true
 *     responses:
 *       200:
 *         description: Approved destinations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Destination'
 */
router.get('/approved', cacheRoute('destinations-approved', 120), getApprovedDestinations);

/**
 * @swagger
 * /api/v1/global/destinations/country/{country}:
 *   get:
 *     summary: Get destinations by country
 *     description: Retrieve destinations filtered by country
 *     tags: [Global]
 *     parameters:
 *       - in: path
 *         name: country
 *         required: true
 *         schema:
 *           type: string
 *         description: Country name
 *     responses:
 *       200:
 *         description: Destinations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Destination'
 */
router.get('/country/:country', cacheRoute('destinations-by-country', 120), getDestinationsByCountry);

// The single-destination public page called this exact path and always
// got a 404 — there was no route for it at all (only the equivalent
// category route existed, and even that was misplaced after the auth
// barrier below). Must stay public and ahead of `/:destinationId`-shaped
// authenticated routes further down, same as the routes above.
router.get('/public/:destinationId', cacheRoute('destination-by-id', 60), getDestinationById);

// Authenticated routes
router.use(authenticate);

// Seller routes
router.get('/seller/visible', getSellerDestinations);
router.get('/seller/search', searchDestinations);
router.get('/seller/enabled', getEnabledDestinations);
router.get('/seller/favorites', getFavoriteDestinations);
router.get('/user-destinations', getUserDestinations); // New route for user-specific destinations
router.get('/available', makeGetAvailable('destination'));
router.post('/bulk-add', makeBulkAdd('destination'));

/**
 * @swagger
 * /api/v1/global/destinations/submit:
 *   post:
 *     summary: Submit new destination (legacy)
 *     description: Submit a new destination for approval (admin/seller only)
 *     tags: [Global]
 *     deprecated: true
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - country
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               country:
 *                 type: string
 *               image:
 *                 type: string
 *     responses:
 *       201:
 *         description: Destination submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Destination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/submit', uploadNone, submitDestination);
router.patch('/:destinationId', uploadNone, updateDestination);
router.put('/preferences', updateDestinationPreferences);
router.put('/:destinationId/favorite', toggleFavoriteDestination);
router.patch('/:destinationId/toggle-active', toggleDestinationActiveStatus);
router.post('/:destinationId/add-to-list', authenticate, addExistingDestinationToSeller);
router.post('/:destinationId/remove-from-list', authenticate, removeExistingDestinationFromSeller);

// Admin routes
router.get('/admin/pending', getPendingDestinations);
router.get('/admin/all', authorizeRoles('admin'), getAllDestinationsAdmin);
router.get('/admin/change-requests', authorizeRoles('admin'), getChangeRequests);
router.put('/admin/change-requests/:changeRequestId/approve', authorizeRoles('admin'), changeRequestNotFound);
router.put('/admin/change-requests/:changeRequestId/reject', authorizeRoles('admin'), changeRequestNotFound);
router.put('/admin/:destinationId/approve', approveDestination);
router.put('/admin/:destinationId/reject', rejectDestination);
router.get('/admin/:destinationId/usage', getDestinationUsage);
router.delete('/admin/:destinationId', deleteDestination);
router.post('/admin/fix-deleted-approved', fixDeletedApprovedDestinations);

export default router;
