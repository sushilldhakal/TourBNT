import mongoose, { Document, Schema } from 'mongoose';

// Define the TypeScript interface for the CommentLike document
interface ICommentLike extends Document {
  comment: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  created_at: Date;
}

// Create the CommentLike Schema
const CommentLikeSchema: Schema<ICommentLike> = new Schema({
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Create a compound index to ensure a user can only like a comment once
CommentLikeSchema.index({ comment: 1, user: 1 }, { unique: true });

// Create and export the CommentLike model
export default mongoose.model<ICommentLike>('CommentLike', CommentLikeSchema);
