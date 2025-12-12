import mongoose, { Schema, Document } from "mongoose";

// Define Seller Category Preferences interface
export interface ISellerCategoryPreferences extends Document {
  seller: mongoose.Schema.Types.ObjectId;
  categoryPreferences: {
    category: mongoose.Schema.Types.ObjectId;
    isVisible: boolean;
    isEnabled: boolean;
    isFavorite?: boolean;
    customName?: string;
    sortOrder?: number;
    lastUsed?: Date;
  }[];
  globalSettings: {
    autoAcceptNewCategories: boolean;
    defaultVisibility: boolean;
    hideEmptyCategories: boolean;
  };
  lastUpdated: Date;
}

const sellerCategoryPreferencesSchema = new Schema<ISellerCategoryPreferences>(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    categoryPreferences: [{
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GlobalCategory',
        required: true,
      },
      isVisible: {
        type: Boolean,
        default: true,
        description: 'Whether this category appears in seller\'s category list'
      },
      isEnabled: {
        type: Boolean,
        default: true,
        description: 'Whether seller can use this category for new tours'
      },
      isFavorite: {
        type: Boolean,
        default: false,
        description: 'Whether this category is marked as favorite by the seller'
      },
      customName: {
        type: String,
        trim: true,
        maxlength: 100,
        description: 'Custom display name for this category (seller-specific)'
      },
      sortOrder: {
        type: Number,
        default: 0,
        description: 'Custom sort order for seller\'s category list'
      },
      lastUsed: {
        type: Date,
        description: 'When this category was last used by the seller'
      }
    }],
    globalSettings: {
      autoAcceptNewCategories: {
        type: Boolean,
        default: true,
        description: 'Automatically show new approved categories'
      },
      defaultVisibility: {
        type: Boolean,
        default: true,
        description: 'Default visibility for new categories'
      },
      hideEmptyCategories: {
        type: Boolean,
        default: false,
        description: 'Hide categories with no tours from this seller'
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
sellerCategoryPreferencesSchema.index({ seller: 1 });
sellerCategoryPreferencesSchema.index({ 'categoryPreferences.category': 1 });
sellerCategoryPreferencesSchema.index({ seller: 1, 'categoryPreferences.category': 1 });

// Compound index to prevent duplicate category preferences per seller
sellerCategoryPreferencesSchema.index(
  { seller: 1, 'categoryPreferences.category': 1 }, 
  { unique: true, sparse: true }
);

// Virtual for visible categories count
sellerCategoryPreferencesSchema.virtual('visibleCategoriesCount').get(function() {
  return this.categoryPreferences.filter(pref => pref.isVisible).length;
});

// Virtual for enabled categories count
sellerCategoryPreferencesSchema.virtual('enabledCategoriesCount').get(function() {
  return this.categoryPreferences.filter(pref => pref.isEnabled).length;
});

// Static method to get seller's visible categories
sellerCategoryPreferencesSchema.statics.getVisibleCategories = function(sellerId: mongoose.Schema.Types.ObjectId) {
  return this.findOne({ seller: sellerId })
    .populate({
      path: 'categoryPreferences.category',
      match: { isActive: true, isApproved: true, approvalStatus: 'approved' }
    })
    .then((prefs: any) => {
      if (!prefs) return [];
      return prefs.categoryPreferences
        .filter((pref: any) => pref.isVisible && pref.category)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
};

// Static method to get seller's enabled categories
sellerCategoryPreferencesSchema.statics.getEnabledCategories = function(sellerId: mongoose.Schema.Types.ObjectId) {
  return this.findOne({ seller: sellerId })
    .populate({
      path: 'categoryPreferences.category',
      match: { isActive: true, isApproved: true, approvalStatus: 'approved' }
    })
    .then((prefs: any) => {
      if (!prefs) return [];
      return prefs.categoryPreferences
        .filter((pref: any) => pref.isEnabled && pref.category)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
};

// Method to update category visibility
sellerCategoryPreferencesSchema.methods.updateCategoryVisibility = function(
  categoryId: mongoose.Schema.Types.ObjectId,
  isVisible: boolean
) {
  const preference = this.categoryPreferences.find(
    (pref: any) => pref.category.toString() === categoryId.toString()
  );
  
  if (preference) {
    preference.isVisible = isVisible;
  } else {
    this.categoryPreferences.push({
      category: categoryId,
      isVisible,
      isEnabled: isVisible
    });
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update category enabled status
sellerCategoryPreferencesSchema.methods.updateCategoryEnabled = function(
  categoryId: mongoose.Schema.Types.ObjectId,
  isEnabled: boolean
) {
  const preference = this.categoryPreferences.find(
    (pref: any) => pref.category.toString() === categoryId.toString()
  );
  
  if (preference) {
    preference.isEnabled = isEnabled;
  } else {
    this.categoryPreferences.push({
      category: categoryId,
      isVisible: true,
      isEnabled
    });
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to bulk update category preferences
sellerCategoryPreferencesSchema.methods.bulkUpdatePreferences = function(updates: Array<{
  categoryId: mongoose.Schema.Types.ObjectId;
  isVisible?: boolean;
  isEnabled?: boolean;
  customName?: string;
  sortOrder?: number;
}>) {
  updates.forEach(update => {
    const preference = this.categoryPreferences.find(
      (pref: any) => pref.category.toString() === update.categoryId.toString()
    );
    
    if (preference) {
      if (update.isVisible !== undefined) preference.isVisible = update.isVisible;
      if (update.isEnabled !== undefined) preference.isEnabled = update.isEnabled;
      if (update.customName !== undefined) preference.customName = update.customName;
      if (update.sortOrder !== undefined) preference.sortOrder = update.sortOrder;
    } else {
      this.categoryPreferences.push({
        category: update.categoryId,
        isVisible: update.isVisible ?? true,
        isEnabled: update.isEnabled ?? true,
        customName: update.customName,
        sortOrder: update.sortOrder ?? 0
      });
    }
  });
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to mark category as used
sellerCategoryPreferencesSchema.methods.markCategoryUsed = function(
  categoryId: mongoose.Schema.Types.ObjectId
) {
  const preference = this.categoryPreferences.find(
    (pref: any) => pref.category.toString() === categoryId.toString()
  );
  
  if (preference) {
    preference.lastUsed = new Date();
    this.lastUpdated = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Pre-save middleware to update lastUpdated
sellerCategoryPreferencesSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model<ISellerCategoryPreferences>("SellerCategoryPreferences", sellerCategoryPreferencesSchema);
