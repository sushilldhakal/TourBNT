import mongoose, { Document, Schema, Model, model } from 'mongoose';

// Define the TypeScript interface for the Post document
export interface IPost extends Document {
  title: string;
  content: string;
  author: mongoose.Types.ObjectId;  // Author references the User model
  tags: string[];
  image?: string;
  status: 'Draft' | 'Published' | 'Archived';  // Enum for post status
  likes: number;
  comments: mongoose.Types.ObjectId[];  // References to Comment model
  createdAt: Date;
  updatedAt: Date;
  views: number;
  enableComments: boolean;
}

// Create the Post Schema
const PostSchema: Schema<IPost> = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,  // Reference to User model
    ref: 'User',
    required: true,
  },
  tags: {
    type: [String],  // Array of strings
    default: [],
  },
  image: {
    type: String,  // URL or path to image
    default: '',
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft',
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',  // Reference to Comment model
    },
  ],
  enableComments: {
    type: Boolean,
    default: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to update 'updated_at' on modification
PostSchema.pre<IPost>('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Create the Post model
const Post: Model<IPost> = model<IPost>('Post', PostSchema);

export default Post;
