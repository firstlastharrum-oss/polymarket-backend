import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConnectionService } from 'src/connection/connection.service';


@Injectable()
export class NotificationService {
  constructor(private connectionService: ConnectionService) {}

  async createNotification(user_id: number, type: string, payload: any) {
    try {
      return await this.connectionService.notification.create({
        data: {
          user_id,
          type,
          payload: JSON.stringify(payload),
        },
      });
    } catch (err) {
      console.error('Error creating notification:', err.message);
      throw new InternalServerErrorException('Failed to create notification');
    }
  }

  async getUserNotifications(user_id: number) {
    return this.connectionService.notification.findMany({
      where: { user_id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: number) {
    return this.connectionService.notification.update({
      where: { id },
      data: { read: true },
    });
  }
}
