import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Schema.Types.ObjectId;
  sender?: mongoose.Schema.Types.ObjectId;
  type: 'destination_rejected' | 'destination_approved' | 'destination_deleted' | 'general';
  title: string;
  message: string;
  data?: {
    destinationId?: mongoose.Schema.Types.ObjectId;
    destinationName?: string;
    rejectionReason?: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['destination_rejected', 'destination_approved', 'destination_deleted', 'general'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    data: {
      destinationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GlobalDestination',
      },
      destinationName: {
        type: String,
        trim: true,
      },
      rejectionReason: {
        type: String,
        trim: true,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });

// Static method to create destination rejection notification
notificationSchema.statics.createDestinationRejectionNotification = function(
  recipientId: mongoose.Schema.Types.ObjectId,
  senderId: mongoose.Schema.Types.ObjectId,
  destinationName: string,
  destinationId: mongoose.Schema.Types.ObjectId,
  rejectionReason: string
) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: 'destination_rejected',
    title: 'Destination Submission Rejected',
    message: `Your destination "${destinationName}" has been rejected. Reason: ${rejectionReason}`,
    data: {
      destinationId,
      destinationName,
      rejectionReason,
    },
  });
};

// Static method to create destination approval notification
notificationSchema.statics.createDestinationApprovalNotification = function(
  recipientId: mongoose.Schema.Types.ObjectId,
  senderId: mongoose.Schema.Types.ObjectId,
  destinationName: string,
  destinationId: mongoose.Schema.Types.ObjectId
) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: 'destination_approved',
    title: 'Destination Approved',
    message: `Congratulations! Your destination "${destinationName}" has been approved and is now available for tours.`,
    data: {
      destinationId,
      destinationName,
    },
  });
};

export default mongoose.model<INotification>('Notification', notificationSchema);
