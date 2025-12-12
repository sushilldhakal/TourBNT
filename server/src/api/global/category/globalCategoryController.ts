import { Request, Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import GlobalCategory from './globalCategoryModel';
import SellerCategoryPreferences from '../seller/sellerCategoryPreferencesModel';
import User from '../../user/userModel';
import { AuthRequest } from '../../../middlewares/authenticate';

// Utility function to ensure user has sellerInfo
const ensureSellerInfo = async (user: any, userId: string) => {
  if (!user.sellerInfo && user.roles === 'seller') {
    console.log(`🔧 Initializing sellerInfo for user ${userId}`);
    user.sellerInfo = {
      destination: [],
      category: [],                    // ✅ NEW: User-specific category array
      companyName: '',
      companyRegistrationNumber: '',
      companyType: '',
      registrationDate: '',
      taxId: '',
      businessAddress: {
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      },
      bankDetails: {
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        branchCode: ''
      },
      businessDescription: '',
      sellerType: '',
      isApproved: false,
      appliedAt: new Date()
    };
    await user.save();
    console.log(`✅ SellerInfo initialized for user ${userId}`);
  }
  return user;
};

// Get category by ID (public)
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
      return;
    }

    const category = await GlobalCategory.findById(categoryId)
      .populate('createdBy', 'name email')
      .populate('metadata.parentCategory', 'name slug');

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
};

// Get all approved categories (public)
export const getApprovedCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await GlobalCategory.find({ 
      isApproved: true,
      approvalStatus: 'approved'
    })
    .populate('createdBy', 'name email')
    .populate('metadata.parentCategory', 'name slug')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching approved categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get categories by type (public)
export const getCategoriesByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { search } = req.query;
    
    let query: any = {
      isApproved: true,
      approvalStatus: 'approved'
    };

    if (type) {
      query.type = { $regex: new RegExp(type as string, 'i') };
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    const categories = await GlobalCategory.find(query)
      .sort({ popularity: -1, name: 1 })
      .select('name description slug imageUrl type popularity usageCount');
    
    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories by type',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get user-specific categories (from user.sellerInfo.category array)
// This includes user's personal active/inactive status for each category
export const getUserCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    let user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Initialize sellerInfo if user is a seller but doesn't have it
    if (!user.sellerInfo && user.roles === 'seller') {
      user = await ensureSellerInfo(user, userId.toString());
    }

    // If user is not a seller or still no sellerInfo, return empty
    if (!user || !user.sellerInfo) {
      res.json({
        success: true,
        data: [],
        count: 0
      });
      return;
    }

    // Initialize category array if it doesn't exist
    if (!user.sellerInfo.category) {
      user.sellerInfo.category = [];
      await user.save();
    }

    // Now populate the categories
    await user.populate({
      path: 'sellerInfo.category.categoryId',
      model: 'GlobalCategory',
      match: { 
        approvalStatus: { $in: ['pending', 'approved'] } // Include both pending and approved categories
      }
    });

    // Filter out categories where the global category was deleted/rejected
    const validCategories = user.sellerInfo.category
      .filter((cat: any) => cat.categoryId) // Global category still exists
      .map((userCat: any) => ({
        ...(userCat.categoryId.toObject ? userCat.categoryId.toObject() : userCat.categoryId),
        isActive: userCat.isActive,           // ✅ USER-SPECIFIC STATUS
        isApproved: userCat.isApproved,       // ✅ USER-SPECIFIC STATUS
        approvalStatus: userCat.approvalStatus // ✅ USER-SPECIFIC STATUS
      }));

    res.json({
      success: true,
      data: validCategories,
      count: validCategories.length
    });
  } catch (error) {
    console.error('Error fetching user categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get categories for seller (shows own categories + searchable approved categories)
export const getSellerCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?._id;
    const userRole = req.user?.role;

    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // If user is admin, return all categories (pending + approved)
    if (userRole === 'admin') {
      const allCategories = await GlobalCategory.find({})
        .sort({ submittedAt: -1 });

      res.json({
        success: true,
        data: allCategories,
        count: allCategories.length
      });
      return;
    }

    // For sellers, return only categories they created (any status)
    const sellerCategories = await GlobalCategory.find({
      createdBy: sellerId
    }).sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: sellerCategories,
      count: sellerCategories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching seller categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search categories for sellers (to discover existing categories before creating new ones)
export const searchCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?._id;
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const { query, parentCategory } = req.query;

    // Build search criteria
    const searchCriteria: any = {
      // Show approved categories + seller's own categories (any status)
      $or: [
        { isApproved: true, approvalStatus: 'approved' },
        { createdBy: sellerId }
      ]
    };

    // Add text search if query provided
    if (query && typeof query === 'string') {
      searchCriteria.$text = { $search: query };
    }

    // Add parent category filter
    if (parentCategory && typeof parentCategory === 'string') {
      searchCriteria['metadata.parentCategory'] = parentCategory;
    }

    const categories = await GlobalCategory.find(searchCriteria)
      .populate('createdBy', 'name email')
      .populate('metadata.parentCategory', 'name slug')
      .sort({ usageCount: -1, popularity: -1, submittedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get enabled categories for seller (for tour creation)
export const getEnabledCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?._id;
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const sellerPrefs = await SellerCategoryPreferences.findOne({ seller: sellerId })
      .populate({
        path: 'categoryPreferences.category',
        match: { isApproved: true, approvalStatus: 'approved' }
      });
    
    const enabledCategories = sellerPrefs ? 
      sellerPrefs.categoryPreferences
        .filter((pref: any) => pref.isEnabled && pref.category)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0)) : [];
    
    res.json({
      success: true,
      data: enabledCategories,
      count: enabledCategories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enabled categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Submit new category for approval
export const submitCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📝 submitCategory - req.body:', req.body);
    console.log('📝 submitCategory - req.body keys:', Object.keys(req.body));
    console.log('📝 submitCategory - name value:', `"${req.body.name}"`);
    console.log('📝 submitCategory - description value:', `"${req.body.description}"`);
    
    const { name, description, imageUrl, parentCategory, reason } = req.body;
    const createdBy = req.user?._id;

    if (!createdBy) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Validate required fields
    if (!name || !description) {
      console.log('❌ Validation failed - name:', !!name, 'description:', !!description);
      res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
      return;
    }

    // Check for duplicate names
    const existingCategory = await GlobalCategory.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCategory) {
      res.status(400).json({
        success: false,
        message: 'A category with this name already exists'
      });
      return;
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const category = new GlobalCategory({
      name,
      description,
      imageUrl,
      reason,
      slug,
      parentCategory,
      createdBy,
      submittedAt: new Date()
    });

    await category.save();

    // Also add the category to user's sellerInfo.category array
    const user = await User.findById(createdBy);
    if (user && user.sellerInfo) {
      if (!user.sellerInfo.category) {
        user.sellerInfo.category = [];
      }

      // Add the new category to user's list as pending
      user.sellerInfo.category.push({
        categoryId: (category._id as any).toString(),
        categoryName: category.name,
        isActive: false, // Inactive until approved
        isApproved: false,
        approvalStatus: 'pending',
        addedAt: new Date()
      });

      await user.save();
      console.log(`✅ Added category "${category.name}" to user ${createdBy} category list as pending`);
    }

    res.status(201).json({
      success: true,
      message: 'Category submitted for approval',
      data: category
    });
  } catch (error) {
    console.error('Error submitting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update category
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const sellerId = req.user?._id;
    const updateData = req.body;
    
    console.log("📝 Raw request data:");
    console.log("  - categoryId:", categoryId);
    console.log("  - sellerId:", sellerId);
    console.log("  - req.body:", updateData);
    console.log("  - req.body keys:", Object.keys(updateData));
    console.log("  - Content-Type:", req.headers['content-type']);
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
      return;
    }

    // Check if user is admin
    const isAdmin = req.user?.role === 'admin';
    console.log('🔍 Update category - User role:', req.user?.role, 'Is admin:', isAdmin);
    
    // Find the category - admin can edit any category, others can only edit their own
    const category = await GlobalCategory.findOne(
      isAdmin 
        ? { _id: categoryId } // Admin can edit any category
        : { _id: categoryId, createdBy: sellerId } // Regular users can only edit their own
    );

    if (!category) {
      res.status(404).json({
        success: false,
        message: isAdmin 
          ? 'Category not found' 
          : 'Category not found or you do not have permission to update it'
      });
      return;
    }

    console.log('✅ Category found for update:', category._id, 'by user:', req.user?.role);
    console.log('📝 Original category data:', {
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      isApproved: category.isApproved
    });
    console.log('📝 Update data received:', updateData);

    // Filter out fields that don't belong to global category model
    const { isActive, ...globalCategoryData } = updateData;
    
    console.log('📝 Filtered global category data:', globalCategoryData);
    if (isActive !== undefined) {
      console.log('⚠️ isActive field ignored (user-specific, not global):', isActive);
    }

    // Update category with new data
    const updateObject = {
      ...globalCategoryData,
      lastModified: new Date(),
    };

    console.log('📝 Update object to apply:', updateObject);

    // Only reset approval status if a regular user is editing (not admin)
    if (!isAdmin) {
      updateObject.approvalStatus = 'pending';
      updateObject.isApproved = false;
      console.log('🔄 Regular user edit - resetting approval status to pending');
    } else {
      console.log('👑 Admin edit - preserving approval status');
    }

    console.log('📝 Final update object:', updateObject);

    Object.assign(category, updateObject);

    console.log('📝 Category after Object.assign:', {
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      isApproved: category.isApproved
    });

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Get pending categories
export const getPendingCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const pendingCategories = await GlobalCategory.find({ 
      approvalStatus: 'pending' 
    })
      .populate('createdBy', 'name email')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: pendingCategories,
      count: pendingCategories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Approve category
export const approveCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { categoryId } = req.params;
    const approvedBy = req.user._id;

    const category = await GlobalCategory.findById(categoryId);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    category.isApproved = true;
    category.approvalStatus = 'approved';
    category.approvedBy = approvedBy as any;
    category.approvedAt = new Date();
    category.rejectedBy = undefined;
    category.rejectedAt = undefined;
    category.rejectionReason = undefined;
    await category.save();

    // Also update the creator's user category array
    const creator = await User.findById(category.createdBy);
    if (creator && creator.sellerInfo && creator.sellerInfo.category) {
      const userCategory = creator.sellerInfo.category.find(
        cat => cat.categoryId.toString() === categoryId.toString()
      );
      
      if (userCategory) {
        userCategory.isApproved = true;
        userCategory.approvalStatus = 'approved';
        userCategory.isActive = true; // Activate for the creator
        await creator.save();
        console.log(`✅ Updated category "${category.name}" in creator ${category.createdBy} category list to approved`);
      }
    }

    res.json({
      success: true,
      message: 'Category approved successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Reject category
export const rejectCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { categoryId } = req.params;
    const { reason } = req.body;
    const rejectedBy = req.user._id;

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
      return;
    }

    const category = await GlobalCategory.findById(categoryId);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    category.isApproved = false;
    category.approvalStatus = 'rejected';
    category.rejectedBy = rejectedBy as any;
    category.rejectedAt = new Date();
    category.rejectionReason = reason;
    category.approvedBy = undefined;
    category.approvedAt = undefined;
    await category.save();

    // Also update the creator's user category array
    const creator = await User.findById(category.createdBy);
    if (creator && creator.sellerInfo && creator.sellerInfo.category) {
      const userCategory = creator.sellerInfo.category.find(
        cat => cat.categoryId.toString() === categoryId.toString()
      );
      
      if (userCategory) {
        userCategory.isApproved = false;
        userCategory.approvalStatus = 'rejected';
        userCategory.isActive = false; // Deactivate for the creator
        await creator.save();
        console.log(`✅ Updated category "${category.name}" in creator ${category.createdBy} category list to rejected`);
      }
    }

    res.json({
      success: true,
      message: 'Category rejected successfully',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Delete category
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const { categoryId } = req.params;

    const category = await GlobalCategory.findById(categoryId);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    await GlobalCategory.findByIdAndDelete(categoryId);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update seller category preferences
export const updateCategoryPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?._id;
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const { preferences, globalSettings } = req.body;

    let sellerPrefs = await SellerCategoryPreferences.findOne({ seller: sellerId });
    
    if (!sellerPrefs) {
      sellerPrefs = new SellerCategoryPreferences({
        seller: sellerId,
        categoryPreferences: [],
        globalSettings: globalSettings || {}
      });
    }

    if (preferences && Array.isArray(preferences)) {
      preferences.forEach((update: any) => {
        const preference = sellerPrefs.categoryPreferences.find(
          (pref: any) => pref.category.toString() === update.categoryId.toString()
        );
        
        if (preference) {
          if (update.isVisible !== undefined) preference.isVisible = update.isVisible;
          if (update.isEnabled !== undefined) preference.isEnabled = update.isEnabled;
          if (update.customName !== undefined) preference.customName = update.customName;
          if (update.sortOrder !== undefined) preference.sortOrder = update.sortOrder;
        } else {
          sellerPrefs.categoryPreferences.push({
            category: update.categoryId,
            isVisible: update.isVisible ?? true,
            isEnabled: update.isEnabled ?? true,
            customName: update.customName,
            sortOrder: update.sortOrder ?? 0
          });
        }
      });
      
      sellerPrefs.lastUpdated = new Date();
      await sellerPrefs.save();
    }

    if (globalSettings) {
      sellerPrefs.globalSettings = { ...sellerPrefs.globalSettings, ...globalSettings };
      await sellerPrefs.save();
    }

    res.json({
      success: true,
      message: 'Category preferences updated successfully',
      data: sellerPrefs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating category preferences',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get favorite categories
export const getFavoriteCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?._id;
    
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const sellerPrefs = await SellerCategoryPreferences.findOne({ seller: sellerId })
      .populate({
        path: 'categoryPreferences.category',
        match: { isApproved: true },
        select: 'name description slug imageUrl type popularity usageCount'
      });

    if (!sellerPrefs) {
      res.json({
        success: true,
        data: [],
        count: 0
      });
      return;
    }

    const favoriteCategories = sellerPrefs.categoryPreferences
      .filter((pref: any) => pref.isFavorite && pref.category)
      .map((pref: any) => pref.category);

    res.json({
      success: true,
      data: favoriteCategories,
      count: favoriteCategories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching favorite categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Toggle favorite category
export const toggleFavoriteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?._id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { categoryId } = req.params;

    let sellerPrefs = await SellerCategoryPreferences.findOne({ seller: sellerId });
    
    if (!sellerPrefs) {
      sellerPrefs = new SellerCategoryPreferences({
        seller: sellerId,
        categoryPreferences: [],
        globalSettings: {}
      });
    }

    const preference = sellerPrefs.categoryPreferences.find(
      (pref: any) => pref.category.toString() === categoryId.toString()
    );
    
    if (preference) {
      preference.isFavorite = !preference.isFavorite;
    } else {
      sellerPrefs.categoryPreferences.push({
        category: categoryId as any,
        isVisible: true,
        isEnabled: true,
        isFavorite: true
      });
    }
    
    sellerPrefs.lastUpdated = new Date();
    await sellerPrefs.save();

    res.json({
      success: true,
      message: 'Category favorite status updated',
      data: sellerPrefs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating favorite status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add existing category to seller's list
export const addExistingCategoryToSeller = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const sellerId = req.user?._id;
    
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
      return;
    }
    
    // Check if category exists and is approved
    const category = await GlobalCategory.findOne({
      _id: categoryId,
      isApproved: true,
      approvalStatus: 'approved'
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found or not approved'
      });
      return;
    }

    // Get or create seller preferences
    let sellerPrefs = await SellerCategoryPreferences.findOne({ seller: sellerId });
    
    if (!sellerPrefs) {
      sellerPrefs = new SellerCategoryPreferences({
        seller: sellerId,
        categoryPreferences: [],
        globalSettings: {}
      });
    }

    // Check if category is already in seller's list
    const existingPref = sellerPrefs.categoryPreferences.find(
      (pref: any) => pref.category.toString() === categoryId.toString()
    );

    if (existingPref) {
      // Update existing preference
      existingPref.isVisible = true;
      existingPref.isEnabled = true;
    } else {
      // Add new preference
      sellerPrefs.categoryPreferences.push({
        category: categoryId as any,
        isVisible: true,
        isEnabled: true,
        isFavorite: false
      });
    }

    // Increment usage count
    category.usageCount = (category.usageCount || 0) + 1;
    await category.save();

    sellerPrefs.lastUpdated = new Date();
    await sellerPrefs.save();

    // Also add to user's sellerInfo.category array
    let user = await User.findById(sellerId);
    if (user) {
      // Ensure user has sellerInfo
      user = await ensureSellerInfo(user, sellerId.toString());
      
      if (user && user.sellerInfo) {
        if (!user.sellerInfo.category) {
          user.sellerInfo.category = [];
        }

        // Check if category already exists in user's list
        const existingUserCategory = user.sellerInfo.category.find(
          cat => cat.categoryId.toString() === categoryId.toString()
        );

        if (!existingUserCategory) {
          // Add new category to user's list as active and approved
          user.sellerInfo.category.push({
            categoryId: categoryId,
            categoryName: category.name,
            isActive: true,
            isApproved: true,
            approvalStatus: 'approved',
            addedAt: new Date()
          });

          await user.save();
          console.log(`✅ Added category "${category.name}" to user ${sellerId} category list`);
        } else {
          // Update existing category to be active
          existingUserCategory.isActive = true;
          existingUserCategory.isApproved = true;
          existingUserCategory.approvalStatus = 'approved';
          
          await user.save();
          console.log(`✅ Updated category "${category.name}" in user ${sellerId} category list to active`);
        }
      }
    }

    res.json({
      success: true,
      message: 'Category added to your list successfully',
      data: {
        category,
        preferences: sellerPrefs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding category to seller list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Toggle category active status (user-specific, not global)
// This endpoint toggles the user's personal isActive status for a category
export const toggleCategoryActiveStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = req.params;
    const sellerId = req.user?._id;

    console.log(`🔄 Toggle request for category ${categoryId} by seller ${sellerId}`);

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Find the user and their category preferences
    let user = await User.findById(sellerId);
    console.log("🔍 User lookup result:", {
      userId: sellerId,
      userFound: !!user,
      hasSellerInfo: !!(user?.sellerInfo),
      userRole: user?.roles
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.sellerInfo) {
      // If user has seller role but no sellerInfo, initialize it
      if (user.roles === 'seller') {
        console.log(`🔧 Initializing sellerInfo for user ${sellerId}`);
        user = await ensureSellerInfo(user, sellerId.toString());
      } else {
        return res.status(404).json({
          success: false,
          message: 'User is not a seller'
        });
      }
    }

    // Check if the global category exists (allow both approved and pending for creators)
    const globalCategory = await GlobalCategory.findOne({
      _id: categoryId
    });

    console.log("🔍 Global category lookup:", {
      categoryId,
      found: !!globalCategory,
      approvalStatus: globalCategory?.approvalStatus,
      createdBy: globalCategory?.createdBy?.toString(),
      isCreator: globalCategory?.createdBy?.toString() === sellerId.toString()
    });

    if (!globalCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category is approved OR if user is the creator
    const isCreator = globalCategory.createdBy?.toString() === sellerId.toString();
    const isApproved = globalCategory.approvalStatus === 'approved';

    if (!isApproved && !isCreator) {
      return res.status(404).json({
        success: false,
        message: 'Category not approved and you are not the creator'
      });
    }

    // Find the category in user's category array
    const userCategoryIndex = user?.sellerInfo?.category?.findIndex(
      cat => cat.categoryId.toString() === categoryId
    );

    if (userCategoryIndex === -1 || userCategoryIndex === undefined) {
      // If category not in user's list, add it
      if (user && user.sellerInfo) {
        if (!user.sellerInfo.category) {
          user.sellerInfo.category = [];
        }
        
        // Set status based on global category status
        const userCategoryStatus = {
          categoryId: categoryId,
          categoryName: globalCategory.name,
          isActive: isApproved ? true : false, // Only activate if globally approved
          isApproved: isApproved,
          approvalStatus: globalCategory.approvalStatus,
          addedAt: new Date()
        };

        user.sellerInfo.category.push(userCategoryStatus);
        await user.save();

        console.log(`✅ Added category "${globalCategory.name}" to seller ${sellerId} with status: ${globalCategory.approvalStatus}`);

        return res.json({
          success: true,
          message: `Category added successfully (${globalCategory.approvalStatus})`,
          data: {
            id: categoryId,
            name: globalCategory.name,
            isActive: userCategoryStatus.isActive,
            approvalStatus: userCategoryStatus.approvalStatus
          }
        });
      }
    }

    // Toggle the user's specific isActive status
    if (!user || !user.sellerInfo || !user.sellerInfo.category || userCategoryIndex === undefined || userCategoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Category not found in user preferences'
      });
    }

    const userCategory = user.sellerInfo.category[userCategoryIndex];
    const previousStatus = userCategory.isActive;

    // Don't allow activating pending categories (unless user is creator)
    if (!userCategory.isActive && userCategory.approvalStatus === 'pending' && !isCreator) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate pending category. Wait for admin approval.'
      });
    }

    // Don't allow activating rejected categories
    if (!userCategory.isActive && userCategory.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate rejected category.'
      });
    }

    userCategory.isActive = !userCategory.isActive;
    await user.save();

    console.log(`✅ Seller ${sellerId} toggled category "${globalCategory.name}" from isActive: ${previousStatus} to isActive: ${userCategory.isActive} (user-specific)`);
    console.log(`📋 Global category status remains unchanged`);

    res.json({
      success: true,
      message: `Category ${userCategory.isActive ? 'activated' : 'deactivated'} successfully for your account`,
      data: {
        id: categoryId,
        name: globalCategory.name,
        isActive: userCategory.isActive,
        approvalStatus: userCategory.approvalStatus,
        globalApprovalStatus: globalCategory.approvalStatus
      }
    });
  } catch (error) {
    console.error('❌ Error in toggleCategoryActiveStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling category status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Remove existing category from seller's list (user-specific)
export const removeExistingCategoryFromSeller = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const sellerId = req.user?._id;
    
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
      return;
    }

    // Get user and ensure sellerInfo exists
    const user = await User.findById(sellerId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Ensure sellerInfo exists
    const updatedUser = await ensureSellerInfo(user, sellerId.toString());

    // Check if category exists in user's list
    if (!updatedUser.sellerInfo || !updatedUser.sellerInfo.category) {
      res.status(404).json({
        success: false,
        message: 'No categories found in your list'
      });
      return;
    }

    const categoryIndex = updatedUser.sellerInfo.category.findIndex(
      (cat: any) => cat.categoryId.toString() === categoryId.toString()
    );

    if (categoryIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Category not found in your list'
      });
      return;
    }

    // Get category name for logging
    const categoryName = updatedUser.sellerInfo.category[categoryIndex].categoryName;

    // Remove the category from user's list
    updatedUser.sellerInfo.category.splice(categoryIndex, 1);
    await updatedUser.save();

    // Decrement usage count on global category
    const globalCategory = await GlobalCategory.findById(categoryId);
    if (globalCategory && globalCategory.usageCount > 0) {
      globalCategory.usageCount = globalCategory.usageCount - 1;
      await globalCategory.save();
    }

    console.log(`✅ Removed category "${categoryName}" from user ${sellerId} category list`);

    res.json({
      success: true,
      message: 'Category removed from your list successfully',
      data: {
        categoryId,
        categoryName,
        removedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error removing category from seller list:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing category from seller list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
