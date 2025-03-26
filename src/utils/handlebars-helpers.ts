import * as hbs from 'hbs';
import { CertificateHelper } from './certificate-helper';

/**
 * Register Handlebars helpers for use in templates
 */
export function registerHandlebarsHelpers(): void {
  /**
   * Format date with moment.js
   * Usage: {{formatDate validFrom}}
   */
  hbs.registerHelper('formatDate', function (date: Date) {
    if (!date) return 'N/A';
    return CertificateHelper.formatDate(date);
  });

  /**
   * Calculate and format days remaining until expiration
   * Usage: {{daysRemaining validTo}}
   */
  hbs.registerHelper('daysRemaining', function (expiryDate: Date) {
    if (!expiryDate) return 'N/A';

    const days = CertificateHelper.daysUntil(expiryDate);

    if (days < 0) {
      return `Expired ${Math.abs(days)} days ago`;
    }
    return `${days} days`;
  });

  /**
   * Get certificate status CSS class based on expiry date
   * Usage: {{certificateStatusClass validTo}}
   */
  hbs.registerHelper('certificateStatusClass', function (expiryDate: Date) {
    return CertificateHelper.getStatusClass(expiryDate);
  });

  /**
   * Get certificate status text based on expiry date
   * Usage: {{certificateStatus validTo}}
   */
  hbs.registerHelper('certificateStatus', function (expiryDate: Date) {
    return CertificateHelper.getStatusText(expiryDate);
  });

  /**
   * Format file size to human-readable format
   * Usage: {{formatFileSize sizeInBytes}}
   */
  hbs.registerHelper('formatFileSize', function (bytes: number) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  });

  /**
   * Conditional comparison helper
   * Usage: {{#if (eq value1 value2)}} ... {{/if}}
   */
  hbs.registerHelper('eq', function (a: any, b: any) {
    return a === b;
  });

  /**
   * Convert ISO date to local date string
   * Usage: {{localDate date}}
   */
  hbs.registerHelper('localDate', function (isoDate: string) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString();
  });
}
