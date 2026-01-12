"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
process.env.PRISMA_CLIENT_ENGINE_TYPE =
    process.env.PRISMA_CLIENT_ENGINE_TYPE &&
        process.env.PRISMA_CLIENT_ENGINE_TYPE !== 'wasm'
        ? process.env.PRISMA_CLIENT_ENGINE_TYPE
        : 'binary';
let ConnectionService = class ConnectionService extends client_1.PrismaClient {
    async onModuleInit() {
        await this.$connect();
    }
};
exports.ConnectionService = ConnectionService;
exports.ConnectionService = ConnectionService = __decorate([
    (0, common_1.Injectable)()
], ConnectionService);
//# sourceMappingURL=connection.service.js.map