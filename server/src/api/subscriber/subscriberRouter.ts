import express from "express";
import { newSubscriber, unsubscribe, getAllSubscribers } from "./subscriberController";

const subscriberRouter = express.Router();

//routes


subscriberRouter.get('/',getAllSubscribers);
subscriberRouter.post('/add',newSubscriber);
subscriberRouter.post('/remove',unsubscribe);




export default subscriberRouter;