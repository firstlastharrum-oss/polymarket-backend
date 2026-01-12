import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { ConnectionService } from './connection/connection.service';
import { AuthService } from 'Auth/auth/auth.service';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from 'Auth/auth/auth.controller';
import { AssetsModule } from 'assets/assets/assets.module';
import { NotificationModule } from 'notifiction/notifiction/notifiction.module';
import { ListingController } from '../listing/listing/listing.controller';
import { ListingService } from '../listing/listing/listing.service';
import { MarketValidationService } from '../listing/listing/market-validation.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { OrdersController } from 'orders/orders/orders.controller';
import { OrdersService } from 'orders/orders/orders.service'; // <-- missing
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OracleController } from './oracle/oracle.controller';
import { OracleService } from './oracle/oracle.service';
import { BetsController } from '../bets/bets/bets.controller';
import { AdminController } from './admin/admin.controller';
import { BetsService } from '../bets/bets/bets.service';
import { MarketController } from './market/market.controller';
import { MarketService } from './market/market.service';
import { GamificationModule } from '../gamification/gamification/gamification.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AssetsModule,
    NotificationModule,
    GamificationModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key-here',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    AuthController,
    ListingController,
    OrdersController,
    AppController,
    OracleController,
      BetsController,
      AdminController,
    MarketController,
  ],
  providers: [
    AuthService,
    ConnectionService,
    ListingService,
    MarketValidationService,
    OrdersService,
    AppService,
    OracleService,
    BetsService,
    MarketService,
  ],
})
export class AppModule {}
