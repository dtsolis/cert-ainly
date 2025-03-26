import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from './src/entities/user.entity';
import { Certificate } from './src/entities/certificate.entity';
import { Session } from './src/entities/session.entity';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'sqlite',
  database: configService.get('database.path', 'data/db.sqlite'),
  entities: [User, Certificate, Session],
  migrations: [__dirname + '/src/migrations/*.js'],
  migrationsTableName: 'migrations',
});
