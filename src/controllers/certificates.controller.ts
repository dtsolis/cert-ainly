import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpException,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiBasicAuth,
} from '@nestjs/swagger';
import { CertificatesService } from '../services/certificates.service';
import { Certificate } from '../entities/certificate.entity';
import { AuthGuard } from '../guards/auth.guard';

const DEFAULT_DAYS_UNTIL_EXPIRATION = 30;

@ApiTags('certificates')
@ApiBasicAuth()
@UseGuards(AuthGuard)
@Controller('api/certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all certificates' })
  @ApiResponse({ status: 200, description: 'Returns all certificates', type: [Certificate] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllCertificates(): Promise<Certificate[]> {
    return this.certificatesService.getAllCertificates();
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get certificates expiring soon' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: `Number of days to check. Default is ${DEFAULT_DAYS_UNTIL_EXPIRATION}`,
  })
  @ApiResponse({ status: 200, description: 'Returns certificates expiring within the specified days' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getExpiringCertificates(@Query('days') days: string): Promise<Certificate[]> {
    const daysNumber = days ? parseInt(days, 10) : DEFAULT_DAYS_UNTIL_EXPIRATION;
    return this.certificatesService.getExpiringCertificates(daysNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate by ID' })
  @ApiParam({ name: 'id', required: true, description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Returns the certificate' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getCertificateById(@Param('id', ParseIntPipe) id: number): Promise<Certificate> {
    return this.certificatesService.getCertificateById(id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a new certificate' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        certificate: {
          type: 'string',
          format: 'binary',
          description: 'Certificate file',
        },
        password: {
          type: 'string',
          description: 'Optional password for protected certificates',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Certificate uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @UseInterceptors(FileInterceptor('certificate'))
  async uploadCertificate(
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
  ): Promise<Certificate> {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    return this.certificatesService.uploadCertificate(file, password);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete certificate by ID' })
  @ApiParam({ name: 'id', required: true, description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async deleteCertificate(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    const result = await this.certificatesService.deleteCertificate(id);
    return { success: result };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download certificate file' })
  @ApiParam({ name: 'id', required: true, description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Returns the certificate file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async downloadCertificate(@Param('id', ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    try {
      const certificateFile = await this.certificatesService.getCertificateFile(id);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(certificateFile.originalName)}"`,
      );
      res.setHeader('Content-Type', certificateFile.mimetype);
      res.send(certificateFile.buffer);
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to download certificate',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post('verify-password')
  @ApiOperation({ summary: 'Verify if password is valid for a certificate' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        certificate: {
          type: 'string',
          format: 'binary',
          description: 'Certificate file',
        },
        password: {
          type: 'string',
          description: 'Password to verify',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password verification result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @UseInterceptors(FileInterceptor('certificate'))
  verifyPassword(
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
  ): { success: boolean; isValid: boolean } {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    const isValid = this.certificatesService.verifyCertificatePassword(file, password);
    return { success: true, isValid };
  }
}
