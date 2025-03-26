import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
export class Session {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.sessions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  expiresAt: Date;
}
