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
const schedule_1 = require("@nestjs/schedule");
const jwt_1 = require("@nestjs/jwt");
const connection_service_1 = require("./connection/connection.service");
const auth_service_1 = require("../Auth/auth/auth.service");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("../Auth/auth/auth.controller");
const assets_module_1 = require("../assets/assets/assets.module");
const notifiction_module_1 = require("../notifiction/notifiction/notifiction.module");
const listing_controller_1 = require("../listing/listing/listing.controller");
const listing_service_1 = require("../listing/listing/listing.service");
const market_validation_service_1 = require("../listing/listing/market-validation.service");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const orders_controller_1 = require("../orders/orders/orders.controller");
const orders_service_1 = require("../orders/orders/orders.service");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const oracle_controller_1 = require("./oracle/oracle.controller");
const oracle_service_1 = require("./oracle/oracle.service");
const bets_controller_1 = require("../bets/bets/bets.controller");
const admin_controller_1 = require("./admin/admin.controller");
const bets_service_1 = require("../bets/bets/bets.service");
const market_controller_1 = require("./market/market.controller");
const market_service_1 = require("./market/market.service");
const gamification_module_1 = require("../gamification/gamification/gamification.module");
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
            schedule_1.ScheduleModule.forRoot(),
            assets_module_1.AssetsModule,
            notifiction_module_1.NotificationModule,
            gamification_module_1.GamificationModule,
            jwt_1.JwtModule.register({
                global: true,
                secret: process.env.JWT_SECRET || 'your-secret-key-here',
                signOptions: { expiresIn: '24h' },
            }),
        ],
        controllers: [
            auth_controller_1.AuthController,
            listing_controller_1.ListingController,
            orders_controller_1.OrdersController,
            app_controller_1.AppController,
            oracle_controller_1.OracleController,
            bets_controller_1.BetsController,
            admin_controller_1.AdminController,
            market_controller_1.MarketController,
        ],
        providers: [
            auth_service_1.AuthService,
            connection_service_1.ConnectionService,
            listing_service_1.ListingService,
            market_validation_service_1.MarketValidationService,
            orders_service_1.OrdersService,
            app_service_1.AppService,
            oracle_service_1.OracleService,
            bets_service_1.BetsService,
            market_service_1.MarketService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map