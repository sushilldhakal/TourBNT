import mongoose from 'mongoose';

const factSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  field_type: {
    type: String,
    enum: ['Plain Text', 'Single Select', 'Multi Select'],
    default: 'Plain Text'
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Allow different types of values based on field_type
    required: true,
    validate: {
      validator: function (this: any, value: any) {
        // First ensure value exists
        if (!value) return false;

        if (this.field_type === 'Multi Select') {
          // Must be an array
          if (!Array.isArray(value)) return false;

          // Empty array is valid
          if (value.length === 0) return true;

          // For Multi Select, each item should be an object with label and value properties
          // or we'll try to coerce it during processing
          return value.every((item: any) => {
            if (typeof item === 'string') return true; // Will be converted to {label, value} in processFactsData
            if (typeof item !== 'object' || item === null) return false;
            return true; // Will ensure it has label and value in processFactsData
          });
        }

        if (this.field_type === 'Single Select') {
          // For Single Select, must be an array with at most one item
          return Array.isArray(value) && value.length <= 1;
        }

        // For plain text, allow strings or arrays of strings
        return typeof value === 'string' ||
          (Array.isArray(value) && value.every((item: any) =>
            typeof item === 'string' || (typeof item === 'object' && item !== null)));
      },
      message: 'Value format does not match the specified field type'
    }
  },
  icon: {
    type: String
  },
  factId: {
    type: String,
    required: false // Optional for backward compatibility
  }
}, {
  _id: true,
  timestamps: false
});

// Add text index for searchable facts
factSchema.index({ title: 'text' });

export default factSchema;
