import mongoose from 'mongoose';
import pricingOptionSchema from './pricingOptionSchema';

// Subschema for Pricing Group
const pricingGroupSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [pricingOptionSchema],
    required: true,
    validate: {
      validator: function(options: any[]) {
        return options.length > 0;
      },
      message: 'At least one pricing option is required in a pricing group'
    }
  }
}, { 
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for minimum price in the group
pricingGroupSchema.virtual('minPrice').get(function(this: any) {
  if (!this.options || this.options.length === 0) {
    return 0;
  }
  
  return Math.min(...this.options.map((option: any) => 
    option.effectivePrice || option.price
  ));
});

// Add virtual for maximum price in the group
pricingGroupSchema.virtual('maxPrice').get(function(this: any) {
  if (!this.options || this.options.length === 0) {
    return 0;
  }
  
  return Math.max(...this.options.map((option: any) => 
    option.effectivePrice || option.price
  ));
});

// Method to find a pricing option by name
pricingGroupSchema.methods.findOptionByName = function(name: string) {
  if (!this.options) return null;
  return this.options.find((option: any) => option.name === name);
};

export default pricingGroupSchema;
