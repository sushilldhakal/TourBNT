import { Request, Response } from 'express';
import mongoose from 'mongoose';
import GlobalDestination from './globalDestinationModel';
import SellerDestinationPreferences from '../seller/sellerDestinationPreferencesModel';
import Notification from '../../notifications/notificationModel';
import User from '../../user/userModel';
import { AuthRequest } from '../../../middlewares/authenticate';

// Utility function to ensure user has sellerInfo
const ensureSellerInfo = async (user: any, userId: string) => {
  if (!user.sellerInfo && user.roles === 'seller') {
    console.log(`🔧 Initializing sellerInfo for user ${userId}`);
    user.sellerInfo = {
      destination: [],
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

// Get all approved destinations (public)
export const getApprovedDestinations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { country, region, search } = req.query;

    let query: any = {
      isActive: true,
      isApproved: true,
      approvalStatus: 'approved'
    };

    if (country) {
      query.country = { $regex: new RegExp(country as string, 'i') };
    }

    if (region) {
      query.region = { $regex: new RegExp(region as string, 'i') };
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    const destinations = await GlobalDestination.find(query)
      .sort({ popularity: -1, name: 1 })
      .select('name description coverImage country region city coordinates popularity usageCount fullLocation');

    res.json({
      success: true,
      data: destinations,
      count: destinations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching approved destinations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get destinations by country
export const getDestinationsByCountry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { country } = req.params;

    const destinations = await GlobalDestination.find({
      country: { $regex: new RegExp(country, 'i') },
      isActive: true,
      isApproved: true,
      approvalStatus: 'approved'
    });

    res.json({
      success: true,
      data: destinations,
      count: destinations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching destinations by country',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get destinations for seller (shows own destinations + enabled destinations from preferences)
export const getSellerDestinations = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    const isAdmin = req.user?.roles.includes('admin') || false;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // If user is admin, return ALL destinations (no filtering by isActive)
    if (isAdmin) {
      const allDestinations = await GlobalDestination.find({})
        .sort({ submittedAt: -1 });

      console.log('🔍 Admin destinations query result count:', allDestinations.length);
      console.log('🔍 Admin destinations status breakdown:', allDestinations.map(d => ({
        id: d._id,
        name: d.name,
        isActive: d.isActive,
        status: d.approvalStatus
      })));

      return res.json({
        success: true,
        data: allDestinations,
        count: allDestinations.length
      });
    }

    // Get seller preferences first to check for hidden destinations
    const sellerPrefs = await SellerDestinationPreferences.findOne({ seller: sellerId })
      .populate({
        path: 'destinationPreferences.destination',
        match: { isApproved: true, approvalStatus: 'approved', deletedAt: { $exists: false } }
      });

    // Get IDs of destinations that seller has explicitly hidden
    const hiddenDestinationIds = new Set(
      sellerPrefs ?
        sellerPrefs.destinationPreferences
          .filter((pref: any) => (!pref.isVisible || !pref.isEnabled) && pref.destination)
          .map((pref: any) => {
            const destId = typeof pref.destination === 'object' ? pref.destination._id.toString() : pref.destination.toString();
            console.log('🔍 Hidden destination ID:', destId, 'isVisible:', pref.isVisible, 'isEnabled:', pref.isEnabled);
            return destId;
          }) : []
    );

    console.log('🔍 All hidden destination IDs:', Array.from(hiddenDestinationIds));
    console.log('🔍 Seller preferences count:', sellerPrefs?.destinationPreferences?.length || 0);

    // For sellers, return destinations they created (any status: pending, approved) but exclude rejected and admin-deleted ones
    // NOTE: isActive controls public visibility, not seller dashboard visibility
    const sellerCreatedDestinations = await GlobalDestination.find({
      createdBy: sellerId,
      approvalStatus: { $ne: 'rejected' }, // Exclude rejected destinations
      deletedAt: { $exists: false } // Only exclude admin-deleted destinations
    }).sort({ submittedAt: -1 });

    // Filter out hidden destinations from seller-created ones
    console.log('🔍 Seller created destinations before filtering:', sellerCreatedDestinations.map((d: any) => ({ id: d._id.toString(), name: d.name })));

    const visibleSellerCreatedDestinations = sellerCreatedDestinations.filter(
      (dest: any) => {
        const isHidden = hiddenDestinationIds.has(dest._id.toString());
        console.log('🔍 Checking destination:', dest.name, dest._id.toString(), 'isHidden:', isHidden);
        return !isHidden;
      }
    );

    console.log('🔍 Visible seller created destinations after filtering:', visibleSellerCreatedDestinations.map((d: any) => ({ id: d._id.toString(), name: d.name })));

    // Get seller's enabled destinations from preferences
    const enabledDestinations = sellerPrefs ?
      sellerPrefs.destinationPreferences
        .filter((pref: any) => pref.isEnabled && pref.isVisible && pref.destination)
        .map((pref: any) => pref.destination)
        .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0)) : [];

    // Combine both arrays, removing duplicates based on _id
    const combinedDestinations = [...visibleSellerCreatedDestinations];
    const existingIds = new Set(visibleSellerCreatedDestinations.map((dest: any) => dest._id.toString()));

    enabledDestinations.forEach((dest: any) => {
      if (!existingIds.has(dest._id.toString())) {
        combinedDestinations.push(dest);
      }
    });

    // Sort combined results by submittedAt (newest first)
    combinedDestinations.sort((a: any, b: any) =>
      new Date(b.submittedAt || b.createdAt).getTime() -
      new Date(a.submittedAt || a.createdAt).getTime()
    );

    res.json({
      success: true,
      data: combinedDestinations,
      count: combinedDestinations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching seller destinations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search destinations for sellers (to discover existing destinations before creating new ones)
export const searchDestinations = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { query, country, region, city } = req.query;

    // Build search criteria
    const searchCriteria: any = {
      isActive: true,
      // Show approved destinations + seller's own destinations (any status)
      $or: [
        { isApproved: true, approvalStatus: 'approved' },
        { createdBy: sellerId }
      ]
    };

    // Add text search if query provided
    if (query && typeof query === 'string') {
      searchCriteria.$text = { $search: query };
    }

    // Add location filters
    if (country && typeof country === 'string') {
      searchCriteria.country = { $regex: new RegExp(country, 'i') };
    }
    if (region && typeof region === 'string') {
      searchCriteria.region = { $regex: new RegExp(region, 'i') };
    }
    if (city && typeof city === 'string') {
      searchCriteria.city = { $regex: new RegExp(city, 'i') };
    }

    const destinations = await GlobalDestination.find(searchCriteria)
      .populate('createdBy', 'name email')
      .sort({ usageCount: -1, popularity: -1, submittedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: destinations,
      count: destinations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching destinations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get enabled destinations for seller (for tour creation)
export const getEnabledDestinations = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const sellerPrefs = await SellerDestinationPreferences.findOne({ seller: sellerId })
      .populate({
        path: 'destinationPreferences.destination',
        match: { isActive: true, isApproved: true, approvalStatus: 'approved' }
      });

    const enabledDestinations = sellerPrefs ?
      sellerPrefs.destinationPreferences
        .filter((pref: any) => pref.isEnabled && pref.destination)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0)) : [];

    res.json({
      success: true,
      data: enabledDestinations,
      count: enabledDestinations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enabled destinations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get seller's favorite destinations
export const getFavoriteDestinations = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const sellerPrefs = await SellerDestinationPreferences.findOne({ seller: sellerId })
      .populate({
        path: 'destinationPreferences.destination',
        match: { isActive: true, isApproved: true, approvalStatus: 'approved' }
      });

    const favoriteDestinations = sellerPrefs ?
      sellerPrefs.destinationPreferences
        .filter((pref: any) => pref.isFavorite && pref.destination)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0)) : [];

    res.json({
      success: true,
      data: favoriteDestinations,
      count: favoriteDestinations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching favorite destinations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Submit new destination for approval
export const submitDestination = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      reason,
      coverImage,
      country,
      region,
      city,
      coordinates,
      isActive,
      popularity,
      featuredTours,
      metadata
    } = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate required fields
    if (!name || !description || !country) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: `Required fields missing: ${!name ? 'name, ' : ''}${!description ? 'description, ' : ''}${!country ? 'country' : ''}`
      });
    }

    // Check for duplicate destinations (exclude soft-deleted destinations)
    const existingDestination = await GlobalDestination.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      country: { $regex: new RegExp(`^${country}$`, 'i') },
      isActive: true, // Only check active destinations for duplicates
      $or: [
        { city: { $regex: new RegExp(`^${city || ''}$`, 'i') } },
        { city: { $exists: false } }
      ]
    });
    console.log("🏗️ GlobalDestination Model Name:", GlobalDestination.modelName)
    console.log("🏗️ GlobalDestination Collection:", GlobalDestination.collection.name)
    console.log("🏗️ GlobalDestination Schema Fields:", Object.keys(GlobalDestination.schema.paths))

    // Log existing destinations count
    const totalDestinations = await GlobalDestination.countDocuments();
    console.log("📊 Total destinations in database:", totalDestinations)

    // Log some sample destinations
    const sampleDestinations = await GlobalDestination.find().limit(3).select('name country city approvalStatus isActive');
    console.log("📍 Sample destinations:", JSON.stringify(sampleDestinations, null, 2))

    console.log('🔍 Duplicate check for:', { name, country, city });
    console.log('🔍 Found existing destination:', existingDestination ? 'YES' : 'NO');

    if (existingDestination) {
      return res.status(400).json({
        success: false,
        message: 'A destination with this name and location already exists'
      });
    }

    const destination = new GlobalDestination({
      name,
      description,
      reason,
      coverImage,
      country,
      region,
      city,
      coordinates,
      isActive: false, // Pending destinations should not be active by default
      isApproved: false,
      approvalStatus: 'pending',
      popularity: popularity !== undefined ? popularity : 0,
      featuredTours: featuredTours || [],
      metadata,
      createdBy,
      submittedAt: new Date()
    });

    await destination.save();

    // Also add the destination to user's sellerInfo.destination array
    const user = await User.findById(createdBy);
    if (user && user.sellerInfo) {
      if (!user.sellerInfo.destination) {
        user.sellerInfo.destination = [];
      }

      // Add the new destination to user's list as pending
      user.sellerInfo.destination.push({
        destinationId: (destination._id as any).toString(),
        destinationName: destination.name,
        isActive: false, // Inactive until approved
        isApproved: false,
        approvalStatus: 'pending',
        addedAt: new Date()
      });

      await user.save();
      console.log(`✅ Added destination "${destination.name}" to user ${createdBy} destination list as pending`);
    }

    res.status(201).json({
      success: true,
      message: 'Destination submitted for approval',
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting destination',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Get pending destinations
export const getPendingDestinations = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user?.roles?.includes('admin')) {
      return res.json({
        success: false,
        message: 'Admin access required'
      });
    }

    const pendingDestinations = await GlobalDestination.find({
      approvalStatus: 'pending'
    })
      .populate('createdBy', 'name email')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: pendingDestinations,
      count: pendingDestinations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending destinations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Approve destination
export const approveDestination = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { destinationId } = req.params;
    const approvedBy = req.user.id;

    const destination = await GlobalDestination.findById(destinationId);
    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    destination.isApproved = true;
    destination.approvalStatus = 'approved';
    destination.approvedBy = approvedBy as any;
    destination.approvedAt = new Date();
    destination.rejectedBy = undefined;
    destination.rejectedAt = undefined;
    destination.rejectionReason = undefined;
    destination.deletedAt = undefined; // Clear admin deletion when approving
    destination.deletedBy = undefined;
    destination.isActive = true; // Make approved destinations active
    await destination.save();

    // Also update the creator's user destination array
    const creator = await User.findById(destination.createdBy);
    if (creator && creator.sellerInfo && creator.sellerInfo.destination) {
      const userDestination = creator.sellerInfo.destination.find(
        dest => dest.destinationId.toString() === destinationId.toString()
      );

      if (userDestination) {
        userDestination.isApproved = true;
        userDestination.approvalStatus = 'approved';
        userDestination.isActive = true; // Activate for the creator
        await creator.save();
        console.log(`✅ Updated destination "${destination.name}" in creator ${destination.createdBy} destination list to approved`);
      }
    }

    // Create approval notification
    try {
      await (Notification as any).createDestinationApprovalNotification(
        destination.createdBy,
        approvedBy,
        destination.name,
        destination._id
      );
    } catch (notificationError) {
      console.error('Error creating approval notification:', notificationError);
      // Don't fail the approval if notification fails
    }

    res.json({
      success: true,
      message: 'Destination approved successfully',
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving destination',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Reject destination
export const rejectDestination = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { destinationId } = req.params;
    const { reason } = req.body;
    const rejectedBy = req.user.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const destination = await GlobalDestination.findById(destinationId);
    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    destination.isApproved = false;
    destination.approvalStatus = 'rejected';
    destination.rejectedBy = rejectedBy as any;
    destination.rejectedAt = new Date();
    destination.rejectionReason = reason;
    destination.approvedBy = undefined;
    destination.approvedAt = undefined;
    destination.isActive = false; // Hide rejected destinations from seller view
    await destination.save();

    // Also update the creator's user destination array
    const creator = await User.findById(destination.createdBy);
    if (creator && creator.sellerInfo && creator.sellerInfo.destination) {
      const userDestination = creator.sellerInfo.destination.find(
        dest => dest.destinationId.toString() === destinationId.toString()
      );

      if (userDestination) {
        userDestination.isApproved = false;
        userDestination.approvalStatus = 'rejected';
        userDestination.isActive = false; // Deactivate for the creator
        await creator.save();
        console.log(`✅ Updated destination "${destination.name}" in creator ${destination.createdBy} destination list to rejected`);
      }
    }

    // Create rejection notification
    try {
      await (Notification as any).createDestinationRejectionNotification(
        destination.createdBy,
        rejectedBy,
        destination.name,
        destination._id,
        reason
      );
    } catch (notificationError) {
      console.error('Error creating rejection notification:', notificationError);
      // Don't fail the rejection if notification fails
    }

    res.json({
      success: true,
      message: 'Destination rejected successfully',
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting destination',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Admin: Delete destination (HARD DELETE - completely remove from database)
export const deleteDestination = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🚀 Admin hard deleting destination:', req.user?.roles);
    // Check if user is admin
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { destinationId } = req.params;

    const destination = await GlobalDestination.findById(destinationId);
    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    // HARD DELETE: completely remove from database
    console.log('🗑️ Hard deleting destination:', destination.name, destination._id);
    await GlobalDestination.findByIdAndDelete(destinationId);
    console.log('✅ Destination completely removed from database');

    // Also remove from all seller preferences
    await SellerDestinationPreferences.updateMany(
      {},
      { $pull: { destinationPreferences: { destination: destinationId } } }
    );
    console.log('✅ Removed from all seller preferences');

    res.json({
      success: true,
      message: 'Destination permanently deleted from database'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting destination',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update destination (sellers can update their own destinations, admins can update any)
export const updateDestination = async (req: AuthRequest, res: Response) => {
  try {
    const { destinationId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.roles;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const destination = await GlobalDestination.findById(destinationId);
    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    // Check permissions: sellers can only update their own destinations, admins can update any
    const isOwner = destination.createdBy.toString() === userId.toString();
    const isAdmin = req.user?.roles.includes('admin') || false;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update destinations you created'
      });
    }

    const {
      name,
      description,
      coverImage,
      country,
      region,
      city,
      coordinates,
      isActive,
      popularity,
      featuredTours,
      metadata
    } = req.body;

    // Validate required fields
    if (!name || !description || !country) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: `Required fields missing: ${!name ? 'name, ' : ''}${!description ? 'description, ' : ''}${!country ? 'country' : ''}`
      });
    }

    // Check for duplicate destinations (excluding current one)
    const existingDestination = await GlobalDestination.findOne({
      _id: { $ne: destinationId },
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      country: { $regex: new RegExp(`^${country}$`, 'i') },
      $or: [
        { city: { $regex: new RegExp(`^${city || ''}$`, 'i') } },
        { city: { $exists: false } }
      ]
    });

    if (existingDestination) {
      return res.status(400).json({
        success: false,
        message: 'A destination with this name and location already exists'
      });
    }

    // Check if this is only an isActive toggle by comparing the boolean value change
    const isOnlyActiveToggle = isActive !== undefined &&
      isActive !== destination.isActive && // Only if isActive is actually changing
      name === destination.name &&
      description === destination.description &&
      coverImage === destination.coverImage &&
      country === destination.country &&
      region === destination.region &&
      city === destination.city &&
      (!coordinates || JSON.stringify(coordinates) === JSON.stringify(destination.coordinates));

    console.log('🔍 isActive toggle check:', {
      isActiveDefined: isActive !== undefined,
      isActiveChanging: isActive !== destination.isActive,
      currentIsActive: destination.isActive,
      newIsActive: isActive,
      nameMatch: name === destination.name,
      descriptionMatch: description === destination.description,
      isOnlyActiveToggle
    });

    // Update destination fields
    destination.name = name;
    destination.description = description;
    destination.coverImage = coverImage;
    destination.country = country;
    destination.region = region;
    destination.city = city;
    destination.coordinates = coordinates;
    destination.isActive = isActive !== undefined ? isActive : destination.isActive;
    destination.popularity = popularity !== undefined ? popularity : destination.popularity;
    destination.featuredTours = featuredTours || destination.featuredTours;
    destination.metadata = metadata;

    // If this is a seller updating an approved destination with content changes (not just isActive toggle), set it back to pending
    if (!isAdmin && destination.approvalStatus === 'approved' && !isOnlyActiveToggle) {
      destination.isApproved = false;
      destination.approvalStatus = 'pending';
      destination.approvedBy = undefined;
      destination.approvedAt = undefined;
      destination.rejectedBy = undefined;
      destination.rejectedAt = undefined;
      destination.rejectionReason = undefined;
      destination.submittedAt = new Date(); // Update submission time
      console.log('🔄 Seller made content changes to approved destination, setting back to pending');
    } else if (isOnlyActiveToggle) {
      console.log('🔄 Seller only toggled isActive status, keeping approval status intact');
    }

    await destination.save();

    res.json({
      success: true,
      message: destination.approvalStatus === 'pending' && !isAdmin
        ? 'Destination updated and submitted for approval'
        : 'Destination updated successfully',
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating destination',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
export const updateDestinationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { preferences, globalSettings } = req.body;

    let sellerPrefs = await SellerDestinationPreferences.findOne({ seller: sellerId });

    if (!sellerPrefs) {
      sellerPrefs = new SellerDestinationPreferences({
        seller: sellerId,
        destinationPreferences: [],
        globalSettings: globalSettings || {}
      });
    }

    if (preferences && Array.isArray(preferences)) {
      preferences.forEach((update: any) => {
        const preference = sellerPrefs.destinationPreferences.find(
          (pref: any) => pref.destination.toString() === update.destinationId.toString()
        );

        if (preference) {
          if (update.isVisible !== undefined) preference.isVisible = update.isVisible;
          if (update.isEnabled !== undefined) preference.isEnabled = update.isEnabled;
          if (update.customName !== undefined) preference.customName = update.customName;
          if (update.sortOrder !== undefined) preference.sortOrder = update.sortOrder;
          if (update.isFavorite !== undefined) preference.isFavorite = update.isFavorite;
        } else {
          sellerPrefs.destinationPreferences.push({
            destination: update.destinationId,
            isVisible: update.isVisible ?? true,
            isEnabled: update.isEnabled ?? true,
            customName: update.customName,
            sortOrder: update.sortOrder ?? 0,
            isFavorite: update.isFavorite ?? false
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
      message: 'Destination preferences updated successfully',
      data: sellerPrefs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating destination preferences',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Toggle favorite destination
export const toggleFavoriteDestination = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { destinationId } = req.params;

    let sellerPrefs = await SellerDestinationPreferences.findOne({ seller: sellerId });

    if (!sellerPrefs) {
      sellerPrefs = new SellerDestinationPreferences({
        seller: sellerId,
        destinationPreferences: [],
        globalSettings: {}
      });
    }

    const preference = sellerPrefs.destinationPreferences.find(
      (pref: any) => pref.destination.toString() === destinationId.toString()
    );

    if (preference) {
      preference.isFavorite = !preference.isFavorite;
    } else {
      sellerPrefs.destinationPreferences.push({
        destination: destinationId as any,
        isVisible: true,
        isEnabled: true,
        isFavorite: true
      });
    }

    sellerPrefs.lastUpdated = new Date();
    await sellerPrefs.save();

    res.json({
      success: true,
      message: 'Destination favorite status updated',
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

// Add existing destination to seller's list
export const addExistingDestinationToSeller = async (req: AuthRequest, res: Response): Promise<void> => {

  try {
    const { destinationId } = req.params;
    const sellerId = req.user?.id;

    if (!sellerId) {


      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(destinationId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid destination ID'
      });
      return;
    }
    console.log("req.user?.id;", req.user?.id)
    console.log("destinationId", destinationId)

    // Check if destination exists and is approved
    const destination = await GlobalDestination.findOne({
      _id: destinationId,
      isActive: true,
      isApproved: true,
      approvalStatus: 'approved'
    });

    console.log("Found destination:", destination ? "YES" : "NO");
    console.log("Destination details:", destination);

    if (!destination) {
      console.log("Destination not found or not approved");
      res.status(404).json({
        success: false,
        message: 'Approved destination not found'
      });
      return;
    }

    // Find or create seller preferences
    let sellerPrefs = await SellerDestinationPreferences.findOne({ seller: sellerId });
    console.log("Existing seller preferences:", sellerPrefs ? "YES" : "NO");

    if (!sellerPrefs) {
      console.log("Creating new seller preferences");
      sellerPrefs = new SellerDestinationPreferences({
        seller: sellerId,
        destinationPreferences: [],
        globalSettings: {}
      });
    }

    // Check if destination is already in seller's list
    const existingPreference = sellerPrefs.destinationPreferences.find(
      (pref: any) => pref.destination.toString() === destinationId.toString()
    );

    console.log("Destination already in list:", existingPreference ? "YES" : "NO");

    if (existingPreference) {
      // If already exists, make sure it's enabled and visible
      console.log("Updating existing preference");
      existingPreference.isVisible = true;
      existingPreference.isEnabled = true;
      existingPreference.isFavorite = true;
    } else {
      // Add new destination to seller's list
      console.log("Adding new destination to list");
      sellerPrefs.destinationPreferences.push({
        destination: destinationId as any,
        isVisible: true,
        isEnabled: true,
        isFavorite: true
      });

      // Increment seller count on the destination
      destination.sellerCount = (destination.sellerCount || 0) + 1;
      await destination.save();
    }

    sellerPrefs.lastUpdated = new Date();

    try {
      console.log("Saving seller preferences...");
      const savedPrefs = await sellerPrefs.save();
      console.log("Seller preferences saved successfully:", savedPrefs._id);
    } catch (saveError) {
      console.error("Error saving seller preferences:", saveError);
      throw saveError;
    }

    // Increment usage count for the destination
    try {
      console.log("Incrementing usage count...");
      const updatedDestination = await GlobalDestination.findByIdAndUpdate(destinationId, {
        $inc: { usageCount: 1 }
      });
      console.log("Usage count incremented successfully");
    } catch (updateError) {
      console.error("Error updating usage count:", updateError);
      // Don't throw here as this is not critical
    }

    // Also add to user's sellerInfo.destination array
    let user = await User.findById(sellerId);
    if (user) {
      // Ensure user has sellerInfo
      user = await ensureSellerInfo(user, sellerId.toString());

      if (user && user.sellerInfo) {
        if (!user.sellerInfo.destination) {
          user.sellerInfo.destination = [];
        }

        // Check if destination already exists in user's list
        const existingUserDestination = user.sellerInfo.destination.find(
          dest => dest.destinationId.toString() === destinationId.toString()
        );

        if (!existingUserDestination) {
          // Add new destination to user's list as active and approved
          user.sellerInfo.destination.push({
            destinationId: destinationId,
            destinationName: destination.name,
            isActive: true,
            isApproved: true,
            approvalStatus: 'approved',
            addedAt: new Date()

          });

          await user.save();
          console.log(`✅ Added destination "${destination.name}" to user ${sellerId} destination list`);
        } else {
          // Update existing destination to be active
          existingUserDestination.isActive = true;
          existingUserDestination.isApproved = true;
          existingUserDestination.approvalStatus = 'approved';

          await user.save();
          console.log(`✅ Updated destination "${destination.name}" in user ${sellerId} destination list to active`);
        }
      }
    }

    console.log("Operation completed successfully");
    res.json({
      success: true,
      message: 'Destination added to your list successfully',
      data: {
        destination: destination,
        preferences: sellerPrefs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding destination to your list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Toggle destination active status (user-specific, not global)
// This endpoint toggles the user's personal isActive status for a destination
export const toggleDestinationActiveStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { destinationId } = req.params;
    const sellerId = req.user?.id;

    console.log(`🔄 Toggle request for destination ${destinationId} by seller ${sellerId}`);

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    // Find the user and their destination preferences
    const user = await User.findById(sellerId);
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
        user.sellerInfo = {
          destination: [],
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
        console.log(`✅ SellerInfo initialized for user ${sellerId}`);
      } else {
        return res.status(404).json({
          success: false,
          message: 'User is not a seller'
        });
      }
    }

    // Check if the global destination exists (allow both approved and pending for creators)
    const globalDestination = await GlobalDestination.findOne({
      _id: destinationId
    });

    console.log("🔍 Global destination lookup:", {
      destinationId,
      found: !!globalDestination,
      approvalStatus: globalDestination?.approvalStatus,
      createdBy: globalDestination?.createdBy?.toString(),
      isCreator: globalDestination?.createdBy?.toString() === sellerId.toString()
    });

    if (!globalDestination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    // Check if destination is approved OR if user is the creator
    const isCreator = globalDestination.createdBy?.toString() === sellerId.toString();
    const isApproved = globalDestination.approvalStatus === 'approved';

    if (!isApproved && !isCreator) {
      return res.status(404).json({
        success: false,
        message: 'Destination not approved and you are not the creator'
      });
    }

    // Find the destination in user's destination array
    const userDestinationIndex = user.sellerInfo.destination?.findIndex(
      dest => dest.destinationId.toString() === destinationId
    );

    if (userDestinationIndex === -1 || userDestinationIndex === undefined) {
      // If destination not in user's list, add it
      if (!user.sellerInfo.destination) {
        user.sellerInfo.destination = [];
      }

      // Set status based on global destination status
      const userDestinationStatus = {
        destinationId: destinationId,
        destinationName: globalDestination.name,
        isActive: isApproved ? true : false, // Only activate if globally approved
        isApproved: isApproved,
        approvalStatus: globalDestination.approvalStatus,
        addedAt: new Date()
      };

      user.sellerInfo.destination.push(userDestinationStatus);
      await user.save();

      console.log(`✅ Added destination "${globalDestination.name}" to seller ${sellerId} with status: ${globalDestination.approvalStatus}`);

      return res.json({
        success: true,
        message: `Destination added successfully (${globalDestination.approvalStatus})`,
        data: {
          id: destinationId,
          name: globalDestination.name,
          isActive: userDestinationStatus.isActive,
          approvalStatus: userDestinationStatus.approvalStatus
        }
      });
    }

    // Toggle the user's specific isActive status
    if (!user.sellerInfo.destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found in user preferences'
      });
    }

    const userDestination = user.sellerInfo.destination[userDestinationIndex];
    const previousStatus = userDestination.isActive;

    // Don't allow activating pending destinations (unless user is creator)
    if (!userDestination.isActive && userDestination.approvalStatus === 'pending' && !isCreator) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate pending destination. Wait for admin approval.'
      });
    }

    // Don't allow activating rejected destinations
    if (!userDestination.isActive && userDestination.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate rejected destination.'
      });
    }

    userDestination.isActive = !userDestination.isActive;
    await user.save();

    console.log(`✅ Seller ${sellerId} toggled destination "${globalDestination.name}" from isActive: ${previousStatus} to isActive: ${userDestination.isActive} (user-specific)`);
    console.log(`📋 Global destination status remains unchanged`);

    res.json({
      success: true,
      message: `Destination ${userDestination.isActive ? 'activated' : 'deactivated'} successfully for your account`,
      data: {
        id: destinationId,
        name: globalDestination.name,
        isActive: userDestination.isActive,
        approvalStatus: userDestination.approvalStatus,
        globalApprovalStatus: globalDestination.approvalStatus
      }
    });
  } catch (error) {
    console.error('❌ Error in toggleDestinationActiveStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling destination status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get user-specific destinations with their personal active status
export const getUserDestinations = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Find the user and populate their destinations
    const user = await User.findById(sellerId).populate({
      path: 'sellerInfo.destination.destinationId',
      model: 'GlobalDestination',
      match: { approvalStatus: 'approved' }, // Only get approved global destinations
      select: 'name description coverImage country region city coordinates popularity'
    });

    if (!user || !user.sellerInfo) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Get user's destination preferences with global destination data
    const userDestinations = user.sellerInfo.destination?.map(userDest => {
      const globalDest = userDest.destinationId as any; // Populated destination

      if (!globalDest) return null; // Skip if global destination was deleted or not approved

      return {
        _id: globalDest._id,
        name: globalDest.name,
        description: globalDest.description,
        coverImage: globalDest.coverImage,
        country: globalDest.country,
        region: globalDest.region,
        city: globalDest.city,
        coordinates: globalDest.coordinates,
        popularity: globalDest.popularity,
        // User-specific status
        isActive: userDest.isActive,
        approvalStatus: userDest.approvalStatus,
        isApproved: userDest.isApproved,
        addedAt: userDest.addedAt
      };
    }).filter(Boolean) || []; // Remove null entries

    res.json({
      success: true,
      data: userDestinations,
      count: userDestinations.length,
      message: 'User destinations retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error in getUserDestinations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user destinations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Fix destinations with deletedAt but approved status (temporary fix)
export const fixDeletedApprovedDestinations = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Find destinations that are approved but have deletedAt
    const brokenDestinations = await GlobalDestination.find({
      approvalStatus: 'approved',
      isApproved: true,
      deletedAt: { $exists: true }
    });

    console.log('🔧 Found broken destinations:', brokenDestinations.length);

    // Clear deletedAt and deletedBy for these destinations
    const result = await GlobalDestination.updateMany(
      {
        approvalStatus: 'approved',
        isApproved: true,
        deletedAt: { $exists: true }
      },
      {
        $unset: {
          deletedAt: 1,
          deletedBy: 1
        }
      }
    );

    console.log('🔧 Fixed destinations:', result.modifiedCount);

    res.json({
      success: true,
      message: `Fixed ${result.modifiedCount} destinations with conflicting deletion/approval status`,
      data: {
        found: brokenDestinations.length,
        fixed: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fixing destinations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const removeExistingDestinationFromSeller = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { destinationId } = req.params;
    const sellerId = req.user?.id;

    console.log("sellerId", sellerId)
    console.log("destinationId", destinationId)

    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(destinationId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid destination ID'
      });
      return;
    }

    // Find seller preferences
    const sellerPrefs = await SellerDestinationPreferences.findOne({ seller: sellerId });
    console.log("sellerPrefs", sellerPrefs)

    if (!sellerPrefs) {
      res.status(404).json({
        success: false,
        message: 'No destination preferences found'
      });
      return;
    }

    console.log("Current destination preferences:", sellerPrefs.destinationPreferences);
    console.log("Looking for destinationId:", destinationId);

    // Log each destination in the preferences for debugging
    sellerPrefs.destinationPreferences.forEach((pref: any, index: number) => {
      console.log(`Preference ${index}:`, {
        destination: pref.destination,
        destinationString: pref.destination.toString(),
        matches: pref.destination.toString() === destinationId.toString()
      });
    });

    // Check if this is a destination created by the seller
    const sellerCreatedDestination = await GlobalDestination.findOne({
      _id: destinationId,
      createdBy: sellerId,
      isActive: true
    });

    if (sellerCreatedDestination) {
      // Check if destination is approved - if approved, only remove from view, don't delete
      if (sellerCreatedDestination.isApproved && sellerCreatedDestination.approvalStatus === 'approved') {
        console.log("This is an approved seller-created destination, removing from dashboard view only");

        // Add to seller preferences as disabled/hidden so it doesn't show in their dashboard
        const existingPreference = sellerPrefs.destinationPreferences.find(
          (pref: any) => pref.destination.toString() === destinationId.toString()
        );

        if (existingPreference) {
          // Update existing preference to hide it
          existingPreference.isVisible = false;
          existingPreference.isEnabled = false;
        } else {
          // Add new preference entry to hide it
          sellerPrefs.destinationPreferences.push({
            destination: destinationId as any,
            isVisible: false,
            isEnabled: false,
            isFavorite: false,
            sortOrder: 0
          });
        }

        // Decrease seller count on the destination
        if (sellerCreatedDestination.sellerCount && sellerCreatedDestination.sellerCount > 0) {
          sellerCreatedDestination.sellerCount -= 1;
        }

        await sellerCreatedDestination.save();
        sellerPrefs.lastUpdated = new Date();
        await sellerPrefs.save();

        // Also update user's sellerInfo.destination array to set as inactive
        const user = await User.findById(sellerId);
        if (user && user.sellerInfo && user.sellerInfo.destination) {
          const userDestination = user.sellerInfo.destination.find(
            dest => dest.destinationId.toString() === destinationId.toString()
          );
          if (userDestination) {
            userDestination.isActive = false;
            await user.save();
            console.log(`✅ Set destination "${sellerCreatedDestination.name}" as inactive in user ${sellerId} destination list`);
          }
        }

        res.json({
          success: true,
          message: 'Destination removed from your dashboard successfully'
        });
        return;
      } else {
        // If not approved yet, seller can hard delete it completely
        console.log("This is an unapproved seller-created destination, hard deleting it");
        await GlobalDestination.findByIdAndDelete(destinationId);

        // Also remove from seller preferences if exists
        sellerPrefs.destinationPreferences = sellerPrefs.destinationPreferences.filter(
          (pref: any) => pref.destination.toString() !== destinationId.toString()
        );
        await sellerPrefs.save();

        // Also remove from user's sellerInfo.destination array
        const user = await User.findById(sellerId);
        if (user && user.sellerInfo && user.sellerInfo.destination) {
          user.sellerInfo.destination = user.sellerInfo.destination.filter(
            dest => dest.destinationId.toString() !== destinationId.toString()
          );
          await user.save();
          console.log(`✅ Removed destination from user ${sellerId} destination list (hard delete)`);
        }

        res.json({
          success: true,
          message: 'Destination deleted successfully'
        });
        return;
      }
    }

    // Remove destination from seller's preferences (for destinations added from existing ones)
    const initialLength = sellerPrefs.destinationPreferences.length;
    sellerPrefs.destinationPreferences = sellerPrefs.destinationPreferences.filter(
      (pref: any) => pref.destination.toString() !== destinationId.toString()
    );

    if (sellerPrefs.destinationPreferences.length === initialLength) {
      res.status(404).json({
        success: false,
        message: 'Destination not found in your list'
      });
      return;
    }

    // Decrease seller count on the destination that was removed from preferences
    const removedDestination = await GlobalDestination.findById(destinationId);
    if (removedDestination && removedDestination.sellerCount > 0) {
      removedDestination.sellerCount -= 1;
      await removedDestination.save();
    }

    sellerPrefs.lastUpdated = new Date();
    await sellerPrefs.save();

    // Also remove from user's sellerInfo.destination array
    const user = await User.findById(sellerId);
    if (user && user.sellerInfo && user.sellerInfo.destination) {
      const initialUserDestLength = user.sellerInfo.destination.length;
      user.sellerInfo.destination = user.sellerInfo.destination.filter(
        dest => dest.destinationId.toString() !== destinationId.toString()
      );

      if (user.sellerInfo.destination.length < initialUserDestLength) {
        await user.save();
        console.log(`✅ Removed destination from user ${sellerId} destination list`);
      }
    }

    res.json({
      success: true,
      message: 'Destination removed from your list successfully',
      data: sellerPrefs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing destination from your list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
