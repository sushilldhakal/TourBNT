import { Schema } from 'mongoose';

/**
 * Mongoose plugin to add timestamp fields and auto-update logic
 */
export const timestampPlugin = (schema: Schema) => {
    // Add timestamp fields if they don't exist
    if (!schema.path('createdAt')) {
        schema.add({
            createdAt: { type: Date, default: Date.now }
        });
    }

    if (!schema.path('updatedAt')) {
        schema.add({
            updatedAt: { type: Date, default: Date.now }
        });
    }

    // Update updatedAt on save
    schema.pre('save', function (next) {
        this.updatedAt = new Date();
        next();
    });

    // Update updatedAt on findOneAndUpdate
    schema.pre('findOneAndUpdate', function (next) {
        this.set({ updatedAt: new Date() });
        next();
    });

    // Update updatedAt on update
    schema.pre('updateOne' as any, function (next: any) {
        this.set({ updatedAt: new Date() });
        next();
    });
};

/**
 * Plugin to add soft delete functionality
 */
export const softDeletePlugin = (schema: Schema) => {
    schema.add({
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date }
    });

    // Override find methods to exclude soft-deleted documents
    schema.pre(/^find/ as any, function (this: any, next: any) {
        if (!this.getOptions().includeDeleted) {
            this.where({ isDeleted: { $ne: true } });
        }
        next();
    });

    // Add soft delete method
    schema.methods.softDelete = function (this: any) {
        this.isDeleted = true;
        this.deletedAt = new Date();
        return this.save();
    };

    // Add restore method
    schema.methods.restore = function (this: any) {
        this.isDeleted = false;
        this.deletedAt = undefined;
        return this.save();
    };
};
