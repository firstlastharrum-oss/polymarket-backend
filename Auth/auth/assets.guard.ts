import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtCookieAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.jwt;

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
