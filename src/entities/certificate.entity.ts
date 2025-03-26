import { Exclude, instanceToPlain } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('certificates')
export class Certificate {
  @ApiProperty({ description: 'Unique certificate ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Certificate filename in storage', example: 'cert-123456.crt' })
  @Column()
  filename: string;

  @ApiProperty({ description: 'Original filename uploaded by user', example: 'my-certificate.crt', nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  originalName: string | null;

  @ApiProperty({ description: 'Certificate valid from date', example: '2023-01-01T00:00:00.000Z' })
  @Column()
  validFrom: Date;

  @ApiProperty({ description: 'Certificate expiration date', example: '2024-01-01T00:00:00.000Z' })
  @Column()
  validTo: Date;

  @ApiProperty({ description: 'Certificate issuer', example: 'DigiCert Inc', nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  issuer: string | null;

  @ApiProperty({ description: 'Certificate serial number', example: '0123456789ABCDEF', nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  serialNumber: string | null;

  @ApiProperty({ description: 'Certificate common name (CN)', example: 'example.com', nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  commonName: string | null;

  @ApiProperty({ description: 'Certificate organization (O)', example: 'Example Inc', nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  organization: string | null;

  @ApiProperty({ description: 'Certificate organizational unit (OU)', example: 'IT Department', nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  organizationalUnit: string | null;

  @ApiProperty({ description: 'Certificate file MIME type', example: 'application/x-x509-ca-cert', nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  fileType: string | null;

  @ApiProperty({ description: 'Certificate password (if applicable)', example: 'password123', nullable: true })
  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true, type: 'varchar' })
  password: string | null;

  @ApiProperty({ description: 'Certificate upload date', example: '2023-06-01T12:34:56.789Z' })
  @CreateDateColumn()
  uploadedAt: Date;

  @ApiProperty({ description: 'Certificate type', example: 'certificate' })
  @Column()
  type: string;

  @ApiProperty({ description: 'Certificate description', example: 'Website production certificate', nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  description: string | null;

  /**
   * Convert the certificate to a JSON object.
   * This is used to exclude the password from the JSON response.
   */
  toJSON() {
    return instanceToPlain(this);
  }
}
