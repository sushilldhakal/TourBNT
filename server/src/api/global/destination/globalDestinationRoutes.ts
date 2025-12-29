import express from 'express';
import {
  getApprovedDestinations,
  getDestinationsByCountry,
  searchDestinations,
  getSellerDestinations,
  submitDestination,
  updateDestination,
  updateDestinationPreferences,
  deleteDestination,
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
  fixDeletedApprovedDestinations
} from './globalDestinationController';
import { authenticate, authorizeRoles } from '../../../middlewares/authenticate';
import { uploadNone } from '../../../middlewares/multer';
import { paginationMiddleware } from '../../../middlewares/pagination';

const router = express.Router();

// Wrapper functions to handle :id parameter for RESTful routes
const updateDestinationById = (req: any, res: any) => {
  req.params.destinationId = req.params.id;
  return updateDestination(req, res);
};

const deleteDestinationById = (req: any, res: any) => {
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
router.get('/', paginationMiddleware, getApprovedDestinations);

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
router.post('/', authenticate, authorizeRoles('admin'), uploadNone, submitDestination as any);

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
router.patch('/:id', authenticate, authorizeRoles('admin'), uploadNone, updateDestinationById as any);

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
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteDestinationById as any);

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
router.get('/approved', getApprovedDestinations);

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
router.get('/country/:country', getDestinationsByCountry);

// Authenticated routes
router.use(authenticate);

// Seller routes
router.get('/seller/visible', getSellerDestinations as any);
router.get('/seller/search', searchDestinations as any);
router.get('/seller/enabled', getEnabledDestinations as any);
router.get('/seller/favorites', getFavoriteDestinations as any);
router.get('/user-destinations', getUserDestinations as any); // New route for user-specific destinations

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
router.post('/submit', uploadNone, submitDestination as any);
router.patch('/:destinationId', uploadNone, updateDestination as any);
router.put('/preferences', updateDestinationPreferences as any);
router.put('/:destinationId/favorite', toggleFavoriteDestination as any);
router.patch('/:destinationId/toggle-active', toggleDestinationActiveStatus as any);
router.post('/:destinationId/add-to-list', authenticate, addExistingDestinationToSeller as any);
router.post('/:destinationId/remove-from-list', authenticate, removeExistingDestinationFromSeller as any);

// Admin routes
router.get('/admin/pending', getPendingDestinations as any);
router.put('/admin/:destinationId/approve', approveDestination as any);
router.put('/admin/:destinationId/reject', rejectDestination as any);
router.delete('/admin/:destinationId', deleteDestination as any);
router.post('/admin/fix-deleted-approved', fixDeletedApprovedDestinations as any);

export default router;
