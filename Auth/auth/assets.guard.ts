import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtCookieAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    
    // Try to get token from cookies first
    let token = req.cookies?.jwt;
    
    // If not in cookies, try Authorization header (Bearer token)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) throw new UnauthorizedException('No token found');

    try {
      const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      req.user = decoded; 
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
