import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as moment from 'moment';
import { Certificate } from '../entities/certificate.entity';
import { CertificateRepository } from '../repositories/certificate.repository';
import { CertificateHelper } from '../utils/certificate-helper';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'data', 'uploads');

  constructor(private readonly certificateRepository: CertificateRepository) {
    // Ensure uploads directory exists
    void this.ensureUploadsDir();
  }

  /**
   * Ensure uploads directory exists
   */
  private async ensureUploadsDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create uploads directory: ${errorMessage}`);
    }
  }

  /**
   * Get all certificates
   */
  async getAllCertificates(): Promise<Certificate[]> {
    return this.certificateRepository.findAll();
  }

  /**
   * Get a certificate by id
   */
  async getCertificateById(id: number): Promise<Certificate> {
    const certificate = await this.certificateRepository.findById(id);
    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }
    return certificate;
  }

  /**
   * Get a certificate by filename
   */
  async getCertificateByFilename(filename: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.getByFilename(filename);
    if (!certificate) {
      throw new NotFoundException(`Certificate with filename ${filename} not found`);
    }
    return certificate;
  }

  /**
   * Delete a certificate by id
   */
  async deleteCertificate(id: number): Promise<boolean> {
    const certificate = await this.getCertificateById(id);

    // Delete file from filesystem
    try {
      await fs.unlink(path.join(this.uploadsDir, certificate.filename));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete certificate file: ${errorMessage}`);
    }

    // Delete from database
    return this.certificateRepository.delete(id);
  }

  /**
   * Upload and process a certificate file
   */
  async uploadCertificate(file: Express.Multer.File, password?: string): Promise<Certificate> {
    try {
      // Create unique filename to prevent collisions
      const uniqueFilename = CertificateHelper.generateUniqueFilename(file.originalname);

      // Save file to disk
      await CertificateHelper.saveFile(file.buffer, this.uploadsDir, uniqueFilename);

      // Parse and extract certificate information
      const parseResult = CertificateHelper.parseCertificate(file.buffer, file.originalname, password);

      if (!parseResult.cert) {
        throw new Error(parseResult.error || 'Failed to parse certificate');
      }

      // Extract certificate info
      const certInfo = CertificateHelper.extractCertInfo(parseResult.cert);

      // Save certificate info to database
      const certificate = await this.certificateRepository.insert({
        filename: uniqueFilename,
        originalName: file.originalname,
        commonName: certInfo.commonName,
        organization: certInfo.organization,
        organizationalUnit: certInfo.organizationalUnit,
        validFrom: certInfo.validFrom,
        validTo: certInfo.validTo,
        issuer: certInfo.issuer,
        serialNumber: certInfo.serialNumber,
        password: password || null,
        fileType: file.mimetype,
        type: 'certificate',
      });

      return certificate;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload certificate: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Verify a certificate's password
   */
  verifyCertificatePassword(file: Express.Multer.File, password?: string): boolean {
    return CertificateHelper.verifyPassword(file.buffer, file.originalname, password);
  }

  /**
   * Get certificates expiring soon
   */
  async getExpiringCertificates(days: number = 30): Promise<Certificate[]> {
    const now = new Date();
    const future = moment(now).add(days, 'days').toDate();

    return this.certificateRepository.findExpiring(now, future);
  }

  /**
   * Get certificate file for download
   */
  async getCertificateFile(id: number): Promise<{
    buffer: Buffer;
    filename: string;
    mimetype: string;
    originalName: string;
  }> {
    // Get certificate record from database
    const certificate = await this.getCertificateById(id);

    // Read file from disk
    try {
      const filePath = CertificateHelper.getCertificateFilePath(this.uploadsDir, certificate.filename);
      const buffer = await fs.readFile(filePath);

      // Get appropriate mime type for the file
      const mimetype = CertificateHelper.getCertificateMimeType(certificate.filename);

      return {
        buffer,
        filename: certificate.filename,
        mimetype,
        originalName: certificate.originalName || certificate.filename,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to read certificate file: ${errorMessage}`);
      throw new NotFoundException(`Certificate file not found: ${certificate.filename}`);
    }
  }
}
