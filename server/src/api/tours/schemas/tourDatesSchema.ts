import mongoose from 'mongoose';
import dateRangeSchema from './dateRangeSchema';
import departureSchema from './departureSchema';

// Create a unified tour dates schema
const tourDatesSchema = new mongoose.Schema({
  days: { 
    type: Number,
    min: [0, 'Days must be a non-negative number'] 
  },
  nights: { 
    type: Number,
    min: [0, 'Nights must be a non-negative number'] 
  },
  scheduleType: {
    type: String,
    enum: ['flexible', 'fixed', 'multiple', 'recurring'],
    default: 'flexible',
    index: true // Add index for queries that filter by schedule type
  },
  defaultDateRange: {
    type: dateRangeSchema,
    required: function(this: any) {
      // Only require defaultDateRange if scheduleType is flexible AND fixedDeparture is false
      return this.scheduleType === 'flexible' && this.fixedDeparture === false;
    }
  },
  departures: {
    type: [departureSchema],
    default: []
  },
  pricingCategory: {
    type: [String], // Array of pricing category IDs
    default: []
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'weekly'
  },
  recurrenceInterval: {
    type: Number,
    min: 1,
    default: 1
  },
  recurrenceEndDate: {
    type: Date
  }
}, { 
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual to get active departures
tourDatesSchema.virtual('activeDepartures').get(function(this: any) {
  if (!this.departures || this.departures.length === 0) {
    return [];
  }
  
  const now = new Date();
  return this.departures.filter((departure: any) => {
    // For non-recurring departures, simple date check
    if (!departure.isRecurring) {
      return departure.dateRange.from <= now && departure.dateRange.to >= now;
    }
    
    // For recurring departures, check recurrence end date
    if (departure.recurrenceEndDate && departure.recurrenceEndDate < now) {
      return false;
    }
    
    // Get the next occurrence
    const nextOccurrence = departure.nextOccurrence;
    return nextOccurrence && nextOccurrence.from <= now && nextOccurrence.to >= now;
  });
});

// Virtual to get next departure
tourDatesSchema.virtual('nextDeparture').get(function(this: any) {
  if (!this.departures || this.departures.length === 0) {
    return null;
  }
  
  const now = new Date();
  let nextDeparture = null;
  let earliestDate = new Date(8640000000000000); // Max date
  
  this.departures.forEach((departure: any) => {
    let departureDate;
    
    if (!departure.isRecurring) {
      // For non-recurring departures
      departureDate = departure.dateRange.from;
    } else {
      // For recurring departures
      const nextOccurrence = departure.nextOccurrence;
      if (nextOccurrence) {
        departureDate = nextOccurrence.from;
      } else {
        return; // Skip this departure if no next occurrence
      }
    }
    
    // Only consider future departures
    if (departureDate > now && departureDate < earliestDate) {
      earliestDate = departureDate;
      nextDeparture = departure;
    }
  });
  
  return nextDeparture;
});

// Method to check if a tour has any active or upcoming departures
tourDatesSchema.methods.hasAvailableDepartures = function(this: any): boolean {
  const now = new Date();
  
  if (this.scheduleType === 'flexible') {
    // For flexible scheduling, check if the default date range is current or in the future
    return this.defaultDateRange && this.defaultDateRange.to >= now;
  }
  
  // For fixed/recurring schedules, check departures
  return this.departures.some((departure: any) => {
    if (!departure.isRecurring) {
      return departure.dateRange.to >= now;
    }
    
    // For recurring departures, check recurrence end date
    return !departure.recurrenceEndDate || departure.recurrenceEndDate >= now;
  });
};

export default tourDatesSchema;
