import mongoose, { Schema, Document } from "mongoose";

// Define Global Destination interface
export interface IGlobalDestination extends Document {
  name: string;
  description: string;
  coverImage?: string;
  country: string;
  region?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isActive: boolean;
  isApproved: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdBy: mongoose.Schema.Types.ObjectId;
  approvedBy?: mongoose.Schema.Types.ObjectId;
  rejectedBy?: mongoose.Schema.Types.ObjectId;
  rejectionReason?: string;
  reason?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  submittedAt: Date;
  deletedAt?: Date;
  deletedBy?: mongoose.Schema.Types.ObjectId;
  popularity: number;
  usageCount: number;
  sellerCount: number;
  featuredTours?: mongoose.Schema.Types.ObjectId[];
  metadata?: {
    timezone?: string;
    currency?: string;
    language?: string[];
    climate?: string;
    bestTimeToVisit?: string[];
    attractions?: string[];
  };
}

const globalDestinationSchema = new Schema<IGlobalDestination>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    coverImage: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    popularity: {
      type: Number,
      default: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    sellerCount: {
      type: Number,
      default: 0,
    },
    featuredTours: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
    }],
    metadata: {
      timezone: {
        type: String,
        trim: true,
      },
      currency: {
        type: String,
        trim: true,
      },
      language: [{
        type: String,
        trim: true,
      }],
      climate: {
        type: String,
        trim: true,
      },
      bestTimeToVisit: [{
        type: String,
        trim: true,
      }],
      attractions: [{
        type: String,
        trim: true,
      }],
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
globalDestinationSchema.index({ country: 1, region: 1, city: 1 });
globalDestinationSchema.index({ approvalStatus: 1 });
globalDestinationSchema.index({ isActive: 1, isApproved: 1 });
globalDestinationSchema.index({ createdBy: 1 });
globalDestinationSchema.index({ name: 'text', description: 'text', country: 'text' });
globalDestinationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Virtual for checking if destination is available for use
globalDestinationSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.isApproved && this.approvalStatus === 'approved';
});

// Virtual for full location string
globalDestinationSchema.virtual('fullLocation').get(function() {
  const parts = [this.name, this.city, this.region, this.country].filter(Boolean);
  return parts.join(', ');
});

// Static method to find approved destinations
globalDestinationSchema.statics.findApproved = function() {
  return this.find({ 
    isActive: true, 
    isApproved: true, 
    approvalStatus: 'approved' 
  });
};

// Static method to find pending destinations
globalDestinationSchema.statics.findPending = function() {
  return this.find({ 
    approvalStatus: 'pending' 
  });
};

// Static method to find by country
globalDestinationSchema.statics.findByCountry = function(country: string) {
  return this.find({ 
    country: new RegExp(country, 'i'),
    isActive: true, 
    isApproved: true, 
    approvalStatus: 'approved' 
  });
};

// Method to approve destination
globalDestinationSchema.methods.approve = function(approvedBy: mongoose.Schema.Types.ObjectId) {
  this.isApproved = true;
  this.approvalStatus = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.rejectedBy = undefined;
  this.rejectedAt = undefined;
  this.rejectionReason = undefined;
  return this.save();
};

// Method to reject destination
globalDestinationSchema.methods.reject = function(
  rejectedBy: mongoose.Schema.Types.ObjectId, 
  reason: string
) {
  this.isApproved = false;
  this.approvalStatus = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.approvedBy = undefined;
  this.approvedAt = undefined;
  return this.save();
};

export default mongoose.model<IGlobalDestination>("GlobalDestination", globalDestinationSchema);
