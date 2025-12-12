import mongoose from "mongoose";

export interface Image {
    _id: mongoose.Types.ObjectId;
    url: string;
    asset_id: string; 
    description?: string;
    uploadedAt: Date;
    title?:string;
    tags?:string[];
    secure_url?: string;
    original_filename?: string;
    display_name?: string;
    public_id?: string;
    width?: number;
    height?: number;
    format?: string;
    resource_type?: string;
    created_at?: Date;
    pages?: number;
    bytes?: number;
    type?: string;
    etag?: string;
    placeholder?: boolean;
    asset_folder?: string;
    api_key?: string;
  }
  
  export interface GalleryDocument extends mongoose.Document {
    user: mongoose.Types.ObjectId;
    images: Image[];
    PDF: Image[];
    videos: Image[];
  }