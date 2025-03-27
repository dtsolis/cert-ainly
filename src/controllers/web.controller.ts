import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  Render,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { CertificatesService } from '../services/certificates.service';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '../guards/auth.guard';
import { AuthenticatedGuard } from '../guards/authenticated.guard';
import { ApiExcludeController, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

@ApiExcludeController()
@Controller('/')
export class WebController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly authService: AuthService,
  ) {}

  @Get('/')
  @ApiOperation({ summary: 'Home page' })
  @ApiResponse({ status: 200, description: 'Renders home page' })
  async index(@Req() req: Request, @Res() res: Response) {
    const hasUsers = await this.authService.hasUsers();

    if (!hasUsers) {
      return res.redirect('/setup');
    }

    const user = await this.authService.getCurrentUser(req);

    if (user) {
      return res.redirect('/dashboard');
    }

    return res.render('index', {
      title: 'Certificate Manager',
      layout: 'index',
    });
  }

  @Get('/setup')
  @ApiOperation({ summary: 'Setup page' })
  @ApiResponse({ status: 200, description: 'Renders setup page' })
  @Render('setup')
  async setup() {
    const hasUsers = await this.authService.hasUsers();

    if (hasUsers) {
      return { redirect: '/' };
    }

    return {
      title: 'Setup',
      layout: 'setup',
    };
  }

  @Post('/setup')
  @ApiOperation({ summary: 'Process setup' })
  @ApiResponse({ status: 302, description: 'Redirects to login page' })
  async processSetup(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('email') email: string,
    @Res() res: Response,
  ) {
    const hasUsers = await this.authService.hasUsers();

    if (hasUsers) {
      return res.redirect('/');
    }

    try {
      await this.authService.register(username, password, email, true);
      return res.redirect('/login?setupComplete=true');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An error occurred';
      return res.render('setup', {
        title: 'Setup',
        layout: 'setup',
        error: `Failed to create admin account: ${msg}`,
      });
    }
  }

  @Get('/login')
  @ApiOperation({ summary: 'Login page' })
  @ApiResponse({ status: 200, description: 'Renders login page' })
  @Render('login')
  async login(@Req() req: Request) {
    const user = await this.authService.getCurrentUser(req);

    if (user) {
      return { redirect: '/dashboard' };
    }

    return {
      title: 'Login',
      layout: 'login',
      setupComplete: req.query.setupComplete === 'true',
    };
  }

  @Post('/login')
  @ApiOperation({ summary: 'Process login' })
  @ApiResponse({ status: 302, description: 'Redirects to dashboard or login page' })
  async processLogin(@Body('username') username: string, @Body('password') password: string, @Res() res: Response) {
    try {
      const success = await this.authService.login(username, password, res);

      if (success) {
        return res.redirect('/dashboard');
      }

      return res.render('login', {
        title: 'Login',
        layout: 'login',
        error: 'Invalid username or password',
      });
    } catch {
      return res.render('login', {
        title: 'Login',
        layout: 'login',
        error: 'An error occurred during login',
      });
    }
  }

  @Get('/logout')
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 302, description: 'Redirects to home page' })
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.authService.logout(req, res);
    return res.redirect('/');
  }

  @Get('/dashboard')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Dashboard' })
  @ApiResponse({ status: 200, description: 'Renders dashboard' })
  @Render('index')
  async dashboard(@Req() req: Request) {
    const user = (await this.authService.getCurrentUser(req)) as User;
    const certificates = await this.certificatesService.getAllCertificates();

    return {
      title: 'Dashboard',
      layout: 'index',
      user,
      certificates,
    };
  }

  @Post('/upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('certificate'))
  @ApiOperation({ summary: 'Upload certificate' })
  @ApiResponse({ status: 302, description: 'Redirects to dashboard' })
  async uploadCertificate(
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.certificatesService.uploadCertificate(file, password);
      return res.redirect('/dashboard?success=true');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An error occurred';
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }

  @Get('/certificate/:id')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Certificate details' })
  @ApiResponse({ status: 200, description: 'Renders certificate details' })
  @Render('certificate')
  async certificateDetails(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = (await this.authService.getCurrentUser(req)) as User;
    const certificate = await this.certificatesService.getCertificateById(id);

    if (!certificate) {
      return { redirect: '/dashboard' };
    }

    return {
      title: 'Certificate Details',
      layout: 'index',
      user,
      certificate,
    };
  }

  @Post('/certificate/:id/delete')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete certificate' })
  @ApiResponse({ status: 302, description: 'Redirects to dashboard' })
  async deleteCertificate(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Res() res: Response) {
    try {
      await this.certificatesService.deleteCertificate(id);
      return res.redirect('/dashboard?deleted=true');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An error occurred';
      return res.redirect(`/dashboard?error=${encodeURIComponent(msg)}`);
    }
  }

  /**
   * Verify certificate password - Ajax handler
   * Requires authentication
   */
  @UseGuards(AuthGuard)
  @Post('verify-password')
  @UseInterceptors(FileInterceptor('certificate'))
  verifyPassword(@UploadedFile() file: Express.Multer.File, @Body('password') password: string, @Res() res: Response) {
    try {
      if (!file) {
        throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
      }

      const isValid = this.certificatesService.verifyCertificatePassword(file, password);

      return res.json({
        success: true,
        isValid,
      });
    } catch (error: unknown) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify password',
      });
    }
  }
}
