import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MESSAGE_PROVIDER } from './providers/message-provider.interface';
import { MockMessageProvider } from './providers/mock-message.provider';

@Module({
  controllers: [MessagesController],
  providers: [
    MessagesService,
    {
      provide: MESSAGE_PROVIDER,
      useClass: MockMessageProvider,
    },
  ],
  exports: [MessagesService],
})
export class MessagesModule {}
