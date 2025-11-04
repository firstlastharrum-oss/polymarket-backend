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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { JwtCookieAuthGuard } from './assets.guard';

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

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { success: true, message: 'Logged out successfully' };
  }
  @Get('check')
  @UseGuards(JwtCookieAuthGuard)
  checkAuth(@Req() req) {
  return { success: true, user: req.user };
  }
}