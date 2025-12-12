import mongoose from 'mongoose';
import dateRangeSchema from './dateRangeSchema';

// Subschema for Discount
const discountSchema = new mongoose.Schema({
  discountEnabled: {
    type: Boolean,
    default: false,
    index: true, // Add index for queries that filter by discount availability
  },
  percentageOrPrice: {
    type: Boolean,
    default: false,
  },
  discountPercentage: {
    type: Number,
    validate: {
      validator: function(value: number) {
        // @ts-ignore - 'this' context in mongoose validators
        return !this.discountEnabled || !this.percentageOrPrice || (value >= 0 && value <= 100);
      },
      message: 'Percentage discount must be between 0 and 100'
    }
  },
  discountPrice: {
    type: Number,
    validate: {
      validator: function(value: number) {
        // @ts-ignore - 'this' context in mongoose validators
        return !this.discountEnabled || this.percentageOrPrice || value >= 0;
      },
      message: 'Price discount must be a positive number'
    }
  },
  description: {
    type: String,
  },
  discountCode: {
    type: String,
  },
  maxDiscountAmount: {
    type: Number,
    validate: {
      validator: function(value: number) {
        return value >= 0;
      },
      message: 'Maximum discount amount must be positive'
    }
  },
  discountDateRange: {
    type: dateRangeSchema,
    required: function(this: any) {
      return this.discountEnabled;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Add pre-save middleware to update the updatedAt timestamp
discountSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.set('updatedAt', new Date());
  }
  next();
});

export default discountSchema;
