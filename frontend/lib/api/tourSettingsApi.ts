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

export interface UserTourSettings {
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
