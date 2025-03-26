import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Process login request
   * @param username Username to authenticate
   * @param password Password to verify
   * @param res Express response object to set cookie
   * @returns User data without sensitive information
   */
  async login(username: string, password: string, res: Response) {
    try {
      const { sessionId, user } = await this.usersService.authenticateUser(username, password);

      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        sameSite: 'lax',
      });

      return user;
    } catch {
      throw new UnauthorizedException('Invalid username or password');
    }
  }

  /**
   * Process logout request
   * @param req Express request object to get cookie
   * @param res Express response object to clear cookie
   * @returns Success message
   */
  async logout(req: Request, res: Response) {
    const sessionId = req.cookies?.sessionId as string | undefined;

    if (sessionId) {
      await this.usersService.logoutUser(sessionId);
    }

    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current authenticated user
   * @param req Express request object to get cookie
   * @returns User data or null if not authenticated
   */
  async getCurrentUser(req: Request) {
    const sessionId = req.cookies?.sessionId as string | undefined;

    if (!sessionId) {
      return null;
    }

    return await this.usersService.getUserBySession(sessionId);
  }

  /**
   * Register a new user
   * @param username Username for new account
   * @param password Password for new account
   * @param email Optional email address
   * @param isAdmin Whether the user is an admin
   * @returns Created user data
   */
  async register(username: string, password: string, email?: string, isAdmin = false) {
    return this.usersService.createUser(username, password, email, isAdmin);
  }

  /**
   * Check if the system has any users
   * @returns True if at least one user exists
   */
  async hasUsers() {
    return this.usersService.hasUsers();
  }

  /**
   * Validate user credentials for basic authentication
   * @param username Username to authenticate
   * @param password Password to verify
   * @returns User data or null if authentication fails
   */
  async validateUser(username: string, password: string) {
    try {
      // Use the authenticateUser method but don't create a session
      const { user } = await this.usersService.authenticateUser(username, password, false);
      return user;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`User validation failed: ${msg}`);
    }
    return null;
  }
}
