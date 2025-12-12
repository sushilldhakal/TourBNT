import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  map: {
    type: String,
    default: ''
  },
  street: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true,
    required: true
  },
  state: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    required: true
  },
  lat: {
    type: Number,
    validate: {
      validator: function(val: number) {
        return val >= -90 && val <= 90;
      },
      message: 'Latitude must be between -90 and 90'
    }
  },
  zip: {
    type: Number,
    trim: true
  },
  lng: {
    type: Number,
    validate: {
      validator: function(val: number) {
        return val >= -180 && val <= 180;
      },
      message: 'Longitude must be between -180 and 180'
    }
  }
}, { 
  _id: false,
  timestamps: false 
});

// Add geospatial index for location-based queries
locationSchema.index({ lat: 1, lng: 1 });

export default locationSchema;
