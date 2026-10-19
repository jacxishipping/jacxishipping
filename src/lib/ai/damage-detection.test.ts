import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertAiResultToInspectionData,
  AiDamageDetectionResult,
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
});
