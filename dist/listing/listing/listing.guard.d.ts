import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class JwtCookieAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
