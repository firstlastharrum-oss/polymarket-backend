import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import { NotificationService } from './notifiction.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async create(@Body() body: { user_id: number; type: string; payload: any }) {
    return this.notificationService.createNotification(
      body.user_id,
      body.type,
      body.payload,
    );
  }

  @Get(':user_id')
  async getByUser(@Param('user_id') user_id: string) {
    return this.notificationService.getUserNotifications(Number(user_id));
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(Number(id));
  }
}
