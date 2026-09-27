// Interface for seller information (stored as JSONB on users.seller_info)
export interface SellerInfo {
  [key: string]: unknown;
  companyName: string;
  companyRegistrationNumber: string;
  companyType: string;
  registrationDate: string;
  taxId: string;
  website?: string;
  businessAddress: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
  };
  destination?: {
    destinationId: string;
    destinationName: string;
    isActive: boolean;
    isApproved: boolean;
    approvalStatus: string;
    addedAt?: Date;
  }[];
  category?: {
    categoryId: string;
    categoryName: string;
    isActive: boolean;
    isApproved: boolean;
    approvalStatus: string;
    addedAt?: Date;
  }[];
  businessDescription: string;
  sellerType: string;
  isApproved: boolean;
  appliedAt: Date;
  approvedAt?: Date;
  rejectionReason?: string;
  rejectedAt?: Date;
  reapplicationCount?: number;
  documents?: any;
  contactPerson?: string;
  phone?: string;
  alternatePhone?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string | null;
  verified: boolean;
  avatar: string | null;
  sellerInfo?: SellerInfo | null;
  createdAt: Date;
  updatedAt: Date;
}
