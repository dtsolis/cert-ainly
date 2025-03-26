import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  /**
   * Create a new user
   * @param username - Username for the new user
   * @param password - Plain text password
   * @param email - User's email address (optional)
   * @param isAdmin - Whether the user is an admin
   * @returns Created user object or error
   */
  async createUser(username: string, password: string, email?: string, isAdmin = false): Promise<Partial<User>> {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      const existingUser = await this.userRepository.getByUsername(username);
      if (existingUser) {
        throw new Error('Username already taken');
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await this.userRepository.create(username, hashedPassword, email || null, isAdmin);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      };
    } catch (error) {
      this.logger.error(`Error creating user: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Authenticate a user with username and password
   * @param username - Username to authenticate
   * @param password - Password to verify
   * @param createSession - Whether to create a session (default: true)
   * @returns Session object if authentication successful
   */
  async authenticateUser(
    username: string,
    password: string,
    createSession = true,
  ): Promise<{ sessionId: string | null; user: Partial<User> }> {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      const user = await this.userRepository.getByUsername(username);
      if (!user) {
        throw new Error('Invalid username or password');
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        throw new Error('Invalid username or password');
      }

      let sessionId: string | null = null;

      if (createSession) {
        sessionId = uuidv4();
        const expiresAt = moment().add(24, 'hours').toDate(); // Sessions expire in 24 hours
        await this.sessionRepository.create(sessionId, user.id, expiresAt);
      }

      return {
        sessionId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      };
    } catch (error) {
      this.logger.error(`Error authenticating user: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get a user by their session ID
   * @param sessionId - Session ID to look up
   * @returns User object or null if session invalid
   */
  async getUserBySession(sessionId: string): Promise<Partial<User> | null> {
    try {
      if (!sessionId) {
        return null;
      }

      const session = await this.sessionRepository.getById(sessionId);
      if (!session) {
        return null;
      }

      return {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        isAdmin: session.user.isAdmin,
      };
    } catch (error) {
      this.logger.error(`Error getting user by session: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Log out a user by deleting their session
   * @param sessionId - Session ID to invalidate
   * @returns Success status
   */
  async logoutUser(sessionId: string): Promise<boolean> {
    try {
      if (!sessionId) {
        return false;
      }

      return await this.sessionRepository.delete(sessionId);
    } catch (error) {
      this.logger.error(`Error logging out user: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Check if any users exist in the database
   * @returns True if at least one user exists
   */
  async hasUsers(): Promise<boolean> {
    try {
      const count = await this.userRepository.count();
      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking if users exist: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
