import { MessageChannel } from '@prisma/client';

export interface SendMessagePayload {
  channel: MessageChannel;
  recipient: string;
  subject?: string;
  body: string;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface IMessageProvider {
  send(payload: SendMessagePayload): Promise<SendMessageResult>;
}

export const MESSAGE_PROVIDER = 'MESSAGE_PROVIDER';
