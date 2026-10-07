import { Request, Response } from 'express';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { HTTP_STATUS, sendError, sendSuccess, sendValidationError } from '../../utils/apiResponse';
import { routeCompletion } from './aiRouter';
import { AI_OPTIONS, AIOption, buildMessages } from './prompts';
import { completeAIUsage, reserveAIUsage } from './aiUsageService';

const LIMIT_MESSAGES = {
    user_minute: 'You are sending AI requests too quickly. Please wait a moment and try again.',
    user_daily: 'You have reached your daily AI limit. It resets on a rolling 24-hour basis.',
    global_daily: 'AI assistance has reached its daily capacity. Please try again later.',
} as const;

/**
 * POST /api/v1/ai/generate  { prompt, option, command? }
 * Provider-agnostic: the editor never learns which model answered.
 */
export const generateAICompletion = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED, 'AUTH_ERROR');

    const { prompt, option, command } = req.body ?? {};
    if (typeof prompt !== 'string' || !prompt.trim()) {
        return sendValidationError(res, 'Invalid request', [{ field: 'prompt', message: 'Prompt is required' }]);
    }
    if (typeof option !== 'string' || !(AI_OPTIONS as readonly string[]).includes(option)) {
        return sendValidationError(res, 'Invalid request', [{ field: 'option', message: `Option must be one of: ${AI_OPTIONS.join(', ')}` }]);
    }
    if (command !== undefined && typeof command !== 'string') {
        return sendValidationError(res, 'Invalid request', [{ field: 'command', message: 'Command must be a string' }]);
    }
    if (option === 'zap' && !command?.trim()) {
        return sendValidationError(res, 'Invalid request', [{ field: 'command', message: 'Command is required for this option' }]);
    }
    const inputChars = prompt.length + (command?.length ?? 0);
    if (inputChars > config.ai.maxPromptChars) {
        return sendValidationError(res, 'Invalid request', [{ field: 'prompt', message: `Text is too long (max ${config.ai.maxPromptChars} characters)` }]);
    }

    const reservation = await reserveAIUsage(userId, option, inputChars);
    if (reservation.allowed === false) {
        res.setHeader('Retry-After', String(reservation.retryAfterSeconds));
        return sendError(res, LIMIT_MESSAGES[reservation.reason], HTTP_STATUS.TOO_MANY_REQUESTS, 'AI_USER_LIMIT_REACHED', {
            reason: reservation.reason,
            retryAfterSeconds: reservation.retryAfterSeconds,
        });
    }

    const started = Date.now();
    try {
        const result = await routeCompletion(buildMessages(option as AIOption, prompt, command));
        const latencyMs = Date.now() - started;

        if (!result.ok) {
            await completeAIUsage(reservation.logId, { status: 'all_providers_exhausted' }, result.attempts, latencyMs);
            logger.warn('[ai] all providers exhausted', { userId, attempts: result.attempts });
            return sendError(
                res,
                'AI assistance is temporarily unavailable because the free usage limit has been reached. Please try again later.',
                HTTP_STATUS.TOO_MANY_REQUESTS,
                'AI_LIMIT_REACHED',
            );
        }

        await completeAIUsage(
            reservation.logId,
            { status: 'success', provider: result.provider, model: result.model, completionChars: result.text.length },
            result.attempts,
            latencyMs,
        );
        return sendSuccess(res, { completion: result.text, remainingToday: Math.max(0, reservation.remainingToday - 1) });
    } catch (error) {
        // Unexpected (non-provider) failure — release the reservation so it doesn't count against the user.
        await completeAIUsage(reservation.logId, { status: 'provider_error' }, [], Date.now() - started).catch(() => undefined);
        throw error;
    }
};
