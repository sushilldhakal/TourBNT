import mongoose from 'mongoose';

// Base date range schema used throughout the application
const dateRangeSchema = new mongoose.Schema({
  from: { 
    type: Date, 
    required: true 
  },
  to: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(value: Date): boolean {
        // @ts-ignore - 'this' context in mongoose validators
        const fromDate = this.from;
        // Skip validation if fromDate is not available (during individual field updates)
        if (!fromDate) {
          return true;
        }
        return value >= fromDate;
      },
      message: 'End date must be after or equal to start date'
    }
  },
}, { _id: false });

export default dateRangeSchema;
