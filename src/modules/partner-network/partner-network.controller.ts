import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PartnerNetworkService } from './partner-network.service';
import { InvitePartnerDto, RespondPartnerInviteDto } from './dto/partner-relationship.dto';
import { CreatePartnerRequestDto } from './dto/partner-request.dto';
import { SubmitPartnerOfferDto } from './dto/partner-offer.dto';
import {
  PartnerHandoverDto,
  PartnerReturnDto,
  SettlePartnerRentalDto,
} from './dto/partner-rental-ops.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgTenantGuard } from '../../common/guards/org-tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';

@ApiTags('B2B Partner Network & Rentals')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: false, description: 'Tenant Organization UUID' })
@UseGuards(JwtAuthGuard, OrgTenantGuard, RolesGuard)
@Controller('partner')
export class PartnerNetworkController {
  constructor(private readonly partnerService: PartnerNetworkService) {}

  // Relationships & Invitations
  @Get('partners')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List connected active B2B partners' })
  async getPartners(@CurrentOrgId() orgId: string) {
    return this.partnerService.getConnectedPartners(orgId);
  }

  @Get('directory')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List connected active B2B partners (directory alias)' })
  async getPartnerDirectory(@CurrentOrgId() orgId: string) {
    return this.partnerService.getConnectedPartners(orgId);
  }

  @Get('partners/invitations')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List incoming partnership invitations' })
  async getInvitations(@CurrentOrgId() orgId: string) {
    return this.partnerService.getIncomingInvitations(orgId);
  }

  @Post('partners/invite')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Send partnership invitation to another organization' })
  async invitePartner(
    @CurrentOrgId() orgId: string,
    @Body() dto: InvitePartnerDto,
  ) {
    return this.partnerService.invitePartner(orgId, dto);
  }

  @Patch('partners/invitations/:id/respond')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Accept or decline a partnership invitation' })
  async respondInvite(
    @CurrentOrgId() orgId: string,
    @Param('id') relationshipId: string,
    @Body() dto: RespondPartnerInviteDto,
  ) {
    return this.partnerService.respondToInvite(orgId, relationshipId, dto);
  }

  // Requests & Offers
  @Post('requests')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Create a B2B vehicle sourcing request for connected partner fleet' })
  async createRequest(
    @CurrentOrgId() orgId: string,
    @Body() dto: CreatePartnerRequestDto,
  ) {
    return this.partnerService.createPartnerRequest(orgId, dto);
  }

  @Get('requests')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List partner requests (filter=mine for sent, filter=network for open opportunities)' })
  async listRequests(
    @CurrentOrgId() orgId: string,
    @Query('filter') filter: 'mine' | 'network' = 'network',
  ) {
    return this.partnerService.listPartnerRequests(orgId, filter);
  }

  @Get('offers')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List wholesale partner offers' })
  async listOffers(
    @CurrentOrgId() orgId: string,
    @Query('requestId') requestId?: string,
  ) {
    return this.partnerService.listPartnerOffers(orgId, requestId);
  }

  @Post('requests/:id/offers')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Submit a wholesale offer to supply vehicle for a partner request' })
  async submitOffer(
    @CurrentOrgId() orgId: string,
    @Param('id') requestId: string,
    @Body() dto: SubmitPartnerOfferDto,
  ) {
    return this.partnerService.submitPartnerOffer(orgId, requestId, dto);
  }

  @Post('offers/:id/accept')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Accept a partner offer and convert it into a confirmed B2B partner rental' })
  async acceptOffer(
    @CurrentOrgId() orgId: string,
    @Param('id') offerId: string,
  ) {
    return this.partnerService.acceptPartnerOffer(orgId, offerId);
  }

  // Partner Rentals Operations & Privacy
  @Get('rentals')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'List B2B partner rentals (role=supplier, requester, or all)' })
  async listRentals(
    @CurrentOrgId() orgId: string,
    @Query('role') role: 'supplier' | 'requester' | 'all' = 'all',
  ) {
    return this.partnerService.listPartnerRentals(orgId, role);
  }

  @Get('rentals/:id')
  @Roles(OrgRole.VIEWER)
  @ApiOperation({ summary: 'Get privacy-safe details of a partner rental (no customer data exposed)' })
  async getRentalDetails(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.partnerService.getPartnerRentalDetails(orgId, id);
  }

  @Post('rentals/:id/handover')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Supplier hands over vehicle to partner driver (mileage, fuel, photos)' })
  async partnerHandover(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: PartnerHandoverDto,
  ) {
    return this.partnerService.partnerHandover(orgId, id, dto);
  }

  @Post('rentals/:id/return')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Supplier completes vehicle return inspection from partner' })
  async partnerReturn(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: PartnerReturnDto,
  ) {
    return this.partnerService.partnerReturn(orgId, id, dto);
  }

  @Post('rentals/:id/settle')
  @Roles(OrgRole.ADMIN)
  @ApiOperation({ summary: 'Record settlement payment for partner rental and book accounting entries' })
  async settleRental(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: SettlePartnerRentalDto,
  ) {
    return this.partnerService.settlePartnerRental(orgId, id, dto);
  }

  @Post('rentals/:id/cancel')
  @Roles(OrgRole.STAFF)
  @ApiOperation({ summary: 'Cancel a partner rental agreement' })
  async cancelRental(
    @CurrentOrgId() orgId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.partnerService.cancelPartnerRental(orgId, id, reason, user?.userId);
  }
}
