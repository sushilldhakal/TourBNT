import mongoose from 'mongoose';
import dateRangeSchema from './dateRangeSchema';

// Create a unified departure schema
const departureSchema = new mongoose.Schema({
  id: {
    type: String, 
    required: true,
    index: true // Add index for fast lookups by ID
  },
  label: {
    type: String, 
    required: true 
  },
  dateRange: {
    type: dateRangeSchema,
    required: true
  },
  isRecurring: { 
    type: Boolean, 
    default: false 
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', null, undefined],
    validate: {
      validator: function(this: any, value: string | null | undefined): boolean {
        return !this.isRecurring || !!value;
      },
      message: 'Recurrence pattern is required when isRecurring is true'
    }
  },
  recurrenceEndDate: {
    type: Date,
    validate: {
      validator: function(this: any, value: Date | null | undefined): boolean {
        if (!this.isRecurring) return true;
        if (!value) return false;
        return value > this.dateRange.from;
      },
      message: 'Recurrence end date must be after the start date and is required when isRecurring is true'
    }
  },
  selectedPricingOptions: {
    type: [mongoose.Schema.Types.Mixed],  // Accept both strings and objects
    default: []
  }
}, { 
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Method to check if departure is active
departureSchema.methods.isActive = function(this: any): boolean {
  const now = new Date();
  
  // Check basic date range
  if (this.dateRange.from > now || this.dateRange.to < now) {
    return false;
  }
  
  // For recurring departures, check if we're past the recurrence end date
  if (this.isRecurring && this.recurrenceEndDate && this.recurrenceEndDate < now) {
    return false;
  }
  
  return true;
};

// Virtual to get next occurrence for recurring departures
departureSchema.virtual('nextOccurrence').get(function(this: any) {
  if (!this.isRecurring) {
    return this.dateRange;
  }
  
  const now = new Date();
  let nextStart = new Date(this.dateRange.from);
  let nextEnd = new Date(this.dateRange.to);
  
  if (nextEnd < now) {
    // Calculate next occurrence based on recurrence pattern
    const daysDiff = Math.round((nextEnd.getTime() - nextStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Find the next start date after today based on recurrence pattern
    switch (this.recurrencePattern) {
      case 'daily':
        while (nextStart < now) {
          nextStart.setDate(nextStart.getDate() + 1);
        }
        break;
      case 'weekly':
        while (nextStart < now) {
          nextStart.setDate(nextStart.getDate() + 7);
        }
        break;
      case 'biweekly':
        while (nextStart < now) {
          nextStart.setDate(nextStart.getDate() + 14);
        }
        break;
      case 'monthly':
        while (nextStart < now) {
          nextStart.setMonth(nextStart.getMonth() + 1);
        }
        break;
      case 'quarterly':
        while (nextStart < now) {
          nextStart.setMonth(nextStart.getMonth() + 3);
        }
        break;
      case 'yearly':
        while (nextStart < now) {
          nextStart.setFullYear(nextStart.getFullYear() + 1);
        }
        break;
    }
    
    // Set next end date based on the calculated start date and original duration
    nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + daysDiff);
  }
  
  // Check if next occurrence is past the recurrence end date
  if (this.recurrenceEndDate && nextStart > this.recurrenceEndDate) {
    return null;
  }
  
  return {
    from: nextStart,
    to: nextEnd
  };
});

export default departureSchema;
