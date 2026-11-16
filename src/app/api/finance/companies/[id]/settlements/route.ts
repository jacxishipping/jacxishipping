import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { hasPermission } from '@/lib/rbac';
import { fetchExchangeRates } from '@/lib/financial/currency';

const createSettlementSchema = z.object({
  settlementDate: z.string().optional(),
  entryIds: z.array(z.string()).default([]),
  settleAllPending: z.boolean().optional().default(false),
  amountUSD: z.number().positive(),
  payoutCurrency: z.enum(['USD', 'AED', 'AFN']).default('USD'),
  fxRate: z.number().positive().default(1.0),
  payoutAmount: z.number().positive(),
  paymentMethod: z.string().min(1),
  reference: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, code: true, phone: true, address: true, country: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const [allEntries, rates] = await Promise.all([
      prisma.companyLedgerEntry.findMany({
        where: { companyId: params.id },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      }),
      fetchExchangeRates(),
    ]);

    const unsettledEntries = allEntries.filter((entry) => {
      if (entry.type !== 'CREDIT') return false;
      const meta = (entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}) as Record<string, unknown>;
      return meta.settled !== true;
    });

    const settlementHistory = allEntries.filter((entry) => {
      if (entry.type !== 'DEBIT') return false;
      const meta = (entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}) as Record<string, unknown>;
      return entry.category === 'Carrier Settlement' || meta.isSettlement === true;
    });

    const totalUnsettledUSD = unsettledEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalSettledPayoutsUSD = settlementHistory.reduce((sum, e) => sum + e.amount, 0);
    const latestEntry = allEntries[0];

    return NextResponse.json({
      company,
      unsettledEntries,
      settlementHistory,
      summary: {
        totalUnsettledUSD: Number(totalUnsettledUSD.toFixed(2)),
        totalSettledPayoutsUSD: Number(totalSettledPayoutsUSD.toFixed(2)),
        currentBalanceUSD: latestEntry?.balance ?? 0,
        unsettledCount: unsettledEntries.length,
        settlementCount: settlementHistory.length,
      },
      exchangeRates: {
        USD: 1.0,
        AED: rates.AED || 3.6725,
        AFN: rates.AFN || 67.50,
      },
    });
  } catch (error) {
    console.error('Error fetching carrier settlement data:', error);
    return NextResponse.json({ error: 'Failed to fetch carrier settlement data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, code: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createSettlementSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Find entries to mark settled
      let targetEntries: Array<{ id: string; metadata: any }> = [];

      if (validatedData.settleAllPending) {
        const pending = await tx.companyLedgerEntry.findMany({
          where: { companyId: params.id, type: 'CREDIT' },
        });
        targetEntries = pending.filter((e) => {
          const meta = (e.metadata && typeof e.metadata === 'object' ? e.metadata : {}) as Record<string, unknown>;
          return meta.settled !== true;
        });
      } else if (validatedData.entryIds.length > 0) {
        targetEntries = await tx.companyLedgerEntry.findMany({
          where: {
            id: { in: validatedData.entryIds },
            companyId: params.id,
            type: 'CREDIT',
          },
        });
      }

      // Mark matched credit entries as settled
      const nowIso = new Date().toISOString();
      for (const entry of targetEntries) {
        const meta = (entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}) as Record<string, unknown>;
        await tx.companyLedgerEntry.update({
          where: { id: entry.id },
          data: {
            metadata: {
              ...meta,
              settled: true,
              settlementRef: validatedData.reference,
              settledAt: nowIso,
            },
          },
        });
      }

      // Create settlement DEBIT entry
      const settlementDate = validatedData.settlementDate ? new Date(validatedData.settlementDate) : new Date();
      const fxSuffix = validatedData.payoutCurrency !== 'USD' ? ` (${validatedData.payoutAmount.toLocaleString()} ${validatedData.payoutCurrency} @ ${validatedData.fxRate})` : '';

      const settlementEntry = await tx.companyLedgerEntry.create({
        data: {
          companyId: params.id,
          description: `Carrier Settlement Payout${fxSuffix} • Ref #${validatedData.reference} [${validatedData.paymentMethod}]`,
          type: 'DEBIT',
          amount: validatedData.amountUSD,
          balance: 0,
          transactionDate: settlementDate,
          category: 'Carrier Settlement',
          reference: `settlement:${validatedData.reference}`,
          notes: validatedData.notes ?? null,
          createdBy: session.user!.id as string,
          metadata: {
            isSettlement: true,
            paymentMethod: validatedData.paymentMethod,
            payoutCurrency: validatedData.payoutCurrency,
            payoutAmount: validatedData.payoutAmount,
            fxRate: validatedData.fxRate,
            settledEntryCount: targetEntries.length,
            settledEntryIds: targetEntries.map((e) => e.id),
          },
        },
      });

      // Recalculate company ledger balance
      const newBalance = await recalculateCompanyLedgerBalances(tx, params.id);

      return {
        settlementEntry,
        newBalance,
        settledCount: targetEntries.length,
        settledEntries: targetEntries,
      };
    });

    return NextResponse.json({
      success: true,
      settlement: result.settlementEntry,
      newBalance: result.newBalance,
      settledCount: result.settledCount,
      settledEntries: result.settledEntries,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating carrier settlement:', error);
    return NextResponse.json({ error: 'Failed to create carrier settlement' }, { status: 500 });
  }
}
