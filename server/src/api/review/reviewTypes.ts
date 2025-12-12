import mongoose, { Document, Model } from 'mongoose';

// Interface for Review static methods
export interface IReviewModel extends Model<IReview> {
    calculateAverageRating(tourId: mongoose.Types.ObjectId | string): Promise<void>;
}

export interface IReview extends Document {
    user: mongoose.Types.ObjectId;
    tour: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
    likes: number;
    views: number;
    replies: {
        user: mongoose.Types.ObjectId;
        comment: string;
        createdAt: Date;
        likes: number;
        views: number;
    }[];
}