import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { normalizeShippingRateConfig } from '@/lib/shipping-rate-calculator';
import { isTransitPriceList } from '@/lib/price-list-corridors';
import { createSystemAuditLog } from '@/lib/system-audit';

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ id: string; priceListId: string }> },
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

    const priceList = await prisma.companyPriceList.findFirst({
      where: {
        id: params.priceListId,
        companyId: params.id,
      },
    });

    if (!priceList) {
      return NextResponse.json({ error: 'Price list not found' }, { status: 404 });
    }

    const isTransit = isTransitPriceList(priceList);
    const allCompanyPriceLists = await prisma.companyPriceList.findMany({
      where: { companyId: params.id, isActive: true },
    });

    // Only deactivate price lists of the same leg type (Ocean vs Transit)
    const matchingLegActiveIds = allCompanyPriceLists
      .filter((p) => p.id !== priceList.id && isTransitPriceList(p) === isTransit)
      .map((p) => p.id);

    // Merge company priceListConfig so both ocean and transit rates coexist
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { priceListConfig: true },
    });
    const currentCompanyConfig = (company?.priceListConfig as Record<string, any>) || {};

    let updatedCompanyConfig: Record<string, any>;

    if (isTransit) {
      // Activating Transit leg: preserve existing ocean rates, update transit leg config
      const transitData = (priceList.config as any) || {};
      updatedCompanyConfig = {
        ...currentCompanyConfig,
        transit: {
          id: priceList.id,
          name: priceList.name,
          destinationLabel: priceList.destinationLabel,
          origin: transitData.origin || 'Mersin, Turkey',
          destination: transitData.destination || 'Islam Qala, Herat',
          rates: transitData.rates || { sedan: 2300, suv: 2400 },
          terms: transitData.terms || [],
          effectiveFrom: priceList.effectiveFrom,
        },
      };
    } else {
      // Activating Ocean leg: update ocean rates, preserve existing transit leg config
      const newOceanConfig = normalizeShippingRateConfig(priceList.config);
      updatedCompanyConfig = {
        ...newOceanConfig,
        ...(currentCompanyConfig.transit ? { transit: currentCompanyConfig.transit } : {}),
      };
    }

    await prisma.$transaction([
      ...(matchingLegActiveIds.length > 0
        ? [
            prisma.companyPriceList.updateMany({
              where: { id: { in: matchingLegActiveIds } },
              data: { isActive: false },
            }),
          ]
        : []),
      prisma.companyPriceList.update({
        where: { id: priceList.id },
        data: { isActive: true },
      }),
      prisma.company.update({
        where: { id: params.id },
        data: {
          priceListConfig: updatedCompanyConfig as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    await createSystemAuditLog({
      action: 'price-list-activation',
      entityType: 'COMPANY_PRICE_LIST',
      entityId: priceList.id,
      actorUserId: session.user.id as string,
      summary: `Activated price list ${priceList.name}`,
      metadata: {
        companyId: params.id,
        priceListId: priceList.id,
        sourceFileName: priceList.sourceFileName,
        destinationLabel: priceList.destinationLabel,
      },
    }).catch(() => null);

    return NextResponse.json({ config: updatedCompanyConfig, priceList });
  } catch (error) {
    console.error('Error activating company price list:', error);
    return NextResponse.json({ error: 'Failed to activate price list' }, { status: 500 });
  }
}
