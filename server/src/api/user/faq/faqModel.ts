import mongoose, { Schema, Document } from "mongoose";

// Define UserFaqs Schema
interface UserFaqs extends Document {
    question: string;
    answer: string;
  user: mongoose.Schema.Types.ObjectId;
}

const userFaqsSchema = new Schema<UserFaqs>(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<UserFaqs>("Faqs", userFaqsSchema);
