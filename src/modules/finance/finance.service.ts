import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionCategory, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto, FinanceQueryDto } from './dto/create-transaction.dto';
import Decimal from 'decimal.js';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(orgId: string, dto: CreateTransactionDto) {
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, organizationId: orgId },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found in your organization');
      }
    }

    return this.prisma.financialTransaction.create({
      data: {
        organizationId: orgId,
        vehicleId: dto.vehicleId,
        bookingId: dto.bookingId,
        partnerRentalId: dto.partnerRentalId,
        type: dto.type,
        category: dto.category,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency || 'USD',
        transactionDate: dto.transactionDate || new Date(),
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
        attachmentUrl: dto.attachmentUrl,
      },
      include: {
        vehicle: { select: { id: true, make: true, model: true, registrationNumber: true } },
      },
    });
  }

  async findAllTransactions(orgId: string, query: FinanceQueryDto) {
    const where: Prisma.FinancialTransactionWhereInput = {
      organizationId: orgId,
      type: query.type,
      category: query.category,
      vehicleId: query.vehicleId,
    };

    if (query.startDate || query.endDate) {
      where.transactionDate = {
        gte: query.startDate ? new Date(query.startDate) : undefined,
        lte: query.endDate ? new Date(query.endDate) : undefined,
      };
    }

    if (query.search) {
      where.OR = [
        { reference: { contains: query.search } },
        { notes: { contains: query.search } },
        { paymentMethod: { contains: query.search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.financialTransaction.count({ where }),
      this.prisma.financialTransaction.findMany({
        where,
        skip: query.skip,
        take: query.take,
        include: {
          vehicle: { select: { id: true, make: true, model: true, registrationNumber: true } },
          booking: { select: { id: true, bookingNumber: true } },
        },
        orderBy: {
          [query.sortBy || 'transactionDate']: query.sortOrder || 'desc',
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page: query.page || 1,
        limit: query.take,
        totalPages: Math.ceil(total / query.take),
      },
    };
  }

  async getFinancialSummary(orgId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.FinancialTransactionWhereInput = {
      organizationId: orgId,
      transactionDate: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    };

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
    });

    let totalIncome = new Decimal(0);
    let totalExpense = new Decimal(0);
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    for (const tx of transactions) {
      const amt = new Decimal(tx.amount.toString());
      if (tx.type === TransactionType.INCOME) {
        totalIncome = totalIncome.plus(amt);
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + Number(amt.toFixed(2));
      } else {
        totalExpense = totalExpense.plus(amt);
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + Number(amt.toFixed(2));
      }
    }

    const netProfit = totalIncome.minus(totalExpense);

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        profitMarginPercent: totalIncome.greaterThan(0)
          ? Number(netProfit.div(totalIncome).mul(100).toFixed(2))
          : 0,
      },
      incomeByCategory,
      expenseByCategory,
    };
  }
}
