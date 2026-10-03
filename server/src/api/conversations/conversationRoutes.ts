import express from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authenticate';
import {
  createConversation,
  createBroadcast,
  createDirect,
  createGroup,
  listConversations,
  getConversation,
  getConversationMessages,
  getConversationPeople,
  sendConversationMessage,
  markConversationRead,
  assignConversation,
  addConversationParticipants,
  archiveConversation,
  deleteConversation,
} from './conversationController';
import { requireHuman } from '../../middlewares/turnstile';

const conversationRouter = express.Router();

// Contact form / tour enquiry — works with or without a session (see
// getOptionalRequester in the controller); must stay ahead of `authenticate`.
conversationRouter.post('/', requireHuman({ skipIfSignedIn: true }), createConversation);

conversationRouter.use(authenticate);

conversationRouter.post('/broadcast', authorizeRoles('admin'), createBroadcast);
conversationRouter.post('/direct', authorizeRoles('admin'), createDirect);
conversationRouter.post('/group', authorizeRoles('admin'), createGroup);

conversationRouter.get('/', listConversations);
conversationRouter.get('/:id', getConversation);
conversationRouter.get('/:id/people', getConversationPeople);
conversationRouter.get('/:id/messages', getConversationMessages);
conversationRouter.post('/:id/messages', sendConversationMessage);
conversationRouter.post('/:id/read', markConversationRead);
conversationRouter.patch('/:id/assign', authorizeRoles('admin'), assignConversation);
// Only admin can ever add someone to a conversation, whether that's the
// primary assignee above or an additional participant here.
conversationRouter.post('/:id/participants', authorizeRoles('admin'), addConversationParticipants);
conversationRouter.patch('/:id/archive', archiveConversation);
conversationRouter.delete('/:id', authorizeRoles('admin'), deleteConversation);

export default conversationRouter;
