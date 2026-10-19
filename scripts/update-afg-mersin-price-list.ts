import { prisma } from '../src/lib/db';

async function main() {
  console.log('--- Updating AFG Shipping Transit Status & Price List ---');

  // 1. Find AFG Shipping
  const afg = await prisma.company.findFirst({
    where: {
      OR: [
        { code: '0101' },
        { name: { contains: 'AFG', mode: 'insensitive' } },
      ],
    },
  });

  if (!afg) {
    throw new Error('AFG Shipping company not found in database!');
  }

  console.log(`Found AFG: ${afg.name} (ID: ${afg.id}, Code: ${afg.code})`);

  // 2. Update AFG Company to enable isTransit and set contact/terms in notes
  const updatedCompany = await prisma.company.update({
    where: { id: afg.id },
    data: {
      isTransit: true,
      phone: '+1 862 237 7066',
      notes: 'THE AMERICAN FREIGHT GROUP (AFG) - "Big or Small, We Ship It All!". Website: https://afgshipping.com/ | Customer Service: +1 862 237 7066. Provides overland transit from Mersin Port, Turkey to Islam Qala, Herat (Sedan: $2,300, SUV: $2,400; includes customs clearance & transportation).',
    },
  });

  console.log(`Updated Company Roles: isTransit=${updatedCompany.isTransit}, isShipping=${updatedCompany.isShipping}, isDispatch=${updatedCompany.isDispatch}`);

  // 3. Define the Mersin to Islam Qala price list config
  const mersinPriceListConfig = {
    currency: 'USD',
    origin: 'Mersin, Turkey',
    destination: 'Islam Qala, Herat, Afghanistan',
    destinationLabel: 'Islam Qala, Herat',
    effectiveFrom: '2026-10-01',
    effectiveTo: '2026-10-15',
    rates: {
      sedan: 2300,
      suv: 2400,
    },
    vehicleTypes: [
      { id: 'sedan', label: 'Sedan (Seden)', multiplier: 1, rate: 2300 },
      { id: 'suv', label: 'SUV', multiplier: 1.0435, rate: 2400 },
    ],
    terms: [
      'Rates include customs clearance and transportation.',
      'Unforeseen Circumstances: Any additional costs arising from unforeseen circumstances, including port congestion, force majeure, natural disasters, war, or other events beyond AFG’s reasonable control, will be passed on to the client. AFG shall not be liable for such additional costs.',
      'Rate Validity: Rates are applicable based on the date the vehicle is shipped from Mersin.',
      'Standard Terms: All shipments are subject to AFG’s standard terms and conditions.',
    ],
    company: {
      name: 'THE AMERICAN FREIGHT GROUP',
      brand: 'AFG',
      slogan: 'Big or Small, We Ship It All!',
      website: 'https://afgshipping.com/',
      phone: '+1 862 237 7066',
    },
    fallbackRate: 2300,
    stateRates: {
      TR: 2300,
    },
    auctionRates: [
      {
        branch: 'Mersin Port',
        city: 'Mersin (Sedan)',
        stateCode: 'TR',
        loadingPoint: 'Islam Qala, Herat',
        total: 2300,
        source: 'manual' as const,
        confidence: 'high' as const,
        sourceNote: 'Sedan: $2,300 (Effective Oct 1st-15th, 2026. Includes customs clearance and transportation)',
      },
      {
        branch: 'Mersin Port',
        city: 'Mersin (SUV)',
        stateCode: 'TR',
        loadingPoint: 'Islam Qala, Herat',
        total: 2400,
        source: 'manual' as const,
        confidence: 'high' as const,
        sourceNote: 'SUV: $2,400 (Effective Oct 1st-15th, 2026. Includes customs clearance and transportation)',
      },
    ],
    updatedFromPdfName: 'AFG Mersin to Islam Qala (October 1st-15th, 2026).pdf',
    updatedAt: new Date().toISOString(),
  };

  // 4. Check if an existing Mersin to Islam Qala price list exists for AFG
  const existingPriceList = await prisma.companyPriceList.findFirst({
    where: {
      companyId: afg.id,
      OR: [
        { name: { contains: 'Mersin to Islam Qala', mode: 'insensitive' } },
        { sourceFileName: { contains: 'Mersin to Islam Qala', mode: 'insensitive' } },
      ],
    },
  });

  let priceListRecord;
  if (existingPriceList) {
    console.log(`Updating existing price list ${existingPriceList.id}...`);
    priceListRecord = await prisma.companyPriceList.update({
      where: { id: existingPriceList.id },
      data: {
        name: 'AFG Mersin to Islam Qala, Herat (Effective Oct 1-15, 2026)',
        destinationLabel: 'Islam Qala, Herat',
        sourceFileName: 'AFG Mersin to Islam Qala (October 1st-15th, 2026).pdf',
        effectiveFrom: new Date('2026-10-01T00:00:00.000Z'),
        config: mersinPriceListConfig,
        importedStateRateCount: 1,
        importedAuctionRateCount: 2,
        isActive: true,
      },
    });
  } else {
    console.log('Creating new price list...');
    priceListRecord = await prisma.companyPriceList.create({
      data: {
        companyId: afg.id,
        name: 'AFG Mersin to Islam Qala, Herat (Effective Oct 1-15, 2026)',
        destinationLabel: 'Islam Qala, Herat',
        sourceFileName: 'AFG Mersin to Islam Qala (October 1st-15th, 2026).pdf',
        importMode: 'manual',
        effectiveFrom: new Date('2026-10-01T00:00:00.000Z'),
        config: mersinPriceListConfig,
        importedStateRateCount: 1,
        importedAuctionRateCount: 2,
        isActive: true,
      },
    });
  }

  console.log(`Price List successfully configured: ID=${priceListRecord.id}, Name="${priceListRecord.name}"`);
  console.log('--- AFG Shipping Update Complete ---');
}

main()
  .catch((err) => {
    console.error('Error updating AFG:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
