/**
 * Tour-specific response messages
 */
export const RESPONSE_MESSAGES = {
  // Success messages
  TOUR_CREATED: 'Tour created successfully',
  TOUR_UPDATED: 'Tour updated successfully',
  TOUR_DELETED: 'Tour deleted successfully',
  TOUR_RETRIEVED: 'Tour retrieved successfully',
  TOURS_RETRIEVED: 'Tours retrieved successfully',
  VIEW_INCREMENTED: 'Tour view count incremented',
  BOOKING_INCREMENTED: 'Tour booking count incremented',

  // Error messages
  TOUR_NOT_FOUND: 'Tour not found',
  INVALID_TOUR_ID: 'Invalid tour ID',
  UNAUTHORIZED: 'Unauthorized to perform this action',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error',
  FAILED_TO_CREATE: 'Failed to create tour',
  FAILED_TO_UPDATE: 'Failed to update tour',
  FAILED_TO_DELETE: 'Failed to delete tour',
  FAILED_TO_RETRIEVE: 'Failed to retrieve tour(s)',
  FAILED_TO_SEARCH: 'Failed to search tours'
} as const;

