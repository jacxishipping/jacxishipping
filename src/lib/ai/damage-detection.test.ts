import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertAiResultToInspectionData,
  resolveComparisonPhotoSets,
  getRecommendedRepairMethod,
  generateInsuranceClaimConditionReport,
  compareTransitDamagesWithAi,
  AiDamageDetectionResult,
  TransitDamageComparisonResult,
} from './damage-detection';

describe('AI Damage Detection Service', () => {
  it('converts AI damage detection results into full VehicleInspectionData schema', () => {
    const mockAiResult: AiDamageDetectionResult = {
      shipmentId: 'shipment-test-123',
      overallGrade: 'GRADE_C',
      gradeRationale: 'Noticeable panel dents and scratch on driver door.',
      totalEstimatedCost: 550,
      damagesCount: 2,
      damages: [
        {
          id: 'ai-dmg-1',
          pinNumber: 1,
          view: 'left',
          x: 42,
          y: 50,
          zone: 'Left Front Door',
          damageType: 'DENT',
          severity: 'MEDIUM',
          description: 'Creased dent across the driver door panel.',
          estimatedCost: 350,
          confidence: 0.95,
          sourcePhotoUrl: 'https://example.com/photos/car1.jpg',
          sourcePhotoIndex: 0,
        },
        {
          id: 'ai-dmg-2',
          pinNumber: 2,
          view: 'front',
          x: 50,
          y: 70,
          zone: 'Front Bumper',
          damageType: 'SCRATCH',
          severity: 'LOW',
          description: 'Deep surface scratch on front bumper lip.',
          estimatedCost: 200,
          confidence: 0.91,
          sourcePhotoUrl: 'https://example.com/photos/car2.jpg',
          sourcePhotoIndex: 1,
        },
      ],
      custodySummary: {
        windshieldCondition: 'INTACT',
        airbagStatus: 'INTACT',
        tireCondition: 'ALL_GOOD',
        drivableStatus: 'RUNS_AND_DRIVES',
      },
      generalNotes: 'Intake damage survey completed via Vision AI.',
      analyzedPhotosCount: 2,
      analyzedPhotoUrls: [
        'https://example.com/photos/car1.jpg',
        'https://example.com/photos/car2.jpg',
      ],
      provider: 'TokenRouter Vision AI',
      analyzedAt: '2026-10-05T20:00:00.000Z',
    };

    const inspection = convertAiResultToInspectionData(
      mockAiResult,
      'Automated Vision Inspector',
      'Yard Intake AI'
    );

    assert.equal(inspection.shipmentId, 'shipment-test-123');
    assert.equal(inspection.inspectorName, 'Automated Vision Inspector');
    assert.equal(inspection.yardLocation, 'Yard Intake AI');
    assert.equal(inspection.overallGrade, 'GRADE_C');
    assert.equal(inspection.markers.length, 2);
    assert.equal(inspection.markers[0].zone, 'Left Front Door');
    assert.equal(inspection.markers[0].damageType, 'DENT');
    assert.equal(inspection.markers[0].severity, 'MEDIUM');
    assert.equal(inspection.markers[0].estimatedCost, 350);
    assert.equal(inspection.markers[1].zone, 'Front Bumper');
    assert.equal(inspection.markers[1].view, 'front');
    assert.equal(inspection.windshieldCondition, 'INTACT');
    assert.equal(inspection.airbagStatus, 'INTACT');
    assert.equal(inspection.insuranceDisclaimerAgreed, true);
  });

  it('converts pristine GRADE_A result with zero damages', () => {
    const cleanAiResult: AiDamageDetectionResult = {
      shipmentId: 'shipment-clean-999',
      overallGrade: 'GRADE_A',
      gradeRationale: 'Vehicle is in excellent cosmetic condition with no visible defects.',
      totalEstimatedCost: 0,
      damagesCount: 0,
      damages: [],
      custodySummary: {
        windshieldCondition: 'INTACT',
        airbagStatus: 'INTACT',
        tireCondition: 'ALL_GOOD',
        drivableStatus: 'RUNS_AND_DRIVES',
      },
      generalNotes: 'No damage observed across photos.',
      analyzedPhotosCount: 4,
      analyzedPhotoUrls: [],
      provider: 'Google Gemini Vision (gemini-2.0-flash)',
      analyzedAt: new Date().toISOString(),
    };

    const inspection = convertAiResultToInspectionData(cleanAiResult);
    assert.equal(inspection.overallGrade, 'GRADE_A');
    assert.equal(inspection.markers.length, 0);
  });

  it('resolves Yard Receipt vs Final Transit Delivery photo sets correctly', () => {
    const mockShipment = {
      id: 'ship-comp-42',
      vehiclePhotos: ['https://example.com/intake-1.jpg', 'https://example.com/intake-2.jpg'],
      arrivalPhotos: ['https://example.com/arrival-1.jpg'],
      purchaseLocation: 'Copart Atlanta',
      destinationCountry: 'United Arab Emirates',
      transit: {
        referenceNumber: 'TR-ATL-DXB-900',
        deliveryProofUrl: 'https://example.com/delivery-proof.jpg',
        company: { name: 'Al-Farooq Ocean Line' },
      },
      qualityChecks: [
        {
          checkType: 'INITIAL_INSPECTION',
          photos: ['https://example.com/yard-receipt-qc.jpg'],
        },
        {
          checkType: 'DELIVERY_INSPECTION',
          photos: ['https://example.com/delivery-qc.jpg'],
        },
      ],
    };

    const photoSets = resolveComparisonPhotoSets(mockShipment);

    // Yard receipt photos should include INITIAL_INSPECTION qc photos and vehiclePhotos
    assert.ok(photoSets.yardReceiptPhotos.includes('https://example.com/yard-receipt-qc.jpg'));
    assert.ok(photoSets.yardReceiptPhotos.includes('https://example.com/intake-1.jpg'));
    assert.equal(photoSets.yardReceiptPhotos.length, 3);

    // Final delivery photos should include DELIVERY_INSPECTION qc photos, deliveryProofUrl, and arrivalPhotos
    assert.ok(photoSets.deliveryPhotos.includes('https://example.com/delivery-qc.jpg'));
    assert.ok(photoSets.deliveryPhotos.includes('https://example.com/delivery-proof.jpg'));
    assert.ok(photoSets.deliveryPhotos.includes('https://example.com/arrival-1.jpg'));
    assert.equal(photoSets.deliveryPhotos.length, 3);

    assert.equal(photoSets.carrierName, 'Al-Farooq Ocean Line');
    assert.equal(photoSets.transitReference, 'TR-ATL-DXB-900');
  });

  it('assigns standard collision repair methods to damage types and severities', () => {
    assert.match(getRecommendedRepairMethod('DENT', 'LOW'), /Paintless Dent Repair/i);
    assert.match(getRecommendedRepairMethod('DENT', 'HIGH'), /hydraulic pull/i);
    assert.match(getRecommendedRepairMethod('SCRATCH', 'LOW'), /compounding/i);
    assert.match(getRecommendedRepairMethod('SCRATCH', 'HIGH'), /respray/i);
    assert.match(getRecommendedRepairMethod('BROKEN_GLASS', 'HIGH'), /OEM laminated/i);
  });

  it('generates an automated condition report for insurance claims when transit damages occur', () => {
    const mockShipment = {
      id: 'ship-claims-101',
      vehicleVIN: '1HGCR2F83HA001234',
      vehicleYear: 2023,
      vehicleMake: 'Honda',
      vehicleModel: 'Accord',
      vehicleColor: 'Modern Steel Metallic',
      purchaseLocation: 'Copart Dallas Yard',
      destinationCountry: 'Kabul, Afghanistan',
      transit: {
        referenceNumber: 'TR-KBL-880',
        company: { name: 'Khyber Express Logistics' },
      },
    };

    const mockComparisonResult: TransitDamageComparisonResult = {
      shipmentId: 'ship-claims-101',
      hasNewTransitDamages: true,
      transitClaimLiabilityCost: 850,
      preExistingCost: 200,
      totalDamageCost: 1050,
      preExistingCount: 1,
      transitInducedCount: 2,
      executiveSummary: 'New severe dent on driver front door and scratch on rear bumper incurred during inland transit.',
      carrierLiabilityRecommendation: 'Approve carrier subrogation claim for $850.00 USD against Khyber Express Logistics.',
      analyzedAt: new Date().toISOString(),
      provider: 'TokenRouter Vision AI',
      damages: [
        {
          id: 'dmg-1',
          pinNumber: 1,
          zone: 'Driver Front Door',
          view: 'left',
          x: 42,
          y: 50,
          damageType: 'DENT',
          severity: 'HIGH',
          origin: 'TRANSIT_INDUCED',
          description: 'Deep crease dent with metal depression from forklift or lashing contact.',
          estimatedCost: 550,
          confidence: 0.96,
          sourcePhotoUrl: 'https://example.com/arrival-door.jpg',
        },
        {
          id: 'dmg-2',
          pinNumber: 2,
          zone: 'Rear Bumper',
          view: 'rear',
          x: 50,
          y: 70,
          damageType: 'SCRATCH',
          severity: 'MEDIUM',
          origin: 'TRANSIT_INDUCED',
          description: 'Horizontal abrasion scratch through clearcoat from loading ramp.',
          estimatedCost: 300,
          confidence: 0.92,
          sourcePhotoUrl: 'https://example.com/arrival-bumper.jpg',
        },
        {
          id: 'dmg-3',
          pinNumber: 3,
          zone: 'Hood',
          view: 'top',
          x: 50,
          y: 28,
          damageType: 'CHIP',
          severity: 'LOW',
          origin: 'PRE_EXISTING',
          description: 'Minor stone chips on hood lip noted at auction yard intake.',
          estimatedCost: 200,
          confidence: 0.89,
          sourcePhotoUrl: 'https://example.com/intake-hood.jpg',
        },
      ],
    };

    const report = generateInsuranceClaimConditionReport(mockComparisonResult, mockShipment);

    assert.match(report.reportNumber, /^JACXI-ICR-/);
    assert.equal(report.vehicle.vin, '1HGCR2F83HA001234');
    assert.equal(report.journey.carrierName, 'Khyber Express Logistics');
    assert.equal(report.liability.carrierLiable, true);
    assert.equal(report.liability.claimEligibility, 'APPROVED_FOR_SUBROGATION');
    assert.equal(report.financials.totalClaimAmountUSD, 850);
    assert.equal(report.financials.preExistingDamageCostUSD, 200);
    assert.equal(report.financials.totalDamageAppraisedUSD, 1050);

    // Verify itemized damages
    const transitItems = report.items.filter((i) => i.origin === 'TRANSIT_INDUCED');
    assert.equal(transitItems.length, 2);
    assert.equal(transitItems[0].zone, 'Driver Front Door');
    assert.equal(transitItems[0].damageType, 'DENT');
    assert.match(transitItems[0].recommendedRepair, /hydraulic pull|PDR/i);

    // Verify formal legal certification text
    assert.match(report.formalCertification, /Carriage of Goods by Sea Act|COGSA/);
    assert.match(report.formalCertification, /Proof of Loss/);

    // Verify Markdown format
    assert.match(report.markdownReport, /# 📋 AUTOMATED VEHICLE CONDITION REPORT FOR INSURANCE CLAIMS/);
    assert.match(report.markdownReport, /\$850\.00 USD/);

    // Verify printable HTML
    assert.match(report.htmlReport, /<!DOCTYPE html>/);
    assert.match(report.htmlReport, /JACXI LOGISTICS & MARINE SURVEYS/);
  });

  it('runs compareTransitDamagesWithAi with mock response and attaches insuranceReport', async () => {
    const mockShipment = {
      id: 'ship-ai-mock-77',
      vehicleVIN: '3VW2B7AJ9HM098765',
      vehicleYear: 2021,
      vehicleMake: 'Volkswagen',
      vehicleModel: 'Jetta',
      vehicleColor: 'Pure White',
      vehiclePhotos: ['https://example.com/yard-intake.jpg'],
      arrivalPhotos: ['https://example.com/final-delivery.jpg'],
    };

    const mockAiVisionOutput = {
      hasNewTransitDamages: true,
      executiveSummary: 'Transit-induced left fender scrape and dent detected between yard baseline and delivery.',
      carrierLiabilityRecommendation: 'Proceed with carrier cargo claim.',
      damages: [
        {
          zone: 'Left Front Fender',
          view: 'left',
          x: 22,
          y: 48,
          damageType: 'DENT',
          severity: 'MEDIUM',
          origin: 'TRANSIT_INDUCED',
          description: 'New dent along wheel arch crease.',
          recommendedRepair: 'Paintless Dent Repair (PDR)',
          estimatedCost: 350,
          confidence: 0.94,
        },
      ],
    };

    const result = await compareTransitDamagesWithAi(mockShipment, {
      mockAiResponse: mockAiVisionOutput,
    });

    assert.equal(result.shipmentId, 'ship-ai-mock-77');
    assert.ok(result.transitComparison);
    assert.equal(result.transitComparison.hasNewTransitDamages, true);
    assert.equal(result.transitComparison.transitClaimLiabilityCost, 350);

    // Verify insuranceReport was automatically generated and attached
    assert.ok(result.insuranceReport);
    assert.equal(result.insuranceReport.liability.carrierLiable, true);
    assert.equal(result.insuranceReport.financials.totalClaimAmountUSD, 350);
    assert.equal(result.insuranceReport.items[0].damageType, 'DENT');
  });
});
