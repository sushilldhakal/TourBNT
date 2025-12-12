import express from "express";
import {generateCompletion, applyRateLimiting} from "./generate";
import { authenticate } from "../../middlewares/authenticate";

const generateRouter = express.Router();

//routes


generateRouter.post('/', authenticate,  applyRateLimiting, generateCompletion as any);




export default generateRouter;