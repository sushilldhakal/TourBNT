import mongoose from 'mongoose';

const itinerarySchema = new mongoose.Schema({
  day: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  dateTime: {
    type: Date
  },
  image: {
    type: String
  },
}, { 
  _id: true, // Keep _id for itinerary items to maintain order and reference
  timestamps: false
});

export default itinerarySchema;
