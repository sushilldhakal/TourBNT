import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  faqId: {
    type: String,
    required: false // Optional for backward compatibility
  }
}, {
  _id: true,
  timestamps: false
});

// Create text index for searchable FAQs
faqSchema.index({ question: 'text', answer: 'text' });

export default faqSchema;
