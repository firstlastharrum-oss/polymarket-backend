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
const ethers_1 = require("ethers");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
let AuthService = class AuthService {
    constructor(connectionService, jwtService) {
        this.connectionService = connectionService;
        this.jwtService = jwtService;
    }
    async register(email, username, password, wallet_address, role, setting, nonce, res) {
        try {
            if (!(0, ethers_1.isAddress)(wallet_address))
                throw new common_1.BadRequestException('Invalid wallet address');
            const existingUser = await this.connectionService.auth.findFirst({ where: { email } });
            if (existingUser)
                throw new common_1.BadRequestException('Email already exists');
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
            const user = await this.connectionService.auth.findFirst({ where: { email } });
            if (!user)
                throw new common_1.BadRequestException('Email not found');
            const verifyWallet = await this.connectionService.auth.findFirst({ where: { wallet_address } });
            if (!verifyWallet)
                throw new common_1.BadRequestException('Wallet not found');
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
                data: { username: user.username, email: user.email, wallet_address: user.wallet_address, role: user.role },
            };
        }
        catch (err) {
            console.error('Error in login route:', err.message);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.InternalServerErrorException('Internal server error');
        }
    }
    async getNonce(wallet_address) {
        try {
            if (!(0, ethers_1.isAddress)(wallet_address))
                throw new common_1.BadRequestException('Invalid wallet address');
            const nonce = `Sign this message to verify your wallet. Nonce: ${(0, crypto_1.randomBytes)(16).toString('hex')}`;
            const existing = await this.connectionService.auth.findFirst({ where: { wallet_address } });
            if (existing) {
                await this.connectionService.auth.update({ where: { id: existing.id }, data: { nonce } });
            }
            else {
                await this.connectionService.auth.create({
                    data: { wallet_address, nonce, email: '', username: '', password: '', role: 'buyer', setting: {} },
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
            const user = await this.connectionService.auth.findFirst({ where: { wallet_address } });
            if (!user || !user.nonce)
                throw new common_1.BadRequestException('Nonce not found');
            const recoveredAddress = (0, ethers_1.verifyMessage)(user.nonce, signature);
            if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase())
                throw new common_1.UnauthorizedException('Signature verification failed');
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
        }
        catch (err) {
            console.error('Error in verifySignature:', err.message);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.UnauthorizedException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to verify wallet signature');
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