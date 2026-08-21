import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { CustomersModule } from './modules/customers/customers.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { PartnerNetworkModule } from './modules/partner-network/partner-network.module';
import { FinanceModule } from './modules/finance/finance.module';
import { MessagesModule } from './modules/messages/messages.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { VehicleDocumentsModule } from './modules/vehicle-documents/vehicle-documents.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { ExtensionsModule } from './modules/extensions/extensions.module';
import { ExtraChargesModule } from './modules/extra-charges/extra-charges.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    SettingsModule,
    PricingModule,
    VehicleDocumentsModule,
    DepositsModule,
    ExtensionsModule,
    ExtraChargesModule,
    InspectionsModule,
    NotificationsModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    VehiclesModule,
    AvailabilityModule,
    CustomersModule,
    BookingsModule,
    MaintenanceModule,
    PartnerNetworkModule,
    FinanceModule,
    MessagesModule,
    DashboardModule,
    ReportsModule,
    MarketplaceModule,
  ],
})
export class AppModule {}
