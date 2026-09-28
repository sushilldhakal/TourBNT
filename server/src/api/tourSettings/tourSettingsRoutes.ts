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
  getDatePresets,
  createDatePreset,
  getDatePresetById,
  updateDatePreset,
  deleteDatePreset,
  duplicateDatePreset,
  applyDatePreset,
  getContentPresets,
  createContentPreset,
  getContentPresetById,
  updateContentPreset,
  deleteContentPreset,
  duplicateContentPreset,
  applyContentPreset,
  getItineraryPresets,
  createItineraryPreset,
  getItineraryPresetById,
  updateItineraryPreset,
  deleteItineraryPreset,
  duplicateItineraryPreset,
  applyItineraryPreset,
  getTourTemplatePresets,
  createTourTemplatePreset,
  getTourTemplatePresetById,
  updateTourTemplatePreset,
  deleteTourTemplatePreset,
  duplicateTourTemplatePreset,
  applyTourTemplatePreset,
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

// Date presets
tourSettingsRouter.get('/:userId/tour-settings/date-presets', getDatePresets);
tourSettingsRouter.post('/:userId/tour-settings/date-presets', createDatePreset);
tourSettingsRouter.get('/:userId/tour-settings/date-presets/:presetId', getDatePresetById);
tourSettingsRouter.put('/:userId/tour-settings/date-presets/:presetId', updateDatePreset);
tourSettingsRouter.delete('/:userId/tour-settings/date-presets/:presetId', deleteDatePreset);
tourSettingsRouter.post('/:userId/tour-settings/date-presets/:presetId/duplicate', duplicateDatePreset);
tourSettingsRouter.post('/:userId/tour-settings/date-presets/:presetId/apply', applyDatePreset);

// Content presets (description / include / exclude / outline)
tourSettingsRouter.get('/:userId/tour-settings/content-presets', getContentPresets);
tourSettingsRouter.post('/:userId/tour-settings/content-presets', createContentPreset);
tourSettingsRouter.get('/:userId/tour-settings/content-presets/:presetId', getContentPresetById);
tourSettingsRouter.put('/:userId/tour-settings/content-presets/:presetId', updateContentPreset);
tourSettingsRouter.delete('/:userId/tour-settings/content-presets/:presetId', deleteContentPreset);
tourSettingsRouter.post('/:userId/tour-settings/content-presets/:presetId/duplicate', duplicateContentPreset);
tourSettingsRouter.post('/:userId/tour-settings/content-presets/:presetId/apply', applyContentPreset);

// Itinerary presets
tourSettingsRouter.get('/:userId/tour-settings/itinerary-presets', getItineraryPresets);
tourSettingsRouter.post('/:userId/tour-settings/itinerary-presets', createItineraryPreset);
tourSettingsRouter.get('/:userId/tour-settings/itinerary-presets/:presetId', getItineraryPresetById);
tourSettingsRouter.put('/:userId/tour-settings/itinerary-presets/:presetId', updateItineraryPreset);
tourSettingsRouter.delete('/:userId/tour-settings/itinerary-presets/:presetId', deleteItineraryPreset);
tourSettingsRouter.post('/:userId/tour-settings/itinerary-presets/:presetId/duplicate', duplicateItineraryPreset);
tourSettingsRouter.post('/:userId/tour-settings/itinerary-presets/:presetId/apply', applyItineraryPreset);

// Tour template presets (bundles of the other preset types + defaults)
tourSettingsRouter.get('/:userId/tour-settings/tour-template-presets', getTourTemplatePresets);
tourSettingsRouter.post('/:userId/tour-settings/tour-template-presets', createTourTemplatePreset);
tourSettingsRouter.get('/:userId/tour-settings/tour-template-presets/:presetId', getTourTemplatePresetById);
tourSettingsRouter.put('/:userId/tour-settings/tour-template-presets/:presetId', updateTourTemplatePreset);
tourSettingsRouter.delete('/:userId/tour-settings/tour-template-presets/:presetId', deleteTourTemplatePreset);
tourSettingsRouter.post('/:userId/tour-settings/tour-template-presets/:presetId/duplicate', duplicateTourTemplatePreset);
tourSettingsRouter.post('/:userId/tour-settings/tour-template-presets/:presetId/apply', applyTourTemplatePreset);

export default tourSettingsRouter;
