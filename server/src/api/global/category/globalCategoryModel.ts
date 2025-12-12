import mongoose, { Schema, Document } from "mongoose";

// Define Global Category interface
export interface IGlobalCategory extends Document {
  name: string;
  description: string;
  imageUrl?: string;
  slug: string;
  reason?: string;
  isApproved: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdBy: mongoose.Schema.Types.ObjectId;
  approvedBy?: mongoose.Schema.Types.ObjectId;
  rejectedBy?: mongoose.Schema.Types.ObjectId;
  rejectionReason?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  submittedAt: Date;
  popularity: number;
  usageCount: number;
  metadata?: {
    keywords?: string[];
    parentCategory?: mongoose.Schema.Types.ObjectId;
    subcategories?: mongoose.Schema.Types.ObjectId[];
  };
}

const globalCategorySchema = new Schema<IGlobalCategory>(
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
      maxlength: 500,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
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
    popularity: {
      type: Number,
      default: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      keywords: [{
        type: String,
        trim: true,
      }],
      parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GlobalCategory',
      },
      subcategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GlobalCategory',
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
globalCategorySchema.index({ slug: 1 }, { unique: true });
globalCategorySchema.index({ approvalStatus: 1 });
globalCategorySchema.index({ isApproved: 1 });
globalCategorySchema.index({ createdBy: 1 });
globalCategorySchema.index({ name: 'text', description: 'text' });

// Virtual for checking if category is available for use
globalCategorySchema.virtual('isAvailable').get(function() {
  return this.isApproved && this.approvalStatus === 'approved';
});

// Pre-save middleware to generate slug
globalCategorySchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name')) {
    if (!this.slug || this.isModified('name')) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  }
  next();
});

// Static method to find approved categories
globalCategorySchema.statics.findApproved = function() {
  return this.find({ 
    isApproved: true, 
    approvalStatus: 'approved' 
  });
};

// Static method to find pending categories
globalCategorySchema.statics.findPending = function() {
  return this.find({ 
    approvalStatus: 'pending' 
  });
};

// Method to approve category
globalCategorySchema.methods.approve = function(approvedBy: mongoose.Schema.Types.ObjectId) {
  this.isApproved = true;
  this.approvalStatus = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.rejectedBy = undefined;
  this.rejectedAt = undefined;
  this.rejectionReason = undefined;
  return this.save();
};

// Method to reject category
globalCategorySchema.methods.reject = function(
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

export default mongoose.model<IGlobalCategory>("GlobalCategory", globalCategorySchema);
