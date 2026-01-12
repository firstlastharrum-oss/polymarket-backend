"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const connection_service_1 = require("../../src/connection/connection.service");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const ethers = __importStar(require("ethers"));
let AuthService = class AuthService {
    constructor(connectionService, jwtService) {
        this.connectionService = connectionService;
        this.jwtService = jwtService;
    }
    async register(email, username, password, wallet_address, role, setting, nonce, res) {
        try {
            const hasWallet = !!wallet_address && String(wallet_address).trim().length > 0;
            let wa = null;
            if (hasWallet) {
                if (!this.isAddress(wallet_address))
                    throw new common_1.BadRequestException('Invalid wallet address');
                wa = wallet_address.toLowerCase();
            }
            const validatedKyc = this.validateKycData(setting?.kyc);
            const duplicate = await this.isKycDuplicate(validatedKyc);
            if (duplicate)
                throw new common_1.BadRequestException('KYC ID already in use');
            const existingEmail = await this.connectionService.auth.findFirst({
                where: { email },
            });
            if (existingEmail)
                throw new common_1.BadRequestException('Email already exists');
            if (wa) {
                const existingWallet = await this.connectionService.auth.findFirst({
                    where: { wallet_address: wa },
                });
                if (existingWallet)
                    throw new common_1.BadRequestException('Wallet already in use');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const finalSetting = {
                ...setting,
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
                    setting: finalSetting,
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
        }
        catch (err) {
            console.error('Error in register route:', err.message);
            if (err instanceof common_1.BadRequestException)
                throw err;
            throw new common_1.InternalServerErrorException('Internal server error');
        }
    }
    async login(email, password, res, wallet_address) {
        try {
            const user = await this.connectionService.auth.findFirst({
                where: { email },
            });
            if (!user)
                throw new common_1.BadRequestException('Email not found');
            if (wallet_address && this.isAddress(wallet_address)) {
                if (user.wallet_address?.toLowerCase() !== wallet_address.toLowerCase()) {
                    const taken = await this.connectionService.auth.findFirst({
                        where: { wallet_address, id: { not: user.id } },
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
                throw new common_1.UnauthorizedException('Invalid credentials');
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
        }
        catch (err) {
            console.error('Error in login route:', err.message);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.InternalServerErrorException('Internal server error');
        }
    }
    async getNonce(wallet_address) {
        try {
            if (!this.isAddress(wallet_address))
                throw new common_1.BadRequestException('Invalid wallet address');
            const wa = wallet_address.toLowerCase();
            const nonce = `Sign this message to verify your wallet. Nonce: ${(0, crypto_1.randomBytes)(16).toString('hex')}`;
            const existing = await this.connectionService.auth.findFirst({
                where: { wallet_address: wa },
            });
            if (existing) {
                await this.connectionService.auth.update({
                    where: { id: existing.id },
                    data: { nonce },
                });
            }
            else {
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
        }
        catch (err) {
            console.error('Error in getNonce:', err.message);
            throw new common_1.InternalServerErrorException('Failed to generate nonce');
        }
    }
    async verifySignature(wallet_address, signature, res) {
        try {
            const wa = wallet_address.toLowerCase();
            const user = await this.connectionService.auth.findFirst({
                where: { wallet_address: wa },
            });
            if (!user || !user.nonce)
                throw new common_1.BadRequestException('Nonce not found');
            let recoveredAddress = '';
            try {
                const e = ethers;
                if (typeof e.verifyMessage === 'function') {
                    recoveredAddress = e.verifyMessage(user.nonce, signature);
                }
                else {
                    const hashFn = e.hashMessage || (e.utils && e.utils.hashMessage);
                    if (!hashFn)
                        throw new Error('hashMessage unavailable');
                    const digest = hashFn(user.nonce);
                    const recoverFn = e.recoverAddress || (e.utils && e.utils.recoverAddress);
                    if (!recoverFn)
                        throw new Error('recoverAddress unavailable');
                    recoveredAddress = recoverFn(digest, signature);
                }
            }
            catch (e) {
                const e2 = ethers;
                const toBytes = e2.toUtf8Bytes || (e2.utils && e2.utils.toUtf8Bytes);
                const hashMsg = e2.hashMessage || (e2.utils && e2.utils.hashMessage);
                const keccak = e2.keccak256 || (e2.utils && e2.utils.keccak256);
                const recover = e2.recoverAddress || (e2.utils && e2.utils.recoverAddress);
                if (!toBytes || !recover)
                    throw new common_1.InternalServerErrorException('Failed signature recovery');
                const bytes = toBytes(String(user.nonce || ''));
                let ok = false;
                if (hashMsg) {
                    try {
                        const digest = hashMsg(bytes);
                        recoveredAddress = recover(digest, signature);
                        ok = true;
                    }
                    catch { }
                }
                if (!ok && keccak) {
                    const digest = keccak(bytes);
                    recoveredAddress = recover(digest, signature);
                }
            }
            if (!recoveredAddress)
                throw new common_1.InternalServerErrorException('Signature recovery failed');
            if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase())
                throw new common_1.UnauthorizedException('Signature verification failed');
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
        }
        catch (err) {
            console.error('Error in verifySignature:', err.message);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to verify wallet signature');
        }
    }
    async updateProfile(userId, updateData) {
        try {
            const user = await this.connectionService.auth.findFirst({
                where: { id: userId },
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            if (updateData.wallet_address && !this.isAddress(updateData.wallet_address))
                throw new common_1.BadRequestException('Invalid wallet address');
            if (updateData.email && updateData.email !== user.email) {
                const existingUser = await this.connectionService.auth.findFirst({
                    where: { email: updateData.email, id: { not: userId } },
                });
                if (existingUser)
                    throw new common_1.BadRequestException('Email already taken');
            }
            if (updateData.username && updateData.username !== user.username) {
                const existingUser = await this.connectionService.auth.findFirst({
                    where: { username: updateData.username, id: { not: userId } },
                });
                if (existingUser)
                    throw new common_1.BadRequestException('Username already taken');
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
        }
        catch (err) {
            console.error('Error in updateProfile:', err.message);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to update profile');
        }
    }
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await this.connectionService.auth.findFirst({
                where: { id: userId },
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid)
                throw new common_1.UnauthorizedException('Current password is incorrect');
            if (newPassword.length < 8)
                throw new common_1.BadRequestException('New password must be at least 8 characters long');
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await this.connectionService.auth.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            });
            return { success: true, message: 'Password updated successfully' };
        }
        catch (err) {
            console.error('Error in changePassword:', err.message);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to change password');
        }
    }
    async updatePreferences(userId, preferences) {
        try {
            const user = await this.connectionService.auth.findFirst({
                where: { id: userId },
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const updatedUser = await this.connectionService.auth.update({
                where: { id: userId },
                data: { setting: preferences },
            });
            return {
                success: true,
                message: 'Preferences updated successfully',
                data: { preferences: updatedUser.setting },
            };
        }
        catch (err) {
            console.error('Error in updatePreferences:', err.message);
            if (err instanceof common_1.NotFoundException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to update preferences');
        }
    }
    async getWishlist(userId) {
        try {
            const user = await this.connectionService.auth.findFirst({
                where: { id: userId },
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const setting = user.setting || {};
            const wishlist = Array.isArray(setting.wishlist) ? setting.wishlist : [];
            return { success: true, data: { wishlist } };
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to get wishlist');
        }
    }
    async toggleWishlist(userId, listingId) {
        try {
            const listing = await this.connectionService.listing.findUnique({
                where: { id: Number(listingId) },
            });
            if (!listing)
                throw new common_1.NotFoundException('Listing not found');
            const user = await this.connectionService.auth.findFirst({
                where: { id: userId },
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const current = user.setting || {};
            const wishlist = Array.isArray(current.wishlist) ? current.wishlist.map((x) => Number(x)) : [];
            const idNum = Number(listingId);
            const idx = wishlist.findIndex((x) => x === idNum);
            if (idx >= 0) {
                wishlist.splice(idx, 1);
            }
            else {
                wishlist.push(idNum);
            }
            const updated = await this.connectionService.auth.update({
                where: { id: userId },
                data: { setting: { ...current, wishlist } },
            });
            return { success: true, data: { wishlist } };
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to toggle wishlist');
        }
    }
    async getCurrentUser(userId) {
        try {
            const user = await this.connectionService.auth.findFirst({
                where: { id: userId },
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const balance = await this.connectionService.balance.findUnique({
                where: { userId: user.id },
            });
            const { password, nonce, ...userWithoutSensitiveData } = user;
            return { success: true, data: { ...userWithoutSensitiveData, balance: balance || { available: 0, locked: 0 } } };
        }
        catch (err) {
            console.error('Error in getCurrentUser:', err.message);
            if (err instanceof common_1.NotFoundException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to get user data');
        }
    }
    async submitKyc(userId, documentUrl) {
        try {
            const user = await this.connectionService.auth.findFirst({
                where: { id: userId },
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const currentSetting = user.setting || {};
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
        }
        catch (err) {
            console.error('Error in submitKyc:', err.message);
            if (err instanceof common_1.NotFoundException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to submit KYC');
        }
    }
    validateKycData(kycUnknown) {
        const allowedTypes = new Set(['passport', 'national_id', 'driver_license']);
        if (!kycUnknown || typeof kycUnknown !== 'object') {
            throw new common_1.BadRequestException('Missing KYC information');
        }
        const kyc = kycUnknown;
        const fullName = kyc.fullName;
        const country = kyc.country;
        const idType = kyc.idType;
        const idNumber = kyc.idNumber;
        const consent = kyc.consent;
        const reference = kyc.reference;
        if (typeof fullName !== 'string' || fullName.trim().length < 3)
            throw new common_1.BadRequestException('Invalid full name');
        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length < 2)
            throw new common_1.BadRequestException('Full name must include first and last name');
        if (!/^[A-Za-z\-\'\s]{3,100}$/.test(fullName))
            throw new common_1.BadRequestException('Full name contains invalid characters');
        if (typeof country !== 'string' || country.trim().length < 2)
            throw new common_1.BadRequestException('Invalid country');
        if (typeof idType !== 'string' || !allowedTypes.has(idType))
            throw new common_1.BadRequestException('Invalid ID type');
        if (typeof idNumber !== 'string')
            throw new common_1.BadRequestException('Invalid ID number');
        const idNum = idNumber.trim().toUpperCase();
        let idValid = false;
        if (idType === 'passport') {
            idValid = /^[A-Z0-9]{6,9}$/.test(idNum);
        }
        else if (idType === 'national_id') {
            const cRaw = typeof country === 'string' ? country.trim().toUpperCase() : '';
            const cMap = {
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
                if (s.includes('UNITED STATES') || s.includes('USA') || s === 'US')
                    return 'US';
                if (s.includes('SOUTH AFRICA') || s === 'ZA')
                    return 'ZA';
                if (s.includes('INDIA') || s === 'IN')
                    return 'IN';
                if (s.includes('EGYPT') || s === 'EG')
                    return 'EG';
                if (s.includes('PAKISTAN') || s === 'PK')
                    return 'PK';
                if (s.includes('NIGERIA') || s === 'NG')
                    return 'NG';
                if (s.includes('KENYA') || s === 'KE')
                    return 'KE';
                if (s.includes('GHANA') || s === 'GH')
                    return 'GH';
                if (s.includes('MALAYSIA') || s === 'MY')
                    return 'MY';
                if (s.includes('BANGLADESH') || s === 'BD')
                    return 'BD';
                return '';
            })();
            const rule = code ? cMap[code] : undefined;
            if (rule) {
                const re = new RegExp(`^[0-9]{${rule.min},${rule.max}}$`);
                idValid = re.test(idNum);
            }
            else {
                idValid = /^[0-9]{6,12}$/.test(idNum);
            }
        }
        else if (idType === 'driver_license') {
            idValid = /^[A-Z0-9]{6,15}$/.test(idNum);
        }
        if (!idValid)
            throw new common_1.BadRequestException('ID number format invalid for the selected type');
        if (typeof consent !== 'boolean' || consent !== true)
            throw new common_1.BadRequestException('You must confirm KYC consent');
        if (reference != null) {
            if (typeof reference !== 'string' || !/^[A-Za-z0-9_\-]{3,64}$/.test(reference)) {
                throw new common_1.BadRequestException('Invalid KYC reference');
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
    async isKycDuplicate(kyc) {
        try {
            const users = await this.connectionService.auth.findMany({
                select: { id: true, setting: true },
            });
            for (const u of users) {
                const s = u.setting;
                const k = s && typeof s === 'object' ? s.kyc : null;
                if (k && typeof k === 'object') {
                    const t = k.idType;
                    const n = k.idNumber;
                    if (t === kyc.idType && typeof n === 'string' && n.toUpperCase() === kyc.idNumber.toUpperCase()) {
                        return true;
                    }
                }
            }
            return false;
        }
        catch {
            return false;
        }
    }
    isAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address || '');
    }
    async fundWallet(wallet_address, amountEth) {
        try {
            if (!this.isAddress(wallet_address))
                throw new common_1.BadRequestException('Invalid wallet address');
            const amt = Number(amountEth);
            if (!isFinite(amt) || amt <= 0)
                throw new common_1.BadRequestException('Invalid amount');
            if (amt > 100)
                throw new common_1.BadRequestException('Amount too large');
            const env = process.env;
            if (!env.MARKET_RPC_URL || !env.MARKET_PK) {
                throw new common_1.InternalServerErrorException('Faucet unavailable');
            }
            const e = ethers;
            const provider = e.providers?.JsonRpcProvider ? new e.providers.JsonRpcProvider(env.MARKET_RPC_URL) : new e.JsonRpcProvider(env.MARKET_RPC_URL);
            const wallet = new e.Wallet(env.MARKET_PK, provider);
            const value = (e.utils?.parseEther || e.parseEther)(String(amt));
            const tx = await wallet.sendTransaction({ to: wallet_address, value });
            const receipt = await tx.wait();
            return { success: true, message: 'Funds sent', txHash: receipt?.hash || tx.hash, amount: amt };
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.InternalServerErrorException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to fund wallet');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map