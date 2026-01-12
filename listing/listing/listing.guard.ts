import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class JwtCookieAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // debug: log cookies and headers for troubleshooting
    console.log('--- listing.guard request.headers.cookie ---', (request.headers as any).cookie);
    console.log('--- listing.guard request.cookies ---', (request as any).cookies);

    // Prefer Authorization header Bearer token
    const authHeader = (request.headers as any)['authorization'] || (request.headers as any)['Authorization'];
    let token: string | undefined;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = request.cookies?.jwt;
    }
    if (!token) throw new UnauthorizedException('Authentication token missing');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      (request as any).user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
