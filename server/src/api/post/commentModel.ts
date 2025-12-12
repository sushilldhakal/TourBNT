import mongoose, { Document, Schema, Model, model } from 'mongoose';

// Define the TypeScript interface for the Comment document
interface IComment extends Document {
  post: mongoose.Types.ObjectId;  // Reference to Post model
  user: mongoose.Types.ObjectId;  // Reference to User model
  text: string;
  approve:boolean; 
  likes: number;
  views: number;
  timestamp: string;
  replies: IComment[]; // Array for nested replies
  created_at: Date;
}


// Create the Comment Schema
const CommentSchema: Schema<IComment> = new Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  timestamp: { type: String },
  replies: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment', // Self-referencing to allow nested replies
    }
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
  approve:{
    type:Boolean,
    default:false
  },
});

// Create the Comment model
const Comment: Model<IComment> = model<IComment>('Comment', CommentSchema);

export default Comment;
