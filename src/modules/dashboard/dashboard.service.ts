import { Injectable } from '@nestjs/common';
import { BookingStatus, PartnerRentalStatus, TransactionCategory, TransactionType, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOperationalPulse(orgId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Vehicle fleet status counts
    const [totalVehicles, availableVehicles, directRentals, partnerRentals, inMaintenance] =
      await Promise.all([
        this.prisma.vehicle.count({ where: { organizationId: orgId } }),
        this.prisma.vehicle.count({ where: { organizationId: orgId, status: VehicleStatus.AVAILABLE } }),
        this.prisma.vehicle.count({ where: { organizationId: orgId, status: VehicleStatus.DIRECT_RENTAL } }),
        this.prisma.vehicle.count({ where: { organizationId: orgId, status: VehicleStatus.PARTNER_RENTAL } }),
        this.prisma.vehicle.count({ where: { organizationId: orgId, status: VehicleStatus.MAINTENANCE } }),
      ]);

    // 2. Today's Pickups and Returns
    const [todayPickups, todayReturns, todayPartnerPickups, todayPartnerReturns] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          organizationId: orgId,
          pickupDateTime: { gte: startOfToday, lte: endOfToday },
          bookingStatus: { not: BookingStatus.CANCELLED },
        },
        include: {
          customerProfile: { select: { firstName: true, lastName: true, phone: true } },
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
      }),
      this.prisma.booking.findMany({
        where: {
          organizationId: orgId,
          returnDateTime: { gte: startOfToday, lte: endOfToday },
          bookingStatus: { not: BookingStatus.CANCELLED },
        },
        include: {
          customerProfile: { select: { firstName: true, lastName: true, phone: true } },
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
      }),
      this.prisma.partnerRental.findMany({
        where: {
          supplyingOrganizationId: orgId,
          handoverDateTime: { gte: startOfToday, lte: endOfToday },
          status: { not: PartnerRentalStatus.CANCELLED },
        },
        include: {
          requestingOrg: { select: { displayName: true, phone: true } },
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
      }),
      this.prisma.partnerRental.findMany({
        where: {
          supplyingOrganizationId: orgId,
          returnDateTime: { gte: startOfToday, lte: endOfToday },
          status: { not: PartnerRentalStatus.CANCELLED },
        },
        include: {
          requestingOrg: { select: { displayName: true, phone: true } },
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
      }),
    ]);

    // 3. Monthly Financials
    const monthlyTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        organizationId: orgId,
        transactionDate: { gte: startOfMonth },
      },
    });

    let monthlyDirectRevenue = new Decimal(0);
    let monthlyPartnerRevenue = new Decimal(0);
    let otherIncome = new Decimal(0);
    let monthlyExpenses = new Decimal(0);

    for (const tx of monthlyTransactions) {
      const amt = new Decimal(tx.amount.toString());
      if (tx.type === TransactionType.INCOME) {
        if (tx.category === TransactionCategory.DIRECT_RENTAL) {
          monthlyDirectRevenue = monthlyDirectRevenue.plus(amt);
        } else if (tx.category === TransactionCategory.PARTNER_RENTAL) {
          monthlyPartnerRevenue = monthlyPartnerRevenue.plus(amt);
        } else {
          otherIncome = otherIncome.plus(amt);
        }
      } else {
        monthlyExpenses = monthlyExpenses.plus(amt);
      }
    }

    const totalMonthlyRevenue = monthlyDirectRevenue.plus(monthlyPartnerRevenue).plus(otherIncome);
    const netProfit = totalMonthlyRevenue.minus(monthlyExpenses);

    // 4. Outstanding Balances
    const [unpaidDirectBookings, unpaidPartnerRentals] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          organizationId: orgId,
          bookingStatus: { not: BookingStatus.CANCELLED },
          balanceAmount: { gt: 0 },
        },
        select: { balanceAmount: true },
      }),
      this.prisma.partnerRental.findMany({
        where: {
          supplyingOrganizationId: orgId,
          status: { not: PartnerRentalStatus.CANCELLED },
          balanceAmount: { gt: 0 },
        },
        select: { balanceAmount: true },
      }),
    ]);

    let outstandingDirectBalance = new Decimal(0);
    for (const b of unpaidDirectBookings) {
      outstandingDirectBalance = outstandingDirectBalance.plus(new Decimal(b.balanceAmount.toString()));
    }

    let outstandingPartnerBalance = new Decimal(0);
    for (const pr of unpaidPartnerRentals) {
      outstandingPartnerBalance = outstandingPartnerBalance.plus(new Decimal(pr.balanceAmount.toString()));
    }

    // 5. Document Expiry & Maintenance Alerts
    const [expiringInsurance, expiringRegistration, pendingMaintenance] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: {
          organizationId: orgId,
          insuranceExpiryDate: { lte: thirtyDaysFromNow },
        },
        select: { id: true, make: true, model: true, registrationNumber: true, insuranceExpiryDate: true },
      }),
      this.prisma.vehicle.findMany({
        where: {
          organizationId: orgId,
          registrationExpiryDate: { lte: thirtyDaysFromNow },
        },
        select: { id: true, make: true, model: true, registrationNumber: true, registrationExpiryDate: true },
      }),
      this.prisma.maintenanceRecord.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledDate: { lte: endOfToday },
        },
        include: {
          vehicle: { select: { make: true, model: true, registrationNumber: true } },
        },
      }),
    ]);

    return {
      fleetSummary: {
        totalVehicles,
        availableVehicles,
        directRentals,
        partnerRentals,
        inMaintenance,
        utilizationRate: totalVehicles > 0
          ? Number((((directRentals + partnerRentals) / totalVehicles) * 100).toFixed(1))
          : 0,
      },
      todayOperations: {
        directPickupsCount: todayPickups.length,
        directReturnsCount: todayReturns.length,
        partnerPickupsCount: todayPartnerPickups.length,
        partnerReturnsCount: todayPartnerReturns.length,
        pickups: [
          ...todayPickups.map((p) => ({
            type: 'DIRECT',
            bookingId: p.id,
            bookingNumber: p.bookingNumber,
            customerName: `${p.customerProfile?.firstName} ${p.customerProfile?.lastName}`,
            phone: p.customerProfile?.phone,
            vehicle: `${p.vehicle?.make} ${p.vehicle?.model} (${p.vehicle?.registrationNumber})`,
            time: p.pickupDateTime,
            location: p.pickupLocation,
          })),
          ...todayPartnerPickups.map((p) => ({
            type: 'PARTNER',
            partnerRentalId: p.id,
            partnerName: p.requestingOrg?.displayName,
            phone: p.requestingOrg?.phone,
            vehicle: `${p.vehicle?.make} ${p.vehicle?.model} (${p.vehicle?.registrationNumber})`,
            time: p.handoverDateTime,
            location: p.pickupLocation,
          })),
        ],
        returns: [
          ...todayReturns.map((r) => ({
            type: 'DIRECT',
            bookingId: r.id,
            bookingNumber: r.bookingNumber,
            customerName: `${r.customerProfile?.firstName} ${r.customerProfile?.lastName}`,
            phone: r.customerProfile?.phone,
            vehicle: `${r.vehicle?.make} ${r.vehicle?.model} (${r.vehicle?.registrationNumber})`,
            time: r.returnDateTime,
            location: r.returnLocation,
          })),
          ...todayPartnerReturns.map((r) => ({
            type: 'PARTNER',
            partnerRentalId: r.id,
            partnerName: pPartnerRental(r),
            phone: r.requestingOrg?.phone,
            vehicle: `${r.vehicle?.make} ${r.vehicle?.model} (${r.vehicle?.registrationNumber})`,
            time: r.returnDateTime,
            location: r.returnLocation,
          })),
        ],
      },
      monthlyFinancials: {
        totalRevenue: Number(totalMonthlyRevenue.toFixed(2)),
        directRevenue: Number(monthlyDirectRevenue.toFixed(2)),
        partnerRevenue: Number(monthlyPartnerRevenue.toFixed(2)),
        otherIncome: Number(otherIncome.toFixed(2)),
        expenses: Number(monthlyExpenses.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
      },
      outstandingBalances: {
        totalOutstanding: Number(outstandingDirectBalance.plus(outstandingPartnerBalance).toFixed(2)),
        directCustomersOutstanding: Number(outstandingDirectBalance.toFixed(2)),
        b2bPartnersOutstanding: Number(outstandingPartnerBalance.toFixed(2)),
      },
      alerts: {
        expiringInsurance,
        expiringRegistration,
        pendingMaintenance,
        totalAlerts: expiringInsurance.length + expiringRegistration.length + pendingMaintenance.length,
      },
    };
  }

  async getDashboardSummary(orgId: string) {
    const pulse = await this.getOperationalPulse(orgId);

    const alerts = [
      ...pulse.alerts.expiringInsurance.map((i) => ({
        id: `ins-${i.id}`,
        title: 'Insurance Expiring',
        message: `Insurance for ${i.make} ${i.model} (${i.registrationNumber}) expires soon.`,
        severity: 'warning',
        time: i.insuranceExpiryDate ? new Date(i.insuranceExpiryDate).toISOString() : '',
      })),
      ...pulse.alerts.expiringRegistration.map((r) => ({
        id: `reg-${r.id}`,
        title: 'Registration Expiring',
        message: `Registration for ${r.make} ${r.model} (${r.registrationNumber}) expires soon.`,
        severity: 'warning',
        time: r.registrationExpiryDate ? new Date(r.registrationExpiryDate).toISOString() : '',
      })),
      ...pulse.alerts.pendingMaintenance.map((m) => ({
        id: `maint-${m.id}`,
        title: 'Maintenance Due',
        message: `Maintenance scheduled for ${m.vehicle?.make} ${m.vehicle?.model} (${m.vehicle?.registrationNumber}).`,
        severity: 'info',
        time: m.scheduledDate ? new Date(m.scheduledDate).toISOString() : '',
      })),
    ];

    const todaySchedule = [
      ...pulse.todayOperations.pickups.map((p: any) => ({
        id: p.bookingId || p.partnerRentalId || '',
        customerName: p.customerName || p.partnerName || 'Customer',
        vehicleName: p.vehicle || '',
        licensePlate: p.vehicle ? p.vehicle.split('(')[1]?.replace(')', '') || '' : '',
        time: p.time ? new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        type: 'Pickup',
        status: 'Confirmed',
      })),
      ...pulse.todayOperations.returns.map((r: any) => ({
        id: r.bookingId || r.partnerRentalId || '',
        customerName: r.customerName || r.partnerName || 'Customer',
        vehicleName: r.vehicle || '',
        licensePlate: r.vehicle ? r.vehicle.split('(')[1]?.replace(')', '') || '' : '',
        time: r.time ? new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        type: 'Return',
        status: 'Scheduled',
      })),
    ];

    const unreadNotificationsCount = await this.prisma.notification.count({
      where: { organizationId: orgId, readAt: null },
    });

    return {
      totalVehicles: pulse.fleetSummary.totalVehicles,
      availableVehicles: pulse.fleetSummary.availableVehicles,
      activeRentals: pulse.fleetSummary.directRentals + pulse.fleetSummary.partnerRentals,
      inMaintenance: pulse.fleetSummary.inMaintenance,
      partnerLoans: pulse.fleetSummary.partnerRentals,
      fleetUtilizationPercent: pulse.fleetSummary.utilizationRate,
      todayPickupsCount: pulse.todayOperations.directPickupsCount + pulse.todayOperations.partnerPickupsCount,
      todayReturnsCount: pulse.todayOperations.directReturnsCount + pulse.todayOperations.partnerReturnsCount,
      monthRevenue: pulse.monthlyFinancials.totalRevenue,
      monthExpenses: pulse.monthlyFinancials.expenses,
      netProfit: pulse.monthlyFinancials.netProfit,
      escrowDepositsHeld: pulse.outstandingBalances.totalOutstanding,
      unreadNotificationsCount,
      alerts,
      todaySchedule,
    };
  }
}

function pPartnerRental(r: any) {
  return r.requestingOrg?.displayName || 'Partner';
}
