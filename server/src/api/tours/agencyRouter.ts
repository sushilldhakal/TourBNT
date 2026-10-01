import express from 'express';
import { cacheRoute } from '../../middlewares/cacheMiddleware';
import { sendSuccess, sendError, HTTP_STATUS } from '../../utils/apiResponse';
import { getAgencyWithTours, listAgencies } from './services/tourBusinessService';

const agencyRouter = express.Router();

// Public directory of tour agencies that currently run at least one published tour.
agencyRouter.get('/', cacheRoute('agencies-list', 60), async (req, res) => {
  const page = Math.max(parseInt(String(req.query.page)) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 24, 1), 60);
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  try {
    return sendSuccess(res, await listAgencies({ page, limit, search }), 'Agencies retrieved successfully');
  } catch (err: any) {
    return sendError(res, err?.message ?? 'Could not load agencies', err?.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// One agency: its details and its active (published) tours.
agencyRouter.get('/:agencyId', cacheRoute('agency-detail', 60), async (req, res) => {
  try {
    return sendSuccess(res, await getAgencyWithTours(req.params.agencyId), 'Agency retrieved successfully');
  } catch (err: any) {
    return sendError(res, err?.message ?? 'Could not load agency', err?.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

export default agencyRouter;
