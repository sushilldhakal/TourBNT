import mongoose, { Schema } from 'mongoose';
import { GalleryDocument, Image } from './galleryTypes';

const imageSchema = new Schema<Image>({
  _id: { type: Schema.Types.ObjectId, required: true, auto: true },
  url: { type: String, required: true },
  secure_url: { type: String },
  original_filename: { type: String },
  display_name: { type: String },
  public_id: { type: String},
  description: { type: String },
  title: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  asset_id: { type: String },
  width: { type: Number },
  height: { type: Number },
  format: { type: String },
  resource_type: { type: String },
  created_at: { type: Date },
  tags: { type: [String], default: [] },
  pages: { type: Number },
  bytes: { type: Number },
  type: { type: String },
  etag: { type: String },
  placeholder: { type: Boolean, default: false },
  asset_folder: { type: String, default: '' },
  api_key: { type: String }
});

const gallerySchema: Schema<GalleryDocument> = new mongoose.Schema(
    {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        images: [imageSchema],
        videos: [imageSchema],
        PDF: [imageSchema],
      },
      { timestamps: true }
    );

const Gallery = mongoose.model<GalleryDocument>('Gallery', gallerySchema);

export default Gallery;
