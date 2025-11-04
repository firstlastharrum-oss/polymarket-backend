import { ConnectionService } from 'src/connection/connection.service';
export declare class NotificationService {
    private connectionService;
    constructor(connectionService: ConnectionService);
    createNotification(user_id: number, type: string, payload: any): Promise<{
        id: number;
        createdAt: Date;
        type: string;
        payload: string;
        read: boolean;
        user_id: number;
    }>;
    getUserNotifications(user_id: number): Promise<{
        id: number;
        createdAt: Date;
        type: string;
        payload: string;
        read: boolean;
        user_id: number;
    }[]>;
    markAsRead(id: number): Promise<{
        id: number;
        createdAt: Date;
        type: string;
        payload: string;
        read: boolean;
        user_id: number;
    }>;
}
