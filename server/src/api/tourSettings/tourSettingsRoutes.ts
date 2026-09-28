import express from 'express';
import { authenticate } from '../../middlewares/authenticate';
import {
  getPaxPresets,
  createPaxPreset,
  getPaxPresetById,
  updatePaxPreset,
  deletePaxPreset,
  duplicatePaxPreset,
  applyPaxPreset,
  getDiscountPresets,
  createDiscountPreset,
  getDiscountPresetById,
  updateDiscountPreset,
  deleteDiscountPreset,
  duplicateDiscountPreset,
  applyDiscountPreset,
  getPricingPresets,
  createPricingPreset,
  getPricingPresetById,
  updatePricingPreset,
  deletePricingPreset,
  duplicatePricingPreset,
  applyPricingPreset,
} from './tourSettingsController';

// Mounted at /api/v1/users, alongside userRouter — scoped under
// /:userId/tour-settings/* so it never collides with userRouter's own routes.
const tourSettingsRouter = express.Router();

tourSettingsRouter.use('/:userId/tour-settings', authenticate);

// Pax (group size) presets
tourSettingsRouter.get('/:userId/tour-settings/pax-presets', getPaxPresets);
tourSettingsRouter.post('/:userId/tour-settings/pax-presets', createPaxPreset);
tourSettingsRouter.get('/:userId/tour-settings/pax-presets/:presetId', getPaxPresetById);
tourSettingsRouter.put('/:userId/tour-settings/pax-presets/:presetId', updatePaxPreset);
tourSettingsRouter.delete('/:userId/tour-settings/pax-presets/:presetId', deletePaxPreset);
tourSettingsRouter.post('/:userId/tour-settings/pax-presets/:presetId/duplicate', duplicatePaxPreset);
tourSettingsRouter.post('/:userId/tour-settings/pax-presets/:presetId/apply', applyPaxPreset);

// Discount presets
tourSettingsRouter.get('/:userId/tour-settings/discount-presets', getDiscountPresets);
tourSettingsRouter.post('/:userId/tour-settings/discount-presets', createDiscountPreset);
tourSettingsRouter.get('/:userId/tour-settings/discount-presets/:presetId', getDiscountPresetById);
tourSettingsRouter.put('/:userId/tour-settings/discount-presets/:presetId', updateDiscountPreset);
tourSettingsRouter.delete('/:userId/tour-settings/discount-presets/:presetId', deleteDiscountPreset);
tourSettingsRouter.post('/:userId/tour-settings/discount-presets/:presetId/duplicate', duplicateDiscountPreset);
tourSettingsRouter.post('/:userId/tour-settings/discount-presets/:presetId/apply', applyDiscountPreset);

// Pricing option presets
tourSettingsRouter.get('/:userId/tour-settings/pricing-presets', getPricingPresets);
tourSettingsRouter.post('/:userId/tour-settings/pricing-presets', createPricingPreset);
tourSettingsRouter.get('/:userId/tour-settings/pricing-presets/:presetId', getPricingPresetById);
tourSettingsRouter.put('/:userId/tour-settings/pricing-presets/:presetId', updatePricingPreset);
tourSettingsRouter.delete('/:userId/tour-settings/pricing-presets/:presetId', deletePricingPreset);
tourSettingsRouter.post('/:userId/tour-settings/pricing-presets/:presetId/duplicate', duplicatePricingPreset);
tourSettingsRouter.post('/:userId/tour-settings/pricing-presets/:presetId/apply', applyPricingPreset);

export default tourSettingsRouter;
