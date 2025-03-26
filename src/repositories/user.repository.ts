import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  /**
   * Get user by username with sessions
   */
  async getByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({
      where: { username },
      relations: ['sessions'],
    });
  }

  /**
   * Get user by ID with sessions
   */
  async getById(id: number): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['sessions'],
    });
  }

  /**
   * Create a new user
   */
  async create(username: string, password: string, email: string | null, isAdmin: boolean): Promise<User> {
    const user = this.repository.create({
      username,
      password,
      email,
      isAdmin,
    });
    return this.repository.save(user);
  }

  /**
   * Count users
   */
  async count(): Promise<number> {
    return this.repository.count();
  }
}
