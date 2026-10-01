import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { verify, JwtPayload } from 'jsonwebtoken';
import { config } from '../../config/config';
import { COOKIE_NAMES } from '../../utils/cookieUtils';
import { sendSuccess, sendPaginatedResponse, HTTP_STATUS } from '../../utils/apiResponse';
import { ConversationService, RequesterUser } from './conversationService';

/**
 * The contact/enquiry form works for guests too, so this route doesn't sit
 * behind `authenticate` — but a logged-in visitor should still be recorded
 * as themselves rather than a guest. Best-effort: any decode failure just
 * means "treat as guest", never a 401.
 */
function getOptionalRequester(req: Request): RequesterUser | undefined {
  const token = req.cookies?.[COOKIE_NAMES.AUTH_TOKEN];
  if (!token) return undefined;
  try {
    const decoded = verify(token, config.jwtSecret) as JwtPayload & { roles?: unknown };
    if (!decoded?.sub) return undefined;
    const roles = Array.isArray(decoded.roles) ? decoded.roles.map(String) : decoded.roles ? [String(decoded.roles)] : [];
    return { id: decoded.sub as string, roles };
  } catch {
    return undefined;
  }
}

const requireUser = (req: Request): RequesterUser => {
  if (!req.user) throw createHttpError(401, 'Authentication required');
  return { id: req.user.id, roles: req.user.roles };
};

export const createConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, subject, message, guestName, guestEmail, tourId } = req.body ?? {};
    if (type !== 'contact' && type !== 'enquiry') return next(createHttpError(400, "type must be 'contact' or 'enquiry'"));
    if (!subject?.trim() || !message?.trim()) return next(createHttpError(400, 'subject and message are required'));
    if (type === 'enquiry' && !tourId) return next(createHttpError(400, 'tourId is required for a tour enquiry'));

    const requester = getOptionalRequester(req);
    if (!requester && (!guestName?.trim() || !guestEmail?.trim())) {
      return next(createHttpError(400, 'guestName and guestEmail are required when not signed in'));
    }

    const conversation = await ConversationService.create({
      type,
      subject: subject.trim(),
      message: message.trim(),
      tourId,
      guestName: guestName?.trim(),
      guestEmail: guestEmail?.trim(),
      fromUserId: requester?.id,
    });
    sendSuccess(res, conversation, 'Conversation created', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const createBroadcast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    const { subject, message, broadcastAudience, allowParticipantReplies, groupName } = req.body ?? {};
    if (!subject?.trim() || !message?.trim()) return next(createHttpError(400, 'subject and message are required'));
    if (!['sellers', 'users', 'all'].includes(broadcastAudience)) return next(createHttpError(400, "broadcastAudience must be 'sellers', 'users', or 'all'"));

    const conversation = await ConversationService.createBroadcast(requester, {
      subject: subject.trim(),
      message: message.trim(),
      broadcastAudience,
      allowParticipantReplies,
      groupName,
    });
    sendSuccess(res, conversation, 'Broadcast sent', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const createDirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    const { targetUserId, subject, message } = req.body ?? {};
    if (!targetUserId) return next(createHttpError(400, 'targetUserId is required'));
    if (!subject?.trim() || !message?.trim()) return next(createHttpError(400, 'subject and message are required'));

    const conversation = await ConversationService.createDirect(requester, { targetUserId, subject: subject.trim(), message: message.trim() });
    sendSuccess(res, conversation, 'Message sent', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const createGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    const { subject, message, participantIds, groupName } = req.body ?? {};
    if (!subject?.trim() || !message?.trim()) return next(createHttpError(400, 'subject and message are required'));
    if (!Array.isArray(participantIds) || participantIds.length === 0) return next(createHttpError(400, 'participantIds must be a non-empty array'));

    const conversation = await ConversationService.createGroup(requester, {
      subject: subject.trim(),
      message: message.trim(),
      participantIds,
      groupName,
    });
    sendSuccess(res, conversation, 'Group conversation created', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const listConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const result = await ConversationService.list(requester, { page, limit, status });
    sendPaginatedResponse(res, result.items, { page: result.page, limit: result.limit, totalItems: result.totalItems, totalPages: result.totalPages }, 'Conversations retrieved');
  } catch (err) {
    next(err);
  }
};

export const getConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    const conversation = await ConversationService.getById(req.params.id, requester);
    sendSuccess(res, conversation, 'Conversation retrieved');
  } catch (err) {
    next(err);
  }
};

export const getConversationPeople = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    sendSuccess(res, await ConversationService.people(req.params.id, requester), 'Conversation people retrieved');
  } catch (err) {
    next(err);
  }
};

export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    const result = await ConversationService.getMessages(req.params.id, requester);
    sendSuccess(res, result, 'Messages retrieved');
  } catch (err) {
    next(err);
  }
};

export const sendConversationMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    const { content } = req.body ?? {};
    if (!content?.trim()) return next(createHttpError(400, 'content is required'));

    const messages = await ConversationService.sendMessage(req.params.id, requester, content.trim());
    sendSuccess(res, messages, 'Reply sent', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

export const markConversationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ConversationService.markRead(req.params.id, requireUser(req));
    sendSuccess(res, null, 'Marked as read');
  } catch (err) {
    next(err);
  }
};

export const assignConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body ?? {};
    if (!userId) return next(createHttpError(400, 'userId is required'));

    const conversation = await ConversationService.assign(req.params.id, userId);
    sendSuccess(res, conversation, 'Conversation assigned');
  } catch (err) {
    next(err);
  }
};

/** Admin-only: loop one or more additional people into an existing conversation. */
export const addConversationParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userIds } = req.body ?? {};
    if (!Array.isArray(userIds) || userIds.length === 0) return next(createHttpError(400, 'userIds must be a non-empty array'));

    const conversation = await ConversationService.addParticipantsToConversation(req.params.id, userIds);
    sendSuccess(res, conversation, 'Participants added');
  } catch (err) {
    next(err);
  }
};

export const archiveConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = requireUser(req);
    await ConversationService.archive(req.params.id, requester);
    sendSuccess(res, null, 'Conversation archived');
  } catch (err) {
    next(err);
  }
};

export const deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ConversationService.remove(req.params.id);
    sendSuccess(res, null, 'Conversation deleted');
  } catch (err) {
    next(err);
  }
};
