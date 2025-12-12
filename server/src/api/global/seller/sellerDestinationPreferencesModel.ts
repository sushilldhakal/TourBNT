import mongoose, { Schema, Document } from "mongoose";

// Define Seller Destination Preferences interface
export interface ISellerDestinationPreferences extends Document {
  seller: mongoose.Schema.Types.ObjectId;
  destinationPreferences: {
    destination: mongoose.Schema.Types.ObjectId;
    isVisible: boolean;
    isEnabled: boolean;
    customName?: string;
    sortOrder?: number;
    lastUsed?: Date;
    isFavorite?: boolean;
  }[];
  globalSettings: {
    autoAcceptNewDestinations: boolean;
    defaultVisibility: boolean;
    hideEmptyDestinations: boolean;
    groupByCountry: boolean;
    showPopularFirst: boolean;
  };
  lastUpdated: Date;
}

const sellerDestinationPreferencesSchema = new Schema<ISellerDestinationPreferences>(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    destinationPreferences: [{
      destination: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GlobalDestination',
        required: true,
      },
      isVisible: {
        type: Boolean,
        default: true,
        description: 'Whether this destination appears in seller\'s destination list'
      },
      isEnabled: {
        type: Boolean,
        default: true,
        description: 'Whether seller can use this destination for new tours'
      },
      customName: {
        type: String,
        trim: true,
        maxlength: 100,
        description: 'Custom display name for this destination (seller-specific)'
      },
      sortOrder: {
        type: Number,
        default: 0,
        description: 'Custom sort order for seller\'s destination list'
      },
      lastUsed: {
        type: Date,
        description: 'When this destination was last used by the seller'
      },
      isFavorite: {
        type: Boolean,
        default: false,
        description: 'Whether seller has marked this destination as favorite'
      }
    }],
    globalSettings: {
      autoAcceptNewDestinations: {
        type: Boolean,
        default: true,
        description: 'Automatically show new approved destinations'
      },
      defaultVisibility: {
        type: Boolean,
        default: true,
        description: 'Default visibility for new destinations'
      },
      hideEmptyDestinations: {
        type: Boolean,
        default: false,
        description: 'Hide destinations with no tours from this seller'
      },
      groupByCountry: {
        type: Boolean,
        default: true,
        description: 'Group destinations by country in lists'
      },
      showPopularFirst: {
        type: Boolean,
        default: false,
        description: 'Show popular destinations first in lists'
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
sellerDestinationPreferencesSchema.index({ seller: 1 });
sellerDestinationPreferencesSchema.index({ 'destinationPreferences.destination': 1 });
sellerDestinationPreferencesSchema.index({ seller: 1, 'destinationPreferences.destination': 1 });

// Compound index to prevent duplicate destination preferences per seller
sellerDestinationPreferencesSchema.index(
  { seller: 1, 'destinationPreferences.destination': 1 }, 
  { unique: true, sparse: true }
);

// Virtual for visible destinations count
sellerDestinationPreferencesSchema.virtual('visibleDestinationsCount').get(function() {
  return this.destinationPreferences.filter(pref => pref.isVisible).length;
});

// Virtual for enabled destinations count
sellerDestinationPreferencesSchema.virtual('enabledDestinationsCount').get(function() {
  return this.destinationPreferences.filter(pref => pref.isEnabled).length;
});

// Virtual for favorite destinations count
sellerDestinationPreferencesSchema.virtual('favoriteDestinationsCount').get(function() {
  return this.destinationPreferences.filter(pref => pref.isFavorite).length;
});

// Static method to get seller's visible destinations
sellerDestinationPreferencesSchema.statics.getVisibleDestinations = function(sellerId: mongoose.Schema.Types.ObjectId) {
  return this.findOne({ seller: sellerId })
    .populate({
      path: 'destinationPreferences.destination',
      match: { isActive: true, isApproved: true, approvalStatus: 'approved' }
    })
    .then((prefs: any) => {
      if (!prefs) return [];
      return prefs.destinationPreferences
        .filter((pref: any) => pref.isVisible && pref.destination)
        .sort((a: any, b: any) => {
          // Sort by favorites first, then by sort order
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });
    });
};

// Static method to get seller's enabled destinations
sellerDestinationPreferencesSchema.statics.getEnabledDestinations = function(sellerId: mongoose.Schema.Types.ObjectId) {
  return this.findOne({ seller: sellerId })
    .populate({
      path: 'destinationPreferences.destination',
      match: { isActive: true, isApproved: true, approvalStatus: 'approved' }
    })
    .then((prefs: any) => {
      if (!prefs) return [];
      return prefs.destinationPreferences
        .filter((pref: any) => pref.isEnabled && pref.destination)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
};

// Static method to get seller's favorite destinations
sellerDestinationPreferencesSchema.statics.getFavoriteDestinations = function(sellerId: mongoose.Schema.Types.ObjectId) {
  return this.findOne({ seller: sellerId })
    .populate({
      path: 'destinationPreferences.destination',
      match: { isActive: true, isApproved: true, approvalStatus: 'approved' }
    })
    .then((prefs: any) => {
      if (!prefs) return [];
      return prefs.destinationPreferences
        .filter((pref: any) => pref.isFavorite && pref.destination)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
};

// Method to update destination visibility
sellerDestinationPreferencesSchema.methods.updateDestinationVisibility = function(
  destinationId: mongoose.Schema.Types.ObjectId,
  isVisible: boolean
) {
  const preference = this.destinationPreferences.find(
    (pref: any) => pref.destination.toString() === destinationId.toString()
  );
  
  if (preference) {
    preference.isVisible = isVisible;
  } else {
    this.destinationPreferences.push({
      destination: destinationId,
      isVisible,
      isEnabled: isVisible
    });
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update destination enabled status
sellerDestinationPreferencesSchema.methods.updateDestinationEnabled = function(
  destinationId: mongoose.Schema.Types.ObjectId,
  isEnabled: boolean
) {
  const preference = this.destinationPreferences.find(
    (pref: any) => pref.destination.toString() === destinationId.toString()
  );
  
  if (preference) {
    preference.isEnabled = isEnabled;
  } else {
    this.destinationPreferences.push({
      destination: destinationId,
      isVisible: true,
      isEnabled
    });
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to toggle favorite status
sellerDestinationPreferencesSchema.methods.toggleFavorite = function(
  destinationId: mongoose.Schema.Types.ObjectId
) {
  const preference = this.destinationPreferences.find(
    (pref: any) => pref.destination.toString() === destinationId.toString()
  );
  
  if (preference) {
    preference.isFavorite = !preference.isFavorite;
  } else {
    this.destinationPreferences.push({
      destination: destinationId,
      isVisible: true,
      isEnabled: true,
      isFavorite: true
    });
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to bulk update destination preferences
sellerDestinationPreferencesSchema.methods.bulkUpdatePreferences = function(updates: Array<{
  destinationId: mongoose.Schema.Types.ObjectId;
  isVisible?: boolean;
  isEnabled?: boolean;
  customName?: string;
  sortOrder?: number;
  isFavorite?: boolean;
}>) {
  updates.forEach(update => {
    const preference = this.destinationPreferences.find(
      (pref: any) => pref.destination.toString() === update.destinationId.toString()
    );
    
    if (preference) {
      if (update.isVisible !== undefined) preference.isVisible = update.isVisible;
      if (update.isEnabled !== undefined) preference.isEnabled = update.isEnabled;
      if (update.customName !== undefined) preference.customName = update.customName;
      if (update.sortOrder !== undefined) preference.sortOrder = update.sortOrder;
      if (update.isFavorite !== undefined) preference.isFavorite = update.isFavorite;
    } else {
      this.destinationPreferences.push({
        destination: update.destinationId,
        isVisible: update.isVisible ?? true,
        isEnabled: update.isEnabled ?? true,
        customName: update.customName,
        sortOrder: update.sortOrder ?? 0,
        isFavorite: update.isFavorite ?? false
      });
    }
  });
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to mark destination as used
sellerDestinationPreferencesSchema.methods.markDestinationUsed = function(
  destinationId: mongoose.Schema.Types.ObjectId
) {
  const preference = this.destinationPreferences.find(
    (pref: any) => pref.destination.toString() === destinationId.toString()
  );
  
  if (preference) {
    preference.lastUsed = new Date();
    this.lastUpdated = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Pre-save middleware to update lastUpdated
sellerDestinationPreferencesSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model<ISellerDestinationPreferences>("SellerDestinationPreferences", sellerDestinationPreferencesSchema);
