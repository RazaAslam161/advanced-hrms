import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../common/types/http';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import { logger } from '../../common/utils/logger';
import { AssistantService } from './service';
import type { AssistantChatInput, AssistantUserContext } from './types';

export const chatWithAssistant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const reply = await AssistantService.chat(req.body as AssistantChatInput, {
    userId: req.user!.userId,
    email: req.user!.email,
    role: req.user!.role,
    permissions: req.user!.permissions,
  });

  res.json(sendSuccess('Assistant response generated successfully', reply));
});

export const streamWithAssistant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const input = req.body as AssistantChatInput;
  const user: AssistantUserContext = {
    userId: req.user!.userId,
    email: req.user!.email,
    role: req.user!.role,
    permissions: req.user!.permissions,
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  const meta = { role: user.role, portal: input.portal, pageLabel: input.pageLabel };

  try {
    const { metrics, intent, actions, suggestions } = await AssistantService.prepareContext(input, user);
    send({ type: 'start', context: { ...meta, metrics } });

    for await (const token of AssistantService.streamReply(input, user, metrics, intent, actions)) {
      send({ type: 'token', value: token });
    }

    send({ type: 'done', actions, suggestions, context: { ...meta, metrics } });
  } catch (error) {
    logger.error(`Assistant stream error: ${(error as Error).message}`);
    send({ type: 'error', message: 'The assistant could not complete this response. Please try again.' });
  } finally {
    res.end();
  }
};
