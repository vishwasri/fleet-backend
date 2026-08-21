import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('End-Customer Marketplace (Version 2 Foundation)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer')
export class CustomerMarketplaceController {
  @Get('profile')
  @ApiOperation({ summary: 'Version 2 End-Customer Marketplace Profile stub' })
  async getCustomerProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      userId: user.userId,
      email: user.email,
      message: 'Version 2 End-Customer Account Profile foundation ready.',
      savedDrivers: [],
      preferences: {},
    };
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Version 2 End-Customer Marketplace Bookings stub' })
  async getCustomerBookings(@CurrentUser() user: AuthenticatedUser) {
    return {
      bookings: [],
      message: 'Version 2 End-Customer Marketplace Bookings history foundation ready.',
    };
  }
}
