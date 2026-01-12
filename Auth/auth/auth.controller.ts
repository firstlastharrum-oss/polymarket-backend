import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { JwtCookieAuthGuard } from './assets.guard';
import { CookieAuthGuard } from 'orders/orders/orders.guard';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body('email') email: string,
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('wallet_address') wallet_address: string,
    @Body('role') role: string,
    @Body('setting') setting: object,
    @Body('nonce') nonce: string, 
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.register(email, username, password, wallet_address, role as any, setting, nonce, res );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('wallet_address') wallet_address: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(email, password, res, wallet_address);
  }

  @Get('nonce')
  @HttpCode(HttpStatus.OK)
  async getNonce(@Query('wallet_address') wallet_address: string) {
    return this.authService.getNonce(wallet_address);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifySignature(
    @Body('wallet_address') wallet_address: string,
    @Body('signature') signature: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifySignature(wallet_address, signature, res);
  }

  @Post('verify-signature')
  @HttpCode(HttpStatus.OK)
  async verifySignatureAlias(
    @Body('wallet_address') wallet_address: string,
    @Body('signature') signature: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifySignature(wallet_address, signature, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('check')
  @UseGuards(JwtCookieAuthGuard)
  checkAuth(@Req() req) {
    return this.authService.getCurrentUser(req.user.id).then((r) => ({ success: true, user: r.data }));
  }

  @Put('update-profile')
  @UseGuards(JwtCookieAuthGuard)
  async updateProfile(
    @Body() updateData: { username?: string; email?: string; wallet_address?: string },
    @Req() req: any,
  ) {
    return this.authService.updateProfile(req.user.id, updateData);
  }

  @Put('change-password')
  @UseGuards(CookieAuthGuard)
  async changePassword(
    @Body() passwordData: { currentPassword: string; newPassword: string },
    @Req() req: any,
  ) {
    return this.authService.changePassword(req.user.id, passwordData.currentPassword, passwordData.newPassword);
  }

  @Put('update-preferences')
  @UseGuards(CookieAuthGuard)
  async updatePreferences(
    @Body() preferencesData: { preferences: object },
    @Req() req: any,
  ) {
    return this.authService.updatePreferences(req.user.id, preferencesData.preferences);
  }

  @Get('wishlist')
  @UseGuards(JwtCookieAuthGuard)
  async getWishlist(@Req() req: any) {
    return this.authService.getWishlist(req.user.id);
  }

  @Post('wishlist/toggle')
  @UseGuards(JwtCookieAuthGuard)
  async toggleWishlist(@Req() req: any, @Body('listingId') listingId: number) {
    return this.authService.toggleWishlist(req.user.id, Number(listingId));
  }

  @Post('kyc/submit')
  @UseGuards(JwtCookieAuthGuard)
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `kyc-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(file.mimetype)) return cb(null, false);
        cb(null, true);
      },
    }),
  )
  async submitKyc(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) return { success: false, message: 'KYC document required' };
    const url = `/uploads/${file.filename}`;
    return this.authService.submitKyc(req.user.id, url);
  }

  @Post('fund')
  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.OK)
  async fund(
    @Body('wallet_address') wallet_address: string,
    @Body('amount') amount: number,
    @Req() req: any,
  ) {
    const addr = wallet_address || req.user?.wallet_address;
    return this.authService.fundWallet(addr, Number(amount || 1));
  }
}
