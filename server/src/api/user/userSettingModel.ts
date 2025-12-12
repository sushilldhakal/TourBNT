import mongoose, { Schema, Document } from "mongoose";

interface UserSettings extends Document {
    user: mongoose.Schema.Types.ObjectId;
    cloudinaryCloud?: string;
    cloudinaryApiKey?: string;
    cloudinaryApiSecret?: string;
    openaiApiKey?: string;
    googleApiKey?:string;
}

const userSettingsSchema = new mongoose.Schema<UserSettings>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    cloudinaryCloud: { type: String, default: '' },
    cloudinaryApiKey: { type: String, default: '' },
    cloudinaryApiSecret: { type: String, default: '' },
    openaiApiKey: { type: String, default: '' },
    googleApiKey: { type: String, default: '' },
}, {
    timestamps: true,
});

export default mongoose.model<UserSettings>("UserSettings", userSettingsSchema);
