import { Injectable, Logger } from '@nestjs/common';
import { IMessageProvider, SendMessagePayload, SendMessageResult } from './message-provider.interface';

@Injectable()
export class MockMessageProvider implements IMessageProvider {
  private readonly logger = new Logger(MockMessageProvider.name);

  async send(payload: SendMessagePayload): Promise<SendMessageResult> {
    this.logger.log(
      `[DISPATCH ${payload.channel}] To: ${payload.recipient} | Subject: "${payload.subject || 'N/A'}" | Body: ${payload.body}`,
    );

    return {
      success: true,
      providerMessageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }
}
