import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    trim: true
  },
  alt: {
    type: String,
    trim: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, { 
  _id: true,
  timestamps: false 
});

export default gallerySchema;
