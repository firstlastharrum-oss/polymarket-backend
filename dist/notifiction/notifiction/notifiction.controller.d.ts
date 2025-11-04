import { NotificationService } from './notifiction.service';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    create(body: {
        user_id: number;
        type: string;
        payload: any;
    }): Promise<{
        id: number;
        createdAt: Date;
        type: string;
        payload: string;
        read: boolean;
        user_id: number;
    }>;
    getByUser(user_id: string): Promise<{
        id: number;
        createdAt: Date;
        type: string;
        payload: string;
        read: boolean;
        user_id: number;
    }[]>;
    markRead(id: string): Promise<{
        id: number;
        createdAt: Date;
        type: string;
        payload: string;
        read: boolean;
        user_id: number;
    }>;
}
