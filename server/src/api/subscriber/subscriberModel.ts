import mongoose from 'mongoose';
import { Subscriber } from './subscriberTypes';


const subscriberSchema = new mongoose.Schema<Subscriber>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  
},
{timestamps: true},
);

export default mongoose.model<Subscriber>('Subscriber', subscriberSchema);

