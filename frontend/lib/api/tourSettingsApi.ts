import { api, serverApi, handleApiError, createFormData, extractResponseData } from './apiClient';
// ============================================
// TYPES
// ============================================

export interface PricingOption {
  name: string;
  category: 'adult' | 'child' | 'senior' | 'student' | 'custom';
  customCategory?: string;
  basePrice?: number;
  discountEnabled: boolean;
  discount?: {
    type: 'percentage' | 'price';
    value: number;
    dateRange?: {
      from: Date;
      to: Date;
    };
  };
  paxRange: {
    min: number;
    max: number;
  };
  isActive: boolean;
}

export interface PricingOptionPreset {
  id: string;
  _id: string;
  userId: string;
  name: string;
  options: PricingOption[];
  tags?: string[];
  presetType?: string;
  systemPreset?: boolean;
  isArchived?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatePreset {
  id: string;
  _id: string;
  userId: string;
  name: string;
  type: 'flexible' | 'fixed' | 'multiple';
  config: any;
  recurrence?: {
    enabled: boolean;
    pattern?: string;
  };
  defaultSelectedPricingOptions?: string[];
  tags?: string[];
  presetType?: string;
  systemPreset?: boolean;
  isArchived?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaxPreset {
  id: string;
  _id: string;
  userId: string;
  name: string;
  minSize: number;
  maxSize: number;
  pricePerPerson: boolean;
  groupSize?: number;
  defaultPricingOptionId?: string;
  tags?: string[];
  presetType?: string;
  systemPreset?: boolean;
  isArchived?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiscountPreset {
  id: string;
  _id: string;
  userId: string;
  name: string;
  type: 'percentage' | 'price';
  value: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
  timezone?: string;
  tags?: string[];
  presetType?: string;
  systemPreset?: boolean;
  isArchived?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentPreset {
  id: string;
  _id: string;
  userId: string;
  name: string;
  description?: string;
  tags?: string[];
  contentType: 'description' | 'include' | 'exclude' | 'outline';
  content: string | Record<string, unknown>;
  presetType?: string;
  systemPreset?: boolean;
  isArchived?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItineraryPreset {
  id: string;
  _id: string;
  userId: string;
  name: string;
  description?: string;
  tags?: string[];
  days: number;
  nights: number;
  itinerary: Array<{
    day: string;
    title: string;
    description?: string;
    destinationId?: string;
  }>;
  outline?: Record<string, unknown>;
  presetType?: string;
  systemPreset?: boolean;
  isArchived?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TourTemplatePreset {
  id: string;
  _id: string;
  userId: string;
  name: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  defaultCategoryId?: string;
  defaultDestinationId?: string;
  pricingPresetId?: string;
  discountPresetId?: string;
  paxPresetId?: string;
  datePresetId?: string;
  itineraryPresetId?: string;
  descriptionPresetId?: string;
  includePresetId?: string;
  excludePresetId?: string;
  defaultFactIds?: string[];
  defaultFaqIds?: string[];
  defaultGalleryIds?: string[];
  tourDefaults?: {
    tourStatus?: string;
    enquiry?: boolean;
    isSpecialOffer?: boolean;
    pricePerPerson?: boolean;
  };
  presetType?: string;
  systemPreset?: boolean;
  isArchived?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserTourSettings {
  id: string;
  _id: string;
  userId: string;
  preferences: {
    defaultPricingPresetId?: string;
    defaultDatePresetId?: string;
    defaultPaxPresetId?: string;
    defaultDiscountPresetId?: string;
    autoApplyDefaults?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// USER TOUR SETTINGS (MAIN)
// ============================================

export const getUserTourSettings = async (userId: string): Promise<UserTourSettings> => {
  const response = await api.get(`/users/${userId}/tour-settings`);
  return response.data.data || response.data;
};

export const updatePreferences = async (
  userId: string,
  preferences: Partial<UserTourSettings['preferences']>
): Promise<UserTourSettings> => {
  const response = await api.patch(`/users/${userId}/tour-settings/preferences`, preferences);
  return response.data.data || response.data;
};

// ============================================
// PRICING OPTION PRESETS
// ============================================

export const getPricingPresets = async (userId: string): Promise<PricingOptionPreset[]> => {
  const response = await api.get(`/users/${userId}/tour-settings/pricing-presets`);
  return response.data.data || response.data;
};

export const createPricingPreset = async (
  userId: string,
  data: Partial<PricingOptionPreset>
): Promise<PricingOptionPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/pricing-presets`, data);
  return response.data.data || response.data;
};

export const getPricingPresetById = async (
  userId: string,
  presetId: string
): Promise<PricingOptionPreset> => {
  const response = await api.get(`/users/${userId}/tour-settings/pricing-presets/${presetId}`);
  return response.data.data || response.data;
};

export const updatePricingPreset = async (
  userId: string,
  presetId: string,
  data: Partial<PricingOptionPreset>
): Promise<PricingOptionPreset> => {
  const response = await api.put(`/users/${userId}/tour-settings/pricing-presets/${presetId}`, data);
  return response.data.data || response.data;
};

export const deletePricingPreset = async (userId: string, presetId: string): Promise<void> => {
  await api.delete(`/users/${userId}/tour-settings/pricing-presets/${presetId}`);
};

export const duplicatePricingPreset = async (
  userId: string,
  presetId: string
): Promise<PricingOptionPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/pricing-presets/${presetId}/duplicate`);
  return response.data.data || response.data;
};

// ============================================
// DATE PRESETS
// ============================================

export const getDatePresets = async (userId: string): Promise<DatePreset[]> => {
  const response = await api.get(`/users/${userId}/tour-settings/date-presets`);
  return response.data.data || response.data;
};

export const createDatePreset = async (
  userId: string,
  data: Partial<DatePreset>
): Promise<DatePreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/date-presets`, data);
  return response.data.data || response.data;
};

export const getDatePresetById = async (
  userId: string,
  presetId: string
): Promise<DatePreset> => {
  const response = await api.get(`/users/${userId}/tour-settings/date-presets/${presetId}`);
  return response.data.data || response.data;
};

export const updateDatePreset = async (
  userId: string,
  presetId: string,
  data: Partial<DatePreset>
): Promise<DatePreset> => {
  const response = await api.put(`/users/${userId}/tour-settings/date-presets/${presetId}`, data);
  return response.data.data || response.data;
};

export const deleteDatePreset = async (userId: string, presetId: string): Promise<void> => {
  await api.delete(`/users/${userId}/tour-settings/date-presets/${presetId}`);
};

export const duplicateDatePreset = async (
  userId: string,
  presetId: string
): Promise<DatePreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/date-presets/${presetId}/duplicate`);
  return response.data.data || response.data;
};

export const applyDatePreset = async (
  userId: string,
  presetId: string
): Promise<{ tourDates: unknown }> => {
  const response = await api.post(`/users/${userId}/tour-settings/date-presets/${presetId}/apply`);
  return response.data.data || response.data;
};

// ============================================
// PAX PRESETS
// ============================================

export const getPaxPresets = async (userId: string): Promise<PaxPreset[]> => {
  const response = await api.get(`/users/${userId}/tour-settings/pax-presets`);
  return response.data.data || response.data;
};

export const createPaxPreset = async (
  userId: string,
  data: Partial<PaxPreset>
): Promise<PaxPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/pax-presets`, data);
  return response.data.data || response.data;
};

export const getPaxPresetById = async (
  userId: string,
  presetId: string
): Promise<PaxPreset> => {
  const response = await api.get(`/users/${userId}/tour-settings/pax-presets/${presetId}`);
  return response.data.data || response.data;
};

export const updatePaxPreset = async (
  userId: string,
  presetId: string,
  data: Partial<PaxPreset>
): Promise<PaxPreset> => {
  const response = await api.put(`/users/${userId}/tour-settings/pax-presets/${presetId}`, data);
  return response.data.data || response.data;
};

export const deletePaxPreset = async (userId: string, presetId: string): Promise<void> => {
  await api.delete(`/users/${userId}/tour-settings/pax-presets/${presetId}`);
};

export const duplicatePaxPreset = async (
  userId: string,
  presetId: string
): Promise<PaxPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/pax-presets/${presetId}/duplicate`);
  return response.data.data || response.data;
};

export const applyPaxPreset = async (
  userId: string,
  presetId: string
): Promise<{ minSize: number; maxSize: number; pricePerPerson: boolean; groupSize?: number }> => {
  const response = await api.post(`/users/${userId}/tour-settings/pax-presets/${presetId}/apply`);
  return response.data.data || response.data;
};

// ============================================
// DISCOUNT PRESETS
// ============================================

export const getDiscountPresets = async (userId: string): Promise<DiscountPreset[]> => {
  const response = await api.get(`/users/${userId}/tour-settings/discount-presets`);
  return response.data.data || response.data;
};

export const createDiscountPreset = async (
  userId: string,
  data: Partial<DiscountPreset>
): Promise<DiscountPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/discount-presets`, data);
  return response.data.data || response.data;
};

export const getDiscountPresetById = async (
  userId: string,
  presetId: string
): Promise<DiscountPreset> => {
  const response = await api.get(`/users/${userId}/tour-settings/discount-presets/${presetId}`);
  return response.data.data || response.data;
};

export const updateDiscountPreset = async (
  userId: string,
  presetId: string,
  data: Partial<DiscountPreset>
): Promise<DiscountPreset> => {
  const response = await api.put(`/users/${userId}/tour-settings/discount-presets/${presetId}`, data);
  return response.data.data || response.data;
};

export const deleteDiscountPreset = async (userId: string, presetId: string): Promise<void> => {
  await api.delete(`/users/${userId}/tour-settings/discount-presets/${presetId}`);
};

export const duplicateDiscountPreset = async (
  userId: string,
  presetId: string
): Promise<DiscountPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/discount-presets/${presetId}/duplicate`);
  return response.data.data || response.data;
};

export const applyDiscountPreset = async (
  userId: string,
  presetId: string,
  options?: { dateRange?: { from: string; to: string } }
): Promise<{ type: string; value: number; dateRange?: { from: string; to: string }; discountEnabled?: boolean }> => {
  const response = await api.post(`/users/${userId}/tour-settings/discount-presets/${presetId}/apply`, options ?? {});
  const data = response.data.data || response.data;
  return { discountEnabled: true, ...data };
};

// ============================================
// CONTENT PRESETS
// ============================================

export const getContentPresets = async (userId: string): Promise<ContentPreset[]> => {
  const response = await api.get(`/users/${userId}/tour-settings/content-presets`);
  return response.data.data || response.data;
};

export const createContentPreset = async (
  userId: string,
  data: Partial<ContentPreset>
): Promise<ContentPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/content-presets`, data);
  return response.data.data || response.data;
};

export const getContentPresetById = async (
  userId: string,
  presetId: string
): Promise<ContentPreset> => {
  const response = await api.get(`/users/${userId}/tour-settings/content-presets/${presetId}`);
  return response.data.data || response.data;
};

export const updateContentPreset = async (
  userId: string,
  presetId: string,
  data: Partial<ContentPreset>
): Promise<ContentPreset> => {
  const response = await api.put(`/users/${userId}/tour-settings/content-presets/${presetId}`, data);
  return response.data.data || response.data;
};

export const deleteContentPreset = async (userId: string, presetId: string): Promise<void> => {
  await api.delete(`/users/${userId}/tour-settings/content-presets/${presetId}`);
};

export const duplicateContentPreset = async (
  userId: string,
  presetId: string
): Promise<ContentPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/content-presets/${presetId}/duplicate`);
  return response.data.data || response.data;
};

// ============================================
// ITINERARY PRESETS
// ============================================

export const getItineraryPresets = async (userId: string): Promise<ItineraryPreset[]> => {
  const response = await api.get(`/users/${userId}/tour-settings/itinerary-presets`);
  return response.data.data || response.data;
};

export const createItineraryPreset = async (
  userId: string,
  data: Partial<ItineraryPreset>
): Promise<ItineraryPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/itinerary-presets`, data);
  return response.data.data || response.data;
};

export const getItineraryPresetById = async (
  userId: string,
  presetId: string
): Promise<ItineraryPreset> => {
  const response = await api.get(`/users/${userId}/tour-settings/itinerary-presets/${presetId}`);
  return response.data.data || response.data;
};

export const updateItineraryPreset = async (
  userId: string,
  presetId: string,
  data: Partial<ItineraryPreset>
): Promise<ItineraryPreset> => {
  const response = await api.put(`/users/${userId}/tour-settings/itinerary-presets/${presetId}`, data);
  return response.data.data || response.data;
};

export const deleteItineraryPreset = async (userId: string, presetId: string): Promise<void> => {
  await api.delete(`/users/${userId}/tour-settings/itinerary-presets/${presetId}`);
};

export const duplicateItineraryPreset = async (
  userId: string,
  presetId: string
): Promise<ItineraryPreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/itinerary-presets/${presetId}/duplicate`);
  return response.data.data || response.data;
};

// ============================================
// TOUR TEMPLATE PRESETS
// ============================================

export const getTourTemplatePresets = async (userId: string): Promise<TourTemplatePreset[]> => {
  const response = await api.get(`/users/${userId}/tour-settings/tour-template-presets`);
  return response.data.data || response.data;
};

export const createTourTemplatePreset = async (
  userId: string,
  data: Partial<TourTemplatePreset>
): Promise<TourTemplatePreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/tour-template-presets`, data);
  return response.data.data || response.data;
};

export const getTourTemplatePresetById = async (
  userId: string,
  presetId: string
): Promise<TourTemplatePreset> => {
  const response = await api.get(`/users/${userId}/tour-settings/tour-template-presets/${presetId}`);
  return response.data.data || response.data;
};

export const updateTourTemplatePreset = async (
  userId: string,
  presetId: string,
  data: Partial<TourTemplatePreset>
): Promise<TourTemplatePreset> => {
  const response = await api.put(`/users/${userId}/tour-settings/tour-template-presets/${presetId}`, data);
  return response.data.data || response.data;
};

export const deleteTourTemplatePreset = async (userId: string, presetId: string): Promise<void> => {
  await api.delete(`/users/${userId}/tour-settings/tour-template-presets/${presetId}`);
};

export const duplicateTourTemplatePreset = async (
  userId: string,
  presetId: string
): Promise<TourTemplatePreset> => {
  const response = await api.post(`/users/${userId}/tour-settings/tour-template-presets/${presetId}/duplicate`);
  return response.data.data || response.data;
};

// ============================================
// APPLY PRESETS (for use when creating/editing tours)
// ============================================

/** Apply pricing preset - returns options to merge into tour form */
export const applyPricingPreset = async (
  userId: string,
  presetId: string
): Promise<{ pricingOptions: unknown[]; pricingOptionsEnabled: boolean }> => {
  const response = await api.post(`/users/${userId}/tour-settings/pricing-presets/${presetId}/apply`);
  const data = response.data.data || response.data;
  return {
    pricingOptions: data?.pricingOptions ?? [],
    pricingOptionsEnabled: data?.pricingOptionsEnabled ?? true,
  };
};

/** Apply content preset - returns { description?, include?, exclude?, outline? } */
export const applyContentPreset = async (
  userId: string,
  presetId: string
): Promise<Record<string, unknown>> => {
  const response = await api.post(`/users/${userId}/tour-settings/content-presets/${presetId}/apply`);
  return response.data.data || response.data || {};
};

/** Apply itinerary preset - returns { itinerary, outline? } */
export const applyItineraryPreset = async (
  userId: string,
  presetId: string
): Promise<{ itinerary: Array<{ day: string; title: string; description?: string }>; outline?: unknown }> => {
  const response = await api.post(`/users/${userId}/tour-settings/itinerary-presets/${presetId}/apply`);
  const data = response.data.data || response.data;
  return {
    itinerary: data?.itinerary ?? [],
    outline: data?.outline,
  };
};

/** Apply tour template preset - returns linked preset IDs and defaults (frontend then applies each preset) */
export const applyTourTemplatePreset = async (
  userId: string,
  presetId: string
): Promise<{
  pricingPresetId?: string;
  datePresetId?: string;
  paxPresetId?: string;
  discountPresetId?: string;
  itineraryPresetId?: string;
  descriptionPresetId?: string;
  includePresetId?: string;
  excludePresetId?: string;
  defaultCategoryId?: string;
  defaultDestinationId?: string;
  tourDefaults?: Record<string, unknown>;
}> => {
  const response = await api.post(`/users/${userId}/tour-settings/tour-template-presets/${presetId}/apply`);
  const data = response.data.data || response.data;
  const out: Record<string, unknown> = { ...data };
  const toStr = (v: unknown) => (v != null ? String(v) : undefined);
  return {
    pricingPresetId: toStr(data?.pricingPresetId),
    datePresetId: toStr(data?.datePresetId),
    paxPresetId: toStr(data?.paxPresetId),
    discountPresetId: toStr(data?.discountPresetId),
    itineraryPresetId: toStr(data?.itineraryPresetId),
    descriptionPresetId: toStr(data?.descriptionPresetId),
    includePresetId: toStr(data?.includePresetId),
    excludePresetId: toStr(data?.excludePresetId),
    defaultCategoryId: toStr(data?.defaultCategoryId),
    defaultDestinationId: toStr(data?.defaultDestinationId),
    tourDefaults: data?.tourDefaults as Record<string, unknown> | undefined,
  };
};
