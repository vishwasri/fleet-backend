import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto, RefreshTokenDto, PasswordResetRequestDto, PasswordResetConfirmDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register-organization')
  @ApiOperation({ summary: 'Register a new rent-a-car business organization with its first OWNER' })
  @ApiResponse({ status: 201, description: 'Organization and Owner created successfully' })
  async registerOrganization(@Body() dto: RegisterOrganizationDto) {
    return this.authService.registerOrganization(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login for business staff and managers' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using valid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    // Decode token or payload
    const decoded: any = JSON.parse(
      Buffer.from(dto.refreshToken.split('.')[1], 'base64').toString(),
    );
    return this.authService.refreshTokens(decoded.sub, dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile & active organizations' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link' })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm password reset with token' })
  async resetPassword(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
