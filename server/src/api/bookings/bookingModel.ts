import mongoose, { Schema } from 'mongoose';
import { Booking } from './bookingTypes';

const bookingSchema = new Schema<Booking>(
    {
        // Tour reference
        tour: {
            type: Schema.Types.ObjectId,
            ref: 'Tour',
            required: true,
        },
        tourTitle: {
            type: String,
            required: true,
        },
        tourCode: {
            type: String,
            required: true,
        },

        // User reference (optional for guest bookings)
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },

        // Guest information
        isGuestBooking: {
            type: Boolean,
            default: false,
        },
        guestInfo: {
            fullName: String,
            email: String,
            phone: String,
            country: String,
        },

        // Booking details
        departureDate: {
            type: Date,
            required: true,
        },
        participants: {
            adults: {
                type: Number,
                required: true,
                min: 1,
            },
            children: {
                type: Number,
                default: 0,
                min: 0,
            },
            infants: {
                type: Number,
                default: 0,
                min: 0,
            },
        },
        travelers: [
            {
                firstName: {
                    type: String,
                    required: true,
                },
                lastName: {
                    type: String,
                    required: true,
                },
                email: {
                    type: String,
                    required: true,
                },
                phone: {
                    type: String,
                    required: true,
                },
                dateOfBirth: {
                    type: Date,
                    required: true,
                },
                passportNumber: {
                    type: String,
                },
            },
        ],
        pricingOptionId: {
            type: String,
        },
        pricing: {
            basePrice: {
                type: Number,
                required: true,
            },
            adultPrice: {
                type: Number,
                required: true,
            },
            childPrice: {
                type: Number,
                required: true,
            },
            infantPrice: {
                type: Number,
                default: 0,
            },
            totalPrice: {
                type: Number,
                required: true,
            },
            currency: {
                type: String,
                default: 'USD',
            },
        },

        // Contact information
        contactName: {
            type: String,
            required: true,
        },
        contactEmail: {
            type: String,
            required: true,
        },
        contactPhone: {
            type: String,
            required: true,
        },

        // Special requests
        specialRequests: String,

        // Booking status
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'completed'],
            default: 'pending',
        },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'partial', 'paid', 'refunded'],
            default: 'unpaid',
        },

        // Payment information
        paymentMethod: String,
        transactionId: String,
        paidAmount: {
            type: Number,
            default: 0,
        },
        paymentDetails: {
            method: String,
            transactionId: String,
            paidAt: Date,
        },

        // Timestamps
        bookingDate: {
            type: Date,
            default: Date.now,
        },
        confirmedAt: Date,
        cancelledAt: Date,
        cancellationReason: String,

        // Metadata
        bookingReference: {
            type: String,
            required: true,
            unique: true,
        },
        notes: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
bookingSchema.index({ tour: 1, departureDate: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ bookingReference: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'guestInfo.email': 1 });

// Generate booking reference before saving
bookingSchema.pre('save', function (next) {
    if (!this.bookingReference) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.bookingReference = `BK-${timestamp}-${random}`;
    }
    next();
});

const BookingModel = mongoose.model<Booking>('Booking', bookingSchema);

export default BookingModel;
