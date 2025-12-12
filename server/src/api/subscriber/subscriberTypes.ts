import mongoose from 'mongoose';

export interface Subscriber{
  _id: mongoose.Types.ObjectId;
  email: string;
  subscribedAt: Date;
}
