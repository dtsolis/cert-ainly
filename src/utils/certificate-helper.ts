import * as forge from 'node-forge';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as moment from 'moment';
import { Logger } from '@nestjs/common';

/**
 * Helper class for certificate operations
 */
export class CertificateHelper {
  private static readonly logger = new Logger('CertificateHelper');

  /**
   * Get certificate file extension type
   */
  static getCertificateType(filename: string): 'p12' | 'pfx' | 'pem' | 'crt' | 'cer' | 'der' | 'unknown' {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.p12':
        return 'p12';
      case '.pfx':
        return 'pfx';
      case '.pem':
        return 'pem';
      case '.crt':
        return 'crt';
      case '.cer':
        return 'cer';
      case '.der':
        return 'der';
      default:
        return 'unknown';
    }
  }

  /**
   * Check if certificate type might require a password
   */
  static mightRequirePassword(filename: string): boolean {
    const type = this.getCertificateType(filename);
    return type === 'p12' || type === 'pfx';
  }

  /**
   * Parse certificate data based on file type and extract the certificate
   * @returns Certificate object or null if parsing failed
   */
  static parseCertificate(
    buffer: Buffer,
    filename: string,
    password?: string,
  ): { cert: forge.pki.Certificate | null; error?: string } {
    const fileExt = path.extname(filename).toLowerCase();
    let cert: forge.pki.Certificate | null = null;
    let errorMessage: string | undefined;

    try {
      if (fileExt === '.p12' || fileExt === '.pfx') {
        try {
          const p12Der = forge.util.createBuffer(buffer.toString('binary'));
          const p12Asn1 = forge.asn1.fromDer(p12Der);
          const p12 = password
            ? forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password)
            : forge.pkcs12.pkcs12FromAsn1(p12Asn1, false);

          const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
          cert = certBags[forge.pki.oids.certBag]?.[0].cert || null;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to parse P12/PFX certificate: ${msg}`);

          if (password) {
            errorMessage = 'Invalid password for P12/PFX certificate';
          } else {
            errorMessage = 'Failed to parse P12/PFX certificate. It may require a password.';
          }
        }
      } else if (fileExt === '.pem' || fileExt === '.crt' || fileExt === '.cer') {
        // Parse PEM
        try {
          const pemString = buffer.toString('utf8');
          cert = forge.pki.certificateFromPem(pemString);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to parse PEM certificate: ${msg}`);
          errorMessage = 'Failed to parse PEM certificate. File may be invalid.';
        }
      } else if (fileExt === '.der') {
        // Parse DER
        try {
          const derBuffer = forge.util.createBuffer(buffer.toString('binary'));
          const asn1 = forge.asn1.fromDer(derBuffer);
          cert = forge.pki.certificateFromAsn1(asn1);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to parse DER certificate: ${msg}`);
          errorMessage = 'Failed to parse DER certificate. File may be invalid.';
        }
      } else {
        errorMessage = `Unsupported certificate format: ${fileExt}`;
      }

      return { cert, error: errorMessage };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error parsing certificate: ${msg}`);
      return { cert: null, error: 'Unexpected error parsing certificate' };
    }
  }

  /**
   * Extract certificate information from parsed certificate
   */
  static extractCertInfo(cert: forge.pki.Certificate): {
    commonName: string;
    organization: string;
    organizationalUnit: string;
    validFrom: Date;
    validTo: Date;
    issuer: string;
    serialNumber: string;
    daysRemaining: number;
    status: 'valid' | 'expiring' | 'expired';
  } {
    const subject = cert.subject;
    const commonName = this.findAttribute(subject, '2.5.4.3') || 'Unknown';
    const organization = this.findAttribute(subject, '2.5.4.10') || 'Unknown';
    const organizationalUnit = this.findAttribute(subject, '2.5.4.11') || 'Unknown';

    const validFrom = new Date(cert.validity.notBefore);
    const validTo = new Date(cert.validity.notAfter);

    const issuerParts: string[] = [];
    cert.issuer.attributes.forEach((attr: forge.pki.Attribute) => {
      issuerParts.push(`${attr.name}=${attr.value}`);
    });
    const issuer = issuerParts.join(', ');

    const serialNumber = cert.serialNumber;

    const now = moment();
    const expiry = moment(validTo);
    const daysRemaining = expiry.diff(now, 'days');

    let status: 'valid' | 'expiring' | 'expired';
    if (daysRemaining < 0) {
      status = 'expired';
    } else if (daysRemaining < 30) {
      status = 'expiring';
    } else {
      status = 'valid';
    }

    return {
      commonName,
      organization,
      organizationalUnit,
      validFrom,
      validTo,
      issuer,
      serialNumber,
      daysRemaining,
      status,
    };
  }

  /**
   * Find attribute in certificate subject or issuer
   */
  private static findAttribute(subject: forge.pki.Certificate['subject'], oid: string): string | null {
    for (const attr of subject.attributes) {
      if (attr.type === oid) {
        return attr.value as string | null;
      }
    }
    return null;
  }

  /**
   * Check if certificate requires a password
   */
  static verifyPassword(buffer: Buffer, filename: string, password?: string): boolean {
    try {
      const fileExt = path.extname(filename).toLowerCase();

      // Only P12/PFX certificates require password verification
      if (fileExt !== '.p12' && fileExt !== '.pfx') {
        return true;
      }

      // Try to parse without password first
      try {
        const p12Der = forge.util.createBuffer(buffer.toString('binary'));
        const p12Asn1 = forge.asn1.fromDer(p12Der);
        forge.pkcs12.pkcs12FromAsn1(p12Asn1, false);
        return true; // Certificate has no password
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // If parsing without password fails, try with provided password
        if (!password) {
          return false;
        }

        const p12Der = forge.util.createBuffer(buffer.toString('binary'));
        const p12Asn1 = forge.asn1.fromDer(p12Der);
        forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
        return true;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to verify password for certificate: ${msg}`);
      return false;
    }
  }

  /**
   * Generate a unique filename for a certificate
   */
  static generateUniqueFilename(originalName: string): string {
    const timestamp = moment().format('YYYYMMDD-HHmmss');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    return `${baseName}-${timestamp}${extension}`;
  }

  /**
   * Format certificate status for display
   */
  static formatStatus(validTo: Date): { status: string; className: string } {
    const now = moment();
    const expiry = moment(validTo);
    const daysRemaining = expiry.diff(now, 'days');

    if (daysRemaining < 0) {
      return { status: 'Expired', className: 'danger' };
    } else if (daysRemaining < 7) {
      return { status: 'Critical', className: 'danger' };
    } else if (daysRemaining < 30) {
      return { status: 'Warning', className: 'warning' };
    } else {
      return { status: 'Valid', className: 'success' };
    }
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date): string {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Calculate days until expiration
   */
  static daysUntil(date: Date): number {
    if (!date) return 0;
    const now = new Date();
    const expiry = new Date(date);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if a certificate is expired
   */
  static isExpired(date: Date): boolean {
    return this.daysUntil(date) < 0;
  }

  /**
   * Check if a certificate is expiring soon (within 30 days)
   */
  static isExpiringSoon(date: Date): boolean {
    const days = this.daysUntil(date);
    return days >= 0 && days <= 30;
  }

  /**
   * Get status class for certificate based on expiry
   */
  static getStatusClass(date: Date): string {
    if (!date) return 'muted';
    if (this.isExpired(date)) return 'danger';
    if (this.isExpiringSoon(date)) return 'warning';
    return 'success';
  }

  /**
   * Get status text for certificate based on expiry
   */
  static getStatusText(date: Date): string {
    if (!date) return 'Unknown';
    if (this.isExpired(date)) return 'Expired';
    if (this.isExpiringSoon(date)) return 'Expiring Soon';
    return 'Valid';
  }

  /**
   * Save certificate file to disk
   */
  static async saveFile(buffer: Buffer, directory: string, filename: string): Promise<string> {
    await fs.mkdir(directory, { recursive: true });

    const uniqueFilename = filename || this.generateUniqueFilename('certificate.crt');
    const fullPath = path.join(directory, uniqueFilename);

    await fs.writeFile(fullPath, buffer);

    return uniqueFilename;
  }

  /**
   * Get the path to a certificate file for download
   */
  static getCertificateFilePath(directory: string, filename: string): string {
    return path.join(directory, filename);
  }

  /**
   * Get the appropriate MIME type for a certificate file
   */
  static getCertificateMimeType(filename: string): string {
    const fileExt = path.extname(filename).toLowerCase();

    switch (fileExt) {
      case '.p12':
      case '.pfx':
        return 'application/x-pkcs12';
      case '.pem':
        return 'application/x-pem-file';
      case '.crt':
      case '.cer':
        return 'application/x-x509-ca-cert';
      case '.der':
        return 'application/x-x509-ca-cert';
      default:
        return 'application/octet-stream';
    }
  }
}
