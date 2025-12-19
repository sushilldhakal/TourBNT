// src/hooks/useCategories.ts
import { api } from '@/lib/api';
import { getSellerCategories, getUserCategories } from '@/lib/api/categories';
import { useAuth } from '@/lib/hooks/useAuth';
import { CategoryData } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { isAdmin } from '@/lib/utils/roles'; // Add this import

// Extended interface for backend category data
interface BackendCategoryData {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  slug: string;
  isActive: boolean;
  isApproved: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  usageCount: number;
  createdBy: string;
  submittedAt: string;
  popularity: number;
  reason?: string; // Add this field
}

// Hook for admin users - shows all categories
export const useCategories = () => {
  return useQuery<CategoryData[]>({
    queryKey: ['seller-categories'],
    queryFn: async () => {
      console.log('🔍 Fetching seller categories...');
      const response = await getSellerCategories();
      console.log('📦 Seller categories response:', response);
      
      // Check if response is already an array (direct API response)
      if (Array.isArray(response)) {
        // Transform backend data to match frontend CategoryData interface
        const transformed = response.map((category: BackendCategoryData): CategoryData => ({
          _id: category._id,
          id: category._id, // Use _id as id for compatibility
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl || '',
          isActive: category.isActive,
          isApproved: category.isApproved,
          approvalStatus: category.approvalStatus,
          userId: category.createdBy
        }));
        console.log('✅ Transformed categories:', transformed);
        return transformed;
      }
      
      // Handle wrapped response format (if server returns { success, data })
      if (response.success && Array.isArray(response.data)) {
        const transformed = response.data.map((category: BackendCategoryData): CategoryData => ({
          _id: category._id,
          id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl || '',
          isActive: category.isActive,
          isApproved: category.isApproved,
          approvalStatus: category.approvalStatus,
          userId: category.createdBy
        }));
        console.log('✅ Transformed categories:', transformed);
        return transformed;
      }
      
      console.log('⚠️ No success in response, returning empty array');
      return [];
    },
    enabled: true,
  });
};

// Hook for regular users - shows user-specific categories with their personal status
export const useUserCategories = () => {
  return useQuery<CategoryData[]>({
    queryKey: ['user-categories'],
    queryFn: async () => {
      const response = await getUserCategories();
      console.log('📦 User categories response:', response);
      
      // Check if response is already an array (direct API response)
      if (Array.isArray(response)) {
        // Transform backend data to match frontend CategoryData interface
        const transformed = response.map((category: BackendCategoryData): CategoryData => ({
          _id: category._id,
          id: category._id, // Use _id as id for compatibility
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl || '',
          isActive: category.isActive, // This is user-specific status
          isApproved: category.isApproved, // This is user-specific status
          approvalStatus: category.approvalStatus, // This is user-specific status
          userId: category.createdBy
        }));
        console.log('✅ Transformed user categories:', transformed);
        return transformed;
      }
      
      // Handle wrapped response format (if server returns { success, data })
      if (response.success && Array.isArray(response.data)) {
        return response.data.map((category: BackendCategoryData): CategoryData => ({
          _id: category._id,
          id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl || '',
          isActive: category.isActive,
          isApproved: category.isApproved,
          approvalStatus: category.approvalStatus,
          userId: category.createdBy
        }));
      }
      
      console.log('⚠️ No valid data in response, returning empty array');
      return [];
    },
    enabled: true,
  });
};

// Hook for pending categories (admin only)
export const usePendingCategories = () => {
  return useQuery<CategoryData[]>({
    queryKey: ['pending-categories'],
    queryFn: async () => {
      const response = await api.get('/api/global/categories/admin/pending');
      console.log('📦 Pending categories response:', response);
      
      // Check if response is already an array (direct API response)
      if (Array.isArray(response.data)) {
        // Transform backend data to match frontend CategoryData interface
        const transformed = response.data.map((category: BackendCategoryData): CategoryData => ({
          _id: category._id,
          id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl || '',
          isActive: category.isActive,
          isApproved: category.isApproved,
          approvalStatus: category.approvalStatus,
          userId: category.createdBy,
          reason: category.reason, // Add this field
        }));
        console.log('✅ Transformed pending categories:', transformed);
        return transformed;
      }
      
      // Handle wrapped response format (if server returns { success, data })
      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data.map((category: BackendCategoryData): CategoryData => ({
          _id: category._id,
          id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl || '',
          isActive: category.isActive,
          isApproved: category.isApproved,
          approvalStatus: category.approvalStatus,
          userId: category.createdBy,
          reason: category.reason, // Add this field
        }));
      }
      
      console.log('⚠️ No valid data in response, returning empty array');
      return [];
    },
    enabled: true,
  });
};

// Combined hook that automatically chooses the right data source based on user role
export const useCategoriesRoleBased = () => {
  const { user } = useAuth();
  // Use the isAdmin utility function instead of direct comparison
  const isAdminUser = isAdmin(user.roles);

  // Use admin categories for admin users, user-specific categories for others
  const adminCategories = useCategories();
  const userCategories = useUserCategories();

  return isAdminUser ? adminCategories : userCategories;
};

// Hook to get all approved categories for search functionality
export const useAllCategories = () => {
  return useQuery<CategoryData[]>({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const response = await api.get('/api/global/categories/seller/search'); // Get all approved categories
      if (response.data.success) {
        // Transform backend data to match frontend CategoryData interface
        return response.data.data.map((category: BackendCategoryData): CategoryData => ({
          _id: category._id,
          id: category._id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl || '',
          isActive: category.isActive,
          isApproved: category.isApproved,
          approvalStatus: category.approvalStatus,
          userId: category.createdBy
        }));
      }
      return [];
    },
    enabled: true,
  });
};
