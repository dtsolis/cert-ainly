import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Certificate } from '../entities/certificate.entity';

@Injectable()
export class CertificateRepository {
  constructor(
    @InjectRepository(Certificate)
    private readonly repository: Repository<Certificate>,
  ) {}

  /**
   * Insert a new certificate
   */
  async insert(certificateData: Partial<Certificate>): Promise<Certificate> {
    const certificate = this.repository.create(certificateData);
    return this.repository.save(certificate);
  }

  /**
   * Find certificate by ID
   */
  async findById(id: number): Promise<Certificate | null> {
    return this.repository.findOneBy({ id });
  }

  /**
   * Get certificate by filename
   */
  async getByFilename(filename: string): Promise<Certificate | null> {
    return this.repository.findOneBy({ filename });
  }

  /**
   * Delete a certificate
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return result.affected ? result.affected > 0 : false;
    } catch {
      return false;
    }
  }

  /**
   * Find all certificates
   */
  async findAll(): Promise<Certificate[]> {
    return this.repository.find({
      order: {
        validTo: 'ASC',
      },
    });
  }

  /**
   * Find certificates expiring between two dates
   */
  async findExpiring(from: Date, to: Date): Promise<Certificate[]> {
    return this.repository.find({
      where: {
        validTo: Between(from, to),
      },
      order: {
        validTo: 'ASC',
      },
    });
  }
}
