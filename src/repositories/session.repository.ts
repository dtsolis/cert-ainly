import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repository: Repository<Session>,
  ) {}

  /**
   * Create a new session
   */
  async create(id: string, userId: number, expiresAt: Date): Promise<Session> {
    const session = this.repository.create({
      id,
      userId,
      expiresAt,
    });
    return this.repository.save(session);
  }

  /**
   * Get session by ID
   */
  async getById(id: string): Promise<Session | null> {
    // Only return valid sessions (not expired)
    return this.repository.findOne({
      where: {
        id,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return result.affected ? result.affected > 0 : false;
    } catch {
      return false;
    }
  }

  /**
   * Check if date is greater than now
   */
  private moreThanNow(date: Date): boolean {
    return date > new Date();
  }
}
