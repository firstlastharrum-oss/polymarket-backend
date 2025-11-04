import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConnectionService } from './connection/connection.service';
import { AuthService } from 'Auth/auth/auth.service';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from 'Auth/auth/auth.controller';
import { AssetsModule } from 'assets/assets/assets.module';
import { NotificationModule } from 'notifiction/notifiction/notifiction.module';
import { ListingController } from '../listing/listing/listing.controller'; 
import { ListingService } from '../listing/listing/listing.service';       
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AssetsModule,
    NotificationModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key-here',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    AuthController,
    ListingController, // <-- register your controller here
  ],
  providers: [
    AuthService,
    ConnectionService,
    ListingService, // <-- register your service here
  ],
})
export class AppModule {}
