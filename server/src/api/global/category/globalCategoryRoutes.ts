import express from 'express';
import {
  getCategoryById,
  getApprovedCategories,
  getCategoriesByType,
  searchCategories,
  getSellerCategories,
  getUserCategories,
  submitCategory,
  updateCategory,
  updateCategoryPreferences,
  deleteCategory,
  getEnabledCategories,
  getFavoriteCategories,
  getPendingCategories,
  approveCategory,
  rejectCategory,
  toggleFavoriteCategory,
  toggleCategoryActiveStatus,
  addExistingCategoryToSeller,
  removeExistingCategoryFromSeller
} from './globalCategoryController';
import { authenticate, authorizeRoles } from '../../../middlewares/authenticate';
import { uploadNone } from '../../../middlewares/multer';
import { paginationMiddleware } from '../../../middlewares/pagination';

const router = express.Router();

// Wrapper functions to handle :id parameter for RESTful routes
const updateCategoryById = (req: any, res: any) => {
  req.params.categoryId = req.params.id;
  return updateCategory(req, res);
};

const deleteCategoryById = (req: any, res: any) => {
  req.params.categoryId = req.params.id;
  return deleteCategory(req, res);
};

// RESTful routes - PUBLIC
/**
 * @swagger
 * /api/global/categories:
 *   get:
 *     summary: Get all categories
 *     description: Retrieve all approved global categories with pagination
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
 *         description: Categories retrieved successfully
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
 *                     $ref: '#/components/schemas/Category'
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
router.get('/', paginationMiddleware, getApprovedCategories);

// RESTful routes - ADMIN ONLY
/**
 * @swagger
 * /api/global/categories:
 *   post:
 *     summary: Create new category (Admin only)
 *     description: Create a new category (admin only)
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
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
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
router.post('/', authenticate, authorizeRoles('admin'), uploadNone, submitCategory as any);

/**
 * @swagger
 * /api/global/categories/{id}:
 *   patch:
 *     summary: Update category (Admin only)
 *     description: Update a category (admin only)
 *     tags: [Global]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
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
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
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
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', authenticate, authorizeRoles('admin'), uploadNone, updateCategoryById as any);

/**
 * @swagger
 * /api/global/categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     description: Delete a category (admin only)
 *     tags: [Global]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
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
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCategoryById as any);

// Legacy route for backward compatibility
/**
 * @swagger
 * /api/global/categories/approved:
 *   get:
 *     summary: Get approved categories (legacy)
 *     description: Retrieve all approved global categories
 *     tags: [Global]
 *     deprecated: true
 *     responses:
 *       200:
 *         description: Approved categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/approved', getApprovedCategories);

/**
 * @swagger
 * /api/global/categories/type/{type}:
 *   get:
 *     summary: Get categories by type
 *     description: Retrieve categories filtered by type
 *     tags: [Global]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Category type
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/type/:type', getCategoriesByType);

// Authenticated routes
router.use(authenticate);

// Seller routes (specific routes must come before parameterized routes)
router.get('/user-categories', getUserCategories as any); // New route for user-specific categories
router.get('/seller/visible', getSellerCategories as any);
router.get('/seller/search', searchCategories as any);
router.get('/seller/enabled', getEnabledCategories as any);
router.get('/seller/favorites', getFavoriteCategories as any);

// Parameterized routes (must come after specific routes)
/**
 * @swagger
 * /api/global/categories/{categoryId}:
 *   get:
 *     summary: Get category by ID
 *     description: Retrieve a specific category by its ID
 *     tags: [Global]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:categoryId', getCategoryById);

/**
 * @swagger
 * /api/global/categories/submit:
 *   post:
 *     summary: Submit new category (legacy)
 *     description: Submit a new category for approval (admin/seller only)
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/submit', uploadNone, authorizeRoles('admin', 'seller'), submitCategory as any);
router.put('/:categoryId', uploadNone, authorizeRoles('admin', 'seller'), updateCategory as any);
router.patch('/:categoryId', uploadNone, authorizeRoles('admin', 'seller'), updateCategory as any);
router.put('/preferences', authorizeRoles('admin', 'seller'), updateCategoryPreferences as any);
router.put('/:categoryId/favorite', toggleFavoriteCategory as any);
router.patch('/:categoryId/toggle-active', toggleCategoryActiveStatus as any);
router.post('/:categoryId/add-to-list', authenticate, addExistingCategoryToSeller as any);
router.post('/:categoryId/remove-from-list', authenticate, removeExistingCategoryFromSeller as any);

// Admin routes
router.get('/admin/pending', getPendingCategories as any);
router.put('/admin/:categoryId/approve', approveCategory as any);
router.put('/admin/:categoryId/reject', rejectCategory as any);
router.delete('/admin/:categoryId', authorizeRoles('admin'), deleteCategory as any);

export default router;
