"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const connection_service_1 = require("./connection/connection.service");
const auth_service_1 = require("../Auth/auth/auth.service");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("../Auth/auth/auth.controller");
const assets_module_1 = require("../assets/assets/assets.module");
const notifiction_module_1 = require("../notifiction/notifiction/notifiction.module");
const listing_controller_1 = require("../listing/listing/listing.controller");
const listing_service_1 = require("../listing/listing/listing.service");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'uploads'),
                serveRoot: '/uploads',
            }),
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            assets_module_1.AssetsModule,
            notifiction_module_1.NotificationModule,
            jwt_1.JwtModule.register({
                global: true,
                secret: process.env.JWT_SECRET || 'your-secret-key-here',
                signOptions: { expiresIn: '24h' },
            }),
        ],
        controllers: [
            auth_controller_1.AuthController,
            listing_controller_1.ListingController,
        ],
        providers: [
            auth_service_1.AuthService,
            connection_service_1.ConnectionService,
            listing_service_1.ListingService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map