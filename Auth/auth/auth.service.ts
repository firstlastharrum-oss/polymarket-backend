import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionService } from 'src/connection/connection.service';
// wallet utils handled locally to avoid type issues
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import * as ethers from 'ethers';

@Injectable()
export class AuthService {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly jwtService: JwtService,
  ) {}

  // ---------- REGISTER ----------
  async register(
    email: string,
    username: string,
    password: string,
    wallet_address: string,
    role: 'buyer' | 'seller' | 'admin',
    setting: object,
    nonce: string,
    res: Response,
  ) {
    try {
      const hasWallet = !!wallet_address && String(wallet_address).trim().length > 0;
      let wa: string | null = null;
      if (hasWallet) {
        if (!this.isAddress(wallet_address)) throw new BadRequestException('Invalid wallet address');
        wa = wallet_address.toLowerCase();
      }

      // Validate KYC payload inside settings
      const validatedKyc = this.validateKycData((setting as Record<string, unknown>)?.kyc);

      // Check duplicate KYC (same idType + idNumber already used)
      const duplicate = await this.isKycDuplicate(validatedKyc);
      if (duplicate) throw new BadRequestException('KYC ID already in use');

      const existingEmail = await this.connectionService.auth.findFirst({
        where: { email },
      });
      if (existingEmail) throw new BadRequestException('Email already exists');

      if (wa) {
        const existingWallet = await this.connectionService.auth.findFirst({
          where: { wallet_address: wa },
        });
        if (existingWallet) throw new BadRequestException('Wallet already in use');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const finalSetting: Record<string, unknown> = {
        ...(setting as Record<string, unknown>),
        kyc: validatedKyc,
      };

      const newUser = await this.connectionService.auth.create({
        data: {
          wallet_address: wa || undefined,
          nonce,
          email,
          username,
          password: hashedPassword,
          role,
          setting: finalSetting as any,
        },
      });

      const payload = {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      };
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
          id: newUser.id,
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

  // ---------- LOGIN ----------
  async login(
    email: string,
    password: string,
    res: Response,
    wallet_address: string,
  ) {
    try {
      const user = await this.connectionService.auth.findFirst({
        where: { email },
      });
      if (!user) throw new BadRequestException('Email not found');

      // Wallet association: allow login even if wallet differs
      if (wallet_address && this.isAddress(wallet_address)) {
        if (user.wallet_address?.toLowerCase() !== wallet_address.toLowerCase()) {
          const taken = await this.connectionService.auth.findFirst({
            where: { wallet_address, id: { not: user.id } as any },
          });
          if (!taken) {
            await this.connectionService.auth.update({
              where: { id: user.id },
              data: { wallet_address },
            });
            user.wallet_address = wallet_address;
          }
        }
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid)
        throw new UnauthorizedException('Invalid credentials');

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
        token,
        data: {
          username: user.username,
          email: user.email,
          wallet_address: user.wallet_address,
          role: user.role,
        },
      };
    } catch (err: any) {
      console.error('Error in login route:', err.message);
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException
      )
        throw err;
      throw new InternalServerErrorException('Internal server error');
    }
  }

  // ---------- GET NONCE ----------
  async getNonce(wallet_address: string) {
    try {
      if (!this.isAddress(wallet_address))
        throw new BadRequestException('Invalid wallet address');
      const wa = wallet_address.toLowerCase();

      const nonce = `Sign this message to verify your wallet. Nonce: ${randomBytes(16).toString('hex')}`;

      const existing = await this.connectionService.auth.findFirst({
        where: { wallet_address: wa },
      });
      if (existing) {
        await this.connectionService.auth.update({
          where: { id: existing.id },
          data: { nonce },
        });
      } else {
        const syntheticEmail = `${wa}@wallet.local`;
        await this.connectionService.auth.create({
          data: {
            wallet_address: wa,
            nonce,
            email: syntheticEmail,
            username: wa,
            password: '',
            role: 'buyer',
            setting: {},
          },
        });
      }

      return { success: true, nonce };
    } catch (err: any) {
      console.error('Error in getNonce:', err.message);
      throw new InternalServerErrorException('Failed to generate nonce');
    }
  }

  // ---------- VERIFY WALLET ----------
  async verifySignature(
    wallet_address: string,
    signature: string,
    res: Response,
  ) {
    try {
      const wa = wallet_address.toLowerCase();
      const user = await this.connectionService.auth.findFirst({
        where: { wallet_address: wa },
      });
      if (!user || !user.nonce)
        throw new BadRequestException('Nonce not found');

      let recoveredAddress: string = '';
      try {
        const e: any = ethers as any;
        if (typeof e.verifyMessage === 'function') {
          recoveredAddress = e.verifyMessage(user.nonce, signature);
        } else {
          const hashFn = e.hashMessage || (e.utils && e.utils.hashMessage);
          if (!hashFn) throw new Error('hashMessage unavailable');
          const digest = hashFn(user.nonce);
          const recoverFn = e.recoverAddress || (e.utils && e.utils.recoverAddress);
          if (!recoverFn) throw new Error('recoverAddress unavailable');
          recoveredAddress = recoverFn(digest, signature);
        }
      } catch (e) {
        const e2: any = ethers as any;
        const toBytes = e2.toUtf8Bytes || (e2.utils && e2.utils.toUtf8Bytes);
        const hashMsg = e2.hashMessage || (e2.utils && e2.utils.hashMessage);
        const keccak = e2.keccak256 || (e2.utils && e2.utils.keccak256);
        const recover = e2.recoverAddress || (e2.utils && e2.utils.recoverAddress);
        if (!toBytes || !recover) throw new InternalServerErrorException('Failed signature recovery');
        const bytes = toBytes(String(user.nonce || ''));
        let ok = false;
        if (hashMsg) {
          try {
            const digest = hashMsg(bytes);
            recoveredAddress = recover(digest, signature);
            ok = true;
          } catch {}
        }
        if (!ok && keccak) {
          const digest = keccak(bytes);
          recoveredAddress = recover(digest, signature);
        }
      }
      if (!recoveredAddress) throw new InternalServerErrorException('Signature recovery failed');
      if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase())
        throw new UnauthorizedException('Signature verification failed');

      await this.connectionService.auth.update({
        where: { id: user.id },
        data: { nonce: null },
      });

      const payload = { id: user.id, wallet_address: user.wallet_address };
      const token = await this.jwtService.signAsync(payload);

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        success: true,
        message: 'Wallet verified successfully',
        data: { wallet_address: user.wallet_address, token, verified: true },
      };
    } catch (err: any) {
      console.error('Error in verifySignature:', err.message);
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException
      )
        throw err;
      throw new InternalServerErrorException(
        'Failed to verify wallet signature',
      );
    }
  }

  // ---------- PROFILE & PASSWORD ----------
  async updateProfile(
    userId: number,
    updateData: { username?: string; email?: string; wallet_address?: string },
  ) {
    try {
      const user = await this.connectionService.auth.findFirst({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      if (updateData.wallet_address && !this.isAddress(updateData.wallet_address))
        throw new BadRequestException('Invalid wallet address');

      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await this.connectionService.auth.findFirst({
          where: { email: updateData.email, id: { not: userId } },
        });
        if (existingUser) throw new BadRequestException('Email already taken');
      }

      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await this.connectionService.auth.findFirst({
          where: { username: updateData.username, id: { not: userId } },
        });
        if (existingUser)
          throw new BadRequestException('Username already taken');
      }

      const updatedUser = await this.connectionService.auth.update({
        where: { id: userId },
        data: updateData,
      });
      const { password, nonce, ...userWithoutSensitiveData } = updatedUser;

      return {
        success: true,
        message: 'Profile updated successfully',
        data: userWithoutSensitiveData,
      };
    } catch (err: any) {
      console.error('Error in updateProfile:', err.message);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      )
        throw err;
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      const user = await this.connectionService.auth.findFirst({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid)
        throw new UnauthorizedException('Current password is incorrect');

      if (newPassword.length < 8)
        throw new BadRequestException(
          'New password must be at least 8 characters long',
        );

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      await this.connectionService.auth.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return { success: true, message: 'Password updated successfully' };
    } catch (err: any) {
      console.error('Error in changePassword:', err.message);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof UnauthorizedException
      )
        throw err;
      throw new InternalServerErrorException('Failed to change password');
    }
  }

  async updatePreferences(userId: number, preferences: object) {
    try {
      const user = await this.connectionService.auth.findFirst({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      const updatedUser = await this.connectionService.auth.update({
        where: { id: userId },
        data: { setting: preferences },
      });

      return {
        success: true,
        message: 'Preferences updated successfully',
        data: { preferences: updatedUser.setting },
      };
    } catch (err: any) {
      console.error('Error in updatePreferences:', err.message);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update preferences');
    }
  }

  async getWishlist(userId: number) {
    try {
      const user = await this.connectionService.auth.findFirst({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');
      const setting = (user.setting as any) || {};
      const wishlist = Array.isArray(setting.wishlist) ? setting.wishlist : [];
      return { success: true, data: { wishlist } };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to get wishlist');
    }
  }

  async toggleWishlist(userId: number, listingId: number) {
    try {
      const listing = await this.connectionService.listing.findUnique({
        where: { id: Number(listingId) },
      });
      if (!listing) throw new NotFoundException('Listing not found');
      const user = await this.connectionService.auth.findFirst({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');
      const current: any = (user.setting as any) || {};
      const wishlist: number[] = Array.isArray(current.wishlist) ? current.wishlist.map((x: any) => Number(x)) : [];
      const idNum = Number(listingId);
      const idx = wishlist.findIndex((x) => x === idNum);
      if (idx >= 0) {
        wishlist.splice(idx, 1);
      } else {
        wishlist.push(idNum);
      }
      const updated = await this.connectionService.auth.update({
        where: { id: userId },
        data: { setting: { ...current, wishlist } as any },
      });
      return { success: true, data: { wishlist } };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to toggle wishlist');
    }
  }

  async getCurrentUser(userId: number) {
    try {
      const user = await this.connectionService.auth.findFirst({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      const balance = await this.connectionService.balance.findUnique({
        where: { userId: user.id },
      });

      const { password, nonce, ...userWithoutSensitiveData } = user;

      return { success: true, data: { ...userWithoutSensitiveData, balance: balance || { available: 0, locked: 0 } } };
    } catch (err: any) {
      console.error('Error in getCurrentUser:', err.message);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to get user data');
    }
  }

  // ---------- KYC SUBMISSION ----------
  async submitKyc(userId: number, documentUrl: string) {
    try {
      const user = await this.connectionService.auth.findFirst({
        where: { id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      const currentSetting = (user.setting as any) || {};
      const updatedSetting = {
        ...currentSetting,
        kyc_document_url: documentUrl,
        kyc_submitted_at: new Date().toISOString(),
      };

      const updated = await this.connectionService.auth.update({
        where: { id: userId },
        data: { setting: updatedSetting },
      });

      const { password, nonce, ...safe } = updated;
      return { success: true, message: 'KYC submitted', data: safe };
    } catch (err: any) {
      console.error('Error in submitKyc:', err.message);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to submit KYC');
    }
  }

  private validateKycData(kycUnknown: unknown) {
    const allowedTypes = new Set(['passport', 'national_id', 'driver_license']);

    if (!kycUnknown || typeof kycUnknown !== 'object') {
      throw new BadRequestException('Missing KYC information');
    }
    const kyc = kycUnknown as Record<string, unknown>;

    const fullName = kyc.fullName;
    const country = kyc.country;
    const idType = kyc.idType;
    const idNumber = kyc.idNumber;
    const consent = kyc.consent;
    const reference = kyc.reference;

    if (typeof fullName !== 'string' || fullName.trim().length < 3)
      throw new BadRequestException('Invalid full name');
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2)
      throw new BadRequestException('Full name must include first and last name');
    if (!/^[A-Za-z\-\'\s]{3,100}$/.test(fullName))
      throw new BadRequestException('Full name contains invalid characters');

    if (typeof country !== 'string' || country.trim().length < 2)
      throw new BadRequestException('Invalid country');

    if (typeof idType !== 'string' || !allowedTypes.has(idType))
      throw new BadRequestException('Invalid ID type');

    if (typeof idNumber !== 'string')
      throw new BadRequestException('Invalid ID number');
    const idNum = idNumber.trim().toUpperCase();
    let idValid = false;
    if (idType === 'passport') {
      idValid = /^[A-Z0-9]{6,9}$/.test(idNum);
    } else if (idType === 'national_id') {
      const cRaw = typeof country === 'string' ? country.trim().toUpperCase() : '';
      const cMap: Record<string, { min: number; max: number }> = {
        US: { min: 9, max: 9 },
        ZA: { min: 13, max: 13 },
        IN: { min: 12, max: 12 },
        EG: { min: 14, max: 14 },
        PK: { min: 13, max: 13 },
        NG: { min: 11, max: 11 },
        KE: { min: 8, max: 8 },
        GH: { min: 10, max: 10 },
        MY: { min: 12, max: 12 },
        BD: { min: 13, max: 17 },
      };
      const code = (() => {
        const s = cRaw;
        if (s.includes('UNITED STATES') || s.includes('USA') || s === 'US') return 'US';
        if (s.includes('SOUTH AFRICA') || s === 'ZA') return 'ZA';
        if (s.includes('INDIA') || s === 'IN') return 'IN';
        if (s.includes('EGYPT') || s === 'EG') return 'EG';
        if (s.includes('PAKISTAN') || s === 'PK') return 'PK';
        if (s.includes('NIGERIA') || s === 'NG') return 'NG';
        if (s.includes('KENYA') || s === 'KE') return 'KE';
        if (s.includes('GHANA') || s === 'GH') return 'GH';
        if (s.includes('MALAYSIA') || s === 'MY') return 'MY';
        if (s.includes('BANGLADESH') || s === 'BD') return 'BD';
        return '';
      })();
      const rule = code ? cMap[code] : undefined;
      if (rule) {
        const re = new RegExp(`^[0-9]{${rule.min},${rule.max}}$`);
        idValid = re.test(idNum);
      } else {
        idValid = /^[0-9]{6,12}$/.test(idNum);
      }
    } else if (idType === 'driver_license') {
      idValid = /^[A-Z0-9]{6,15}$/.test(idNum);
    }
    if (!idValid) throw new BadRequestException('ID number format invalid for the selected type');

    if (typeof consent !== 'boolean' || consent !== true)
      throw new BadRequestException('You must confirm KYC consent');

    if (reference != null) {
      if (typeof reference !== 'string' || !/^[A-Za-z0-9_\-]{3,64}$/.test(reference)) {
        throw new BadRequestException('Invalid KYC reference');
      }
    }

    return {
      fullName: fullName.trim(),
      country: country.trim(),
      idType,
      idNumber: idNum,
      consent: true,
      reference: typeof reference === 'string' ? reference : null,
    };
  }

  private async isKycDuplicate(kyc: { idType: string; idNumber: string }) {
    try {
      const users = await this.connectionService.auth.findMany({
        select: { id: true, setting: true },
      });
      for (const u of users) {
        const s = u.setting as Record<string, unknown> | null;
        const k = s && typeof s === 'object' ? (s as any).kyc : null;
        if (k && typeof k === 'object') {
          const t = (k as any).idType;
          const n = (k as any).idNumber;
          if (t === kyc.idType && typeof n === 'string' && n.toUpperCase() === kyc.idNumber.toUpperCase()) {
            return true;
          }
        }
      }
      return false;
    } catch {
      // On DB error, be conservative and do not block; treat as not duplicate
      return false;
    }
  }

  private isAddress(address: string) {
    return /^0x[a-fA-F0-9]{40}$/.test(address || '');
  }

  async fundWallet(wallet_address: string, amountEth: number) {
    try {
      if (!this.isAddress(wallet_address)) throw new BadRequestException('Invalid wallet address');
      const amt = Number(amountEth);
      if (!isFinite(amt) || amt <= 0) throw new BadRequestException('Invalid amount');
      if (amt > 100) throw new BadRequestException('Amount too large');

      const env = process.env;
      if (!env.MARKET_RPC_URL || !env.MARKET_PK) {
        throw new InternalServerErrorException('Faucet unavailable');
      }

      const e: any = ethers as any;
      const provider = e.providers?.JsonRpcProvider ? new e.providers.JsonRpcProvider(env.MARKET_RPC_URL) : new e.JsonRpcProvider(env.MARKET_RPC_URL);
      const wallet = new e.Wallet(env.MARKET_PK, provider);
      const value = (e.utils?.parseEther || e.parseEther)(String(amt));
      const tx = await wallet.sendTransaction({ to: wallet_address, value });
      const receipt = await tx.wait();

      return { success: true, message: 'Funds sent', txHash: receipt?.hash || tx.hash, amount: amt };
    } catch (err: any) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      ) throw err;
      throw new InternalServerErrorException('Failed to fund wallet');
    }
  }
}
