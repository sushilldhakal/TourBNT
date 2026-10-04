/**
 * lib/queries – useQuery / useInfiniteQuery hooks
 * Single source of truth for React Query data fetching.
 * HTTP fetchers live in lib/api.
 */

export * from './queryKeys';
export { useCacheManager } from './cacheUtils';
export type { InvalidateDestinationsOptions, InvalidateCategoriesOptions } from './cacheUtils';
export * from './useDestinations';
export {
    categoryKeys,
    useUserCategories,
    useMyCategories,
    useMyActiveCategories,
    useMyFavoriteCategories,
    useMyCreatedCategories,
    useApprovedCategories,
    useSearchCategories,
    useAdminAllCategories,
    useAdminPendingCategories,
    useAllCategories,
    usePendingCategories,
    useCategoriesRoleBased,
    useCategoryById,
    useAllCategoriesForSelect,
    useToggleCategoryActive,
    useToggleCategoryFavorite,
    useAddCategory,
    useRemoveCategory,
    useCreateCategory,
    useUpdateCategory,
    useUpdateCategorySettings,
    useBulkUpdateCategories,
    useAdminApproveCategory,
    useAdminRejectCategory,
    useAdminDeleteCategory,
    useChangeRequests as useCategoryChangeRequests,
    useApproveChangeRequest as useApproveCategoryChangeRequest,
    useRejectChangeRequest as useRejectCategoryChangeRequest,
} from './useCategories';
export * from './useBooking';
export * from './useMedia';
export * from './useMediaUpdate';
export * from './usePosts';
export * from './useTours';
export * from './useUsers';
export * from './useComments';
export * from './usePresets';
export * from './useReviews';
export * from './useCompanyInfo';
export * from './useFaq';
export * from './useFacts';
export * from './useBusinessPartners';
export * from './useOperations';
