import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = await this.authService.getCurrentUser(request);
    return !!user;
  }
}
