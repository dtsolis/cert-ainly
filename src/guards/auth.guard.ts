import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    return this.validateRequest(request);
  }

  private async validateRequest(request: Request): Promise<boolean> {
    // First try session-based authentication
    const user = await this.authService.getCurrentUser(request);
    if (user) {
      request['user'] = user;
      return true;
    }

    // Then try basic authentication
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        if (!username || !password) {
          throw new UnauthorizedException('Invalid credentials');
        }

        const authenticatedUser = await this.authService.validateUser(username, password);
        if (authenticatedUser) {
          request['user'] = authenticatedUser;
          return true;
        }
      } catch {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    throw new UnauthorizedException('Authentication required');
  }
}
