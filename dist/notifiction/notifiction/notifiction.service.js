"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const connection_service_1 = require("../../src/connection/connection.service");
let NotificationService = class NotificationService {
    constructor(connectionService) {
        this.connectionService = connectionService;
    }
    async createNotification(user_id, type, payload) {
        try {
            return await this.connectionService.notification.create({
                data: {
                    user_id,
                    type,
                    payload: JSON.stringify(payload),
                },
            });
        }
        catch (err) {
            console.error('Error creating notification:', err.message);
            throw new common_1.InternalServerErrorException('Failed to create notification');
        }
    }
    async getUserNotifications(user_id) {
        return this.connectionService.notification.findMany({
            where: { user_id },
            orderBy: { createdAt: 'desc' },
        });
    }
    async markAsRead(id) {
        return this.connectionService.notification.update({
            where: { id },
            data: { read: true },
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService])
], NotificationService);
//# sourceMappingURL=notifiction.service.js.map