import express from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { asyncAuthHandler } from '../../utils/routeWrapper';
import { generateAICompletion } from './aiController';

const aiRouter = express.Router();

aiRouter.post('/generate', authenticate, asyncAuthHandler(generateAICompletion));

export default aiRouter;
