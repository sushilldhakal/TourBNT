import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { asyncAuthHandler } from '../../utils/routeWrapper';
import { sendSuccess } from '../../utils/apiResponse';
import { createPromo, deletePromo, listPromos, updatePromo, type Requester } from './promoService';

const router = express.Router();

const who = (req: express.Request): Requester => ({ id: req.user!.id, isAdmin: req.user!.roles.includes('admin') });

// Promo codes are managed by sellers (their own tours) and admins (platform-wide). Travellers use a code through
// POST /bookings/quote and POST /bookings, which validate it.
router.use(authenticate, authorizeRoles('admin', 'seller'));

router.get('/', asyncAuthHandler(async (req, res) => sendSuccess(res, await listPromos(who(req)), 'Promo codes retrieved')));
router.post('/', asyncAuthHandler(async (req, res) => sendSuccess(res, await createPromo(who(req), req.body ?? {}), 'Promo code created', 201)));
router.patch('/:id', asyncAuthHandler(async (req, res) => sendSuccess(res, await updatePromo(who(req), req.params.id, req.body ?? {}), 'Promo code updated')));
router.delete('/:id', asyncAuthHandler(async (req, res) => {
  await deletePromo(who(req), req.params.id);
  sendSuccess(res, { id: req.params.id }, 'Promo code deleted');
}));

export default router;
