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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const oracle_service_1 = require("./oracle/oracle.service");
let AppController = class AppController {
    constructor(appService, oracleService) {
        this.appService = appService;
        this.oracleService = oracleService;
    }
    getHello() {
        return this.appService.getHello();
    }
    async adapter(body, res) {
        const jobId = body?.id ?? '1';
        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
            const data = (await response.json());
            return {
                jobRunID: jobId,
                data,
                result: data,
                statusCode: 200,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(500);
            return {
                jobRunID: jobId,
                status: 'errored',
                error: message,
            };
        }
    }
    async requestOracle() {
        const { txHash, result } = await this.oracleService.requestOracleData();
        return { success: true, txHash, result };
    }
    getOracleTest() {
        return { ok: true };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "adapter", null);
__decorate([
    (0, common_1.Post)('oracle/request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "requestOracle", null);
__decorate([
    (0, common_1.Get)('oracle/test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getOracleTest", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        oracle_service_1.OracleService])
], AppController);
//# sourceMappingURL=app.controller.js.map