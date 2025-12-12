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
import { authenticate, isAdmin, isAdminOrSeller } from '../../../middlewares/authenticate';
import { uploadNone } from '../../../middlewares/multer';

const router = express.Router();

// Public routes
router.get('/approved', getApprovedCategories);
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
router.get('/:categoryId', getCategoryById);
router.post('/submit', uploadNone, isAdminOrSeller as any, submitCategory as any);
router.put('/:categoryId', uploadNone, isAdminOrSeller as any, updateCategory as any);
router.patch('/:categoryId', uploadNone, isAdminOrSeller as any, updateCategory as any);
router.put('/preferences', isAdminOrSeller as any, updateCategoryPreferences as any);
router.put('/:categoryId/favorite', toggleFavoriteCategory as any);
router.patch('/:categoryId/toggle-active', toggleCategoryActiveStatus as any);
router.post('/:categoryId/add-to-list', authenticate, addExistingCategoryToSeller as any);
router.post('/:categoryId/remove-from-list', authenticate, removeExistingCategoryFromSeller as any);

// Admin routes
router.get('/admin/pending', getPendingCategories as any);
router.put('/admin/:categoryId/approve', approveCategory as any);
router.put('/admin/:categoryId/reject', rejectCategory as any);
router.delete('/admin/:categoryId', isAdmin as any, deleteCategory as any);

export default router;
