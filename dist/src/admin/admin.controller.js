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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const bets_service_1 = require("../../bets/bets/bets.service");
const orders_guard_1 = require("../../orders/orders/orders.guard");
let AdminController = class AdminController {
    constructor(betsService) {
        this.betsService = betsService;
    }
    async challenges(req) {
        const adminUserId = req.user?.id;
        if (!adminUserId)
            throw new common_1.BadRequestException('Invalid user');
        return await this.betsService.getAdminChallenges(adminUserId);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('challenges'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "challenges", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [bets_service_1.BetsService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map