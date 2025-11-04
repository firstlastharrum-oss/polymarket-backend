import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConnectionService } from 'src/connection/connection.service';
import { isAddress, verifyMessage } from 'ethers';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    email: string,
    username: string,
    password: string,
    wallet_address: string,
    role: 'buyer' | 'seller' | 'admin',
    setting: object,
    nonce: string, // Parameter name is correct: nonce
    res: Response,
  ) {
    try {
      if (!isAddress(wallet_address)) throw new BadRequestException('Invalid wallet address');

      const existingUser = await this.connectionService.auth.findFirst({ where: { email } });
      if (existingUser) throw new BadRequestException('Email already exists');

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await this.connectionService.auth.create({
        data: { wallet_address, nonce, email, username, password: hashedPassword, role, setting },
      });

      const payload = { id: newUser.id, email: newUser.email, role: newUser.role };
      const token = await this.jwtService.signAsync(payload);

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        message: 'User registered successfully',
        token,
        data: {
          username: newUser.username,
          email: newUser.email,
          wallet_address: newUser.wallet_address,
          role: newUser.role,
        },
      };
    } catch (err: any) {
      console.error('Error in register route:', err.message);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async login(email: string, password: string, res: Response, wallet_address: string) {
    try {
      const user = await this.connectionService.auth.findFirst({ where: { email } });
      if (!user) throw new BadRequestException('Email not found');

      const verifyWallet = await this.connectionService.auth.findFirst({ where: { wallet_address } });
      if (!verifyWallet) throw new BadRequestException('Wallet not found');

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

      const payload = { id: user.id, email: user.email, role: user.role };
      const token = await this.jwtService.signAsync(payload);

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        message: 'Login successful',
        data: { username: user.username, email: user.email, wallet_address: user.wallet_address, role: user.role },
      };
    } catch (err: any) {
      console.error('Error in login route:', err.message);
      if (err instanceof BadRequestException || err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async getNonce(wallet_address: string) {
    try {
      if (!isAddress(wallet_address)) throw new BadRequestException('Invalid wallet address');

      const nonce = `Sign this message to verify your wallet. Nonce: ${randomBytes(16).toString('hex')}`;

      const existing = await this.connectionService.auth.findFirst({ where: { wallet_address } });
      if (existing) {
        await this.connectionService.auth.update({ where: { id: existing.id }, data: { nonce } });
      } else {
        await this.connectionService.auth.create({
          data: { wallet_address, nonce, email: '', username: '', password: '', role: 'buyer', setting: {} },
        });
      }

      return { success: true, nonce };
    } catch (err: any) {
      console.error('Error in getNonce:', err.message);
      throw new InternalServerErrorException('Failed to generate nonce');
    }
  }

  async verifySignature(wallet_address: string, signature: string, res: Response) {
    try {
      const user = await this.connectionService.auth.findFirst({ where: { wallet_address } });
      if (!user || !user.nonce) throw new BadRequestException('Nonce not found');

      const recoveredAddress = verifyMessage(user.nonce, signature);
      if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase())
        throw new UnauthorizedException('Signature verification failed');

      await this.connectionService.auth.update({ where: { id: user.id }, data: { nonce: null } });

      const payload = { id: user.id, wallet_address: user.wallet_address };
      const token = await this.jwtService.signAsync(payload);

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return { success: true, message: 'Wallet verified successfully', data: { wallet_address: user.wallet_address, token } };
    } catch (err: any) {
      console.error('Error in verifySignature:', err.message);
      if (err instanceof BadRequestException || err instanceof UnauthorizedException) throw err;
      throw new InternalServerErrorException('Failed to verify wallet signature');
    }
  }
}