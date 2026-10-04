import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import { withRowLevelSecurity } from '../../middlewares/rowLevelSecurity';
import { asyncAuthHandler } from '../../utils/routeWrapper';
import { sendSuccess } from '../../utils/apiResponse';
import { notifyPayoutPaid } from '../../services/emailService';
import {
  adminBalances,
  createPayout,
  deletePendingPayout,
  getDefaultCommissionRate,
  getPayoutStatement,
  listPayouts,
  markPayoutPaid,
  sellerSummary,
  setDefaultCommissionRate,
  setSellerCommissionRate,
} from '../../services/payouts';

const router = express.Router();
router.use(authenticate);
router.use(withRowLevelSecurity);

const who = (req: express.Request) => ({ id: req.user!.id, isAdmin: req.user!.roles.includes('admin') });

// ---- seller: my earnings ---------------------------------------------------
router.get('/me/summary', authorizeRoles('seller', 'admin'), asyncAuthHandler(async (req, res) => sendSuccess(res, await sellerSummary(req.user!.id), 'Earnings summary')));
router.get('/me', authorizeRoles('seller', 'admin'), asyncAuthHandler(async (req, res) => sendSuccess(res, await listPayouts({ sellerId: req.user!.id }), 'Payouts')));

// ---- admin ------------------------------------------------------------------
router.get('/admin/balances', authorizeRoles('admin'), asyncAuthHandler(async (_req, res) => sendSuccess(res, await adminBalances(), 'Seller balances')));
router.get('/admin/all', authorizeRoles('admin'), asyncAuthHandler(async (_req, res) => sendSuccess(res, await listPayouts(), 'All payouts')));
router.get('/admin/commission', authorizeRoles('admin'), asyncAuthHandler(async (_req, res) => sendSuccess(res, { defaultRate: await getDefaultCommissionRate() }, 'Commission settings')));
router.put('/admin/commission', authorizeRoles('admin'), asyncAuthHandler(async (req, res) => sendSuccess(res, { defaultRate: await setDefaultCommissionRate(req.body?.defaultRate) }, 'Default commission updated')));
router.put('/admin/sellers/:sellerId/commission', authorizeRoles('admin'), asyncAuthHandler(async (req, res) => sendSuccess(res, { rate: await setSellerCommissionRate(req.params.sellerId, req.body?.rate) }, 'Seller commission updated')));

router.post('/', authorizeRoles('admin'), asyncAuthHandler(async (req, res) => {
  if (!req.body?.sellerId) return res.status(400).json({ message: 'sellerId is required' });
  sendSuccess(res, await createPayout(req.user!.id, String(req.body.sellerId), req.body.notes), 'Payout created', 201);
}));
router.patch('/:id/pay', authorizeRoles('admin'), asyncAuthHandler(async (req, res) => {
  const payout = await markPayoutPaid(req.params.id, req.body?.reference);
  void notifyPayoutPaid(payout.id);
  sendSuccess(res, payout, 'Payout marked as paid');
}));
router.delete('/:id', authorizeRoles('admin'), asyncAuthHandler(async (req, res) => {
  await deletePendingPayout(req.params.id);
  sendSuccess(res, { id: req.params.id }, 'Payout deleted');
}));

// ---- statement (seller: own, admin: any) — keep after the fixed paths above -------
router.get('/:id', authorizeRoles('seller', 'admin'), asyncAuthHandler(async (req, res) => sendSuccess(res, await getPayoutStatement(req.params.id, who(req)), 'Payout statement')));

export default router;
