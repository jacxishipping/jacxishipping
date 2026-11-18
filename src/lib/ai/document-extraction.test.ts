import test from 'node:test';
import assert from 'node:assert/strict';
import {
  documentExtractionRequestSchema,
  billOfLadingResponseSchema,
  buildFallbackBillOfLading,
  buildFallbackInvoiceExtraction,
  buildFallbackShipmentIntake,
} from './document-extraction';

test('documentExtractionRequestSchema accepts bill-of-lading mode', () => {
  const parsed = documentExtractionRequestSchema.parse({
    mode: 'bill-of-lading',
    fileUrl: 'https://example.com/docs/bol-MSKU9012345.pdf',
    fileName: 'BOL_MSKU9012345.pdf',
    fileType: 'application/pdf',
    entityType: 'CONTAINER',
    entityId: 'cont-123',
  });

  assert.equal(parsed.mode, 'bill-of-lading');
  assert.equal(parsed.fileName, 'BOL_MSKU9012345.pdf');
});

test('buildFallbackBillOfLading extracts container, carrier, vessel, and ports', () => {
  const sampleBolText = `
    MAERSK LINE BILL OF LADING
    B/L NO: MSKU987654321
    BOOKING NO: BKG776655
    OCEAN VESSEL: MAERSK MC-KINNEY MOLLER VOYAGE: 2603W
    CONTAINER NUMBER: MSKU1234567
    SEAL NO: SL998877
    PORT OF LOADING: SAVANNAH, GA
    PORT OF DISCHARGE: JEBEL ALI, UAE
  `;

  const result = buildFallbackBillOfLading(
    {
      mode: 'bill-of-lading',
      fileUrl: 'https://example.com/bol.pdf',
      fileName: 'bol.pdf',
      fileType: 'application/pdf',
    },
    sampleBolText
  );

  assert.equal(result.carrierName, 'Maersk Line');
  assert.equal(result.billOfLadingNumber, 'MSKU987654321');
  assert.equal(result.bookingNumber, 'BKG776655');
  assert.equal(result.containerNumber, 'MSKU1234567');
  assert.equal(result.sealNumber, 'SL998877');
  assert.equal(result.voyageNumber, '2603W');
  assert.ok(result.portOfLoading.includes('SAVANNAH'));
  assert.ok(result.portOfDischarge.includes('JEBEL ALI'));

  // Validate output against Zod schema
  const validated = billOfLadingResponseSchema.parse(result);
  assert.equal(validated.containerNumber, 'MSKU1234567');
});

test('buildFallbackBillOfLading detects other major maritime carriers', () => {
  const mscText = 'MEDITERRANEAN SHIPPING COMPANY S.A. CONTAINER: MSCU7654321 B/L: MEDU12345678';
  const mscResult = buildFallbackBillOfLading(
    {
      mode: 'bill-of-lading',
      fileUrl: 'https://example.com/bol.pdf',
      fileName: 'bol.pdf',
      fileType: 'application/pdf',
    },
    mscText
  );
  assert.equal(mscResult.carrierName, 'MSC (Mediterranean Shipping Company)');
  assert.equal(mscResult.containerNumber, 'MSCU7654321');

  const cmaText = 'CMA CGM OCEAN BILL OF LADING CONTAINER: CMAU8899001';
  const cmaResult = buildFallbackBillOfLading(
    {
      mode: 'bill-of-lading',
      fileUrl: 'https://example.com/bol.pdf',
      fileName: 'bol.pdf',
      fileType: 'application/pdf',
    },
    cmaText
  );
  assert.equal(cmaResult.carrierName, 'CMA CGM');
  assert.equal(cmaResult.containerNumber, 'CMAU8899001');
});

test('buildFallbackShipmentIntake extracts vehicle VIN and auction details', () => {
  const sampleIntakeText = `
    COPART SALVAGE RECEIPT
    LOT NUMBER: 54321098
    VIN: 1HGCR2F83HA001234
    YEAR/MAKE/MODEL: 2017 HONDA ACCORD
    ODOMETER: 82,340 MILES
    KEYS: YES
  `;

  const intakeResult = buildFallbackShipmentIntake(
    {
      mode: 'shipment-intake',
      fileUrl: 'https://example.com/receipt.pdf',
      fileName: 'copart-receipt.pdf',
      fileType: 'application/pdf',
    },
    sampleIntakeText
  );

  assert.equal(intakeResult.vin, '1HGCR2F83HA001234');
  assert.equal(intakeResult.lotNumber, '54321098');
  assert.equal(intakeResult.auctionName, 'Copart');
  assert.equal(intakeResult.make, 'HONDA');
  assert.equal(intakeResult.hasKeys, true);
});

test('documentExtractionRequestSchema accepts relative file URLs from local upload storage', () => {
  const relativeUpload = documentExtractionRequestSchema.parse({
    mode: 'document-review',
    fileUrl: '/uploads/shipments/1700000000000-abcd1234-bol.pdf',
    fileName: 'bol.pdf',
    fileType: 'application/pdf',
    entityType: 'SHIPMENT',
    entityId: 'ship-123',
    categoryHint: 'BILL_OF_LADING',
  });

  assert.equal(relativeUpload.fileUrl, '/uploads/shipments/1700000000000-abcd1234-bol.pdf');
  assert.equal(relativeUpload.mode, 'document-review');
});


