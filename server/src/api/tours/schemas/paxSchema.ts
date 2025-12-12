import mongoose from 'mongoose';

// Schema for passenger range (min and max pax)
const paxSchema = new mongoose.Schema({
    minPax: {
        type: Number,
        default: 1,
        min: [1, 'Minimum pax must be at least 1']
      },
      maxPax: {
        type: Number,
        default: 10,
        validate: {
          validator: function(value: number): boolean {
            // @ts-ignore - 'this' context in mongoose validators
            return value >= this.minPax;
          },
          message: 'Maximum pax must be greater than or equal to minimum pax'
        }
      }
}, { _id: false });

export default paxSchema;


