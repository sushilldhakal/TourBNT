import mongoose, { Schema, Document } from "mongoose";

// Define UserFacts Schema
interface UserFacts extends Document {
  name: string;
  field_type: string;
  value?: string[];
  icon: string;
  user: mongoose.Schema.Types.ObjectId;
}

const userFactsSchema = new Schema<UserFacts>(
  {
    name: {
      type: String,
      required: true,
    },
    field_type: {
      type: String,
      required: true,
    },
    value: {
        type: [String],
        default: [],
    },
    icon: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<UserFacts>("Facts", userFactsSchema);
