import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { WebController } from './controllers/web.controller';
import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { CertificatesService } from './services/certificates.service';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import { CertificatesController } from './controllers/certificates.controller';
import { memoryStorage } from 'multer';
import configuration from './config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/entities/user.entity';
import { Certificate } from 'src/entities/certificate.entity';
import { Session } from 'src/entities/session.entity';
import { UserRepository } from 'src/repositories/user.repository';
import { CertificateRepository } from 'src/repositories/certificate.repository';
import { SessionRepository } from 'src/repositories/session.repository';
import { DataSource } from 'typeorm';

const entities = [User, Certificate, Session];
const repositories = [UserRepository, CertificateRepository, SessionRepository];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MulterModule.register({
      dest: './data/uploads',
      storage: memoryStorage(),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get('database.path'),
        entities,
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true, // Automatically run migrations on startup
        synchronize: configService.get('env') !== 'production',
        logging: configService.get('env') !== 'production',
      }),
      dataSourceFactory: async (options) => {
        const dataSource = await new DataSource(options!).initialize();
        return dataSource;
      },
    }),
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [CertificatesController, WebController],
  providers: [AuthService, UsersService, CertificatesService, AuthenticatedGuard, ...repositories],
})
export class AppModule {}
