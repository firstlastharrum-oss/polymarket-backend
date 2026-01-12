import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CookieAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Prefer Authorization header: Bearer <token>
    let token: string | undefined;
    const authHeader = (request.headers as any)['authorization'] || (request.headers as any)['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    // Fallback to cookie
    if (!token) {
      token = request.cookies?.jwt as string | undefined;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
      (request as any).user = decoded;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
