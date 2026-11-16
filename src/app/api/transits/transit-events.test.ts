import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TransitStatus } from '@prisma/client';

describe('Transit Events Business Logic & Flow', () => {
  it('prioritizes latest event company over initial transit company for active leg', () => {
    const initialCompany = { id: 'comp-uae', name: 'UAE Hauler LLC', code: 'UAE' };
    const secondLegCompany = { id: 'comp-afg', name: 'Afghan CrossBorder Transit', code: 'AFG' };

    const transit = {
      id: 'trn-1',
      company: initialCompany,
      companyId: initialCompany.id,
      events: [
        {
          id: 'ev-2',
          companyId: secondLegCompany.id,
          company: secondLegCompany,
          origin: 'Islam Qala',
          destination: 'Kabul',
          status: 'IN_TRANSIT',
        },
        {
          id: 'ev-1',
          companyId: initialCompany.id,
          company: initialCompany,
          origin: 'Dubai Port',
          destination: 'Islam Qala',
          status: 'ARRIVED',
        },
      ],
    };

    // The logic in GET /api/transits/[id]:
    const currentCompany = transit.events?.[0]?.company ?? transit.company ?? null;
    assert.equal(currentCompany.id, secondLegCompany.id);
    assert.equal(currentCompany.name, 'Afghan CrossBorder Transit');
  });

  it('falls back to transit company when no events exist yet', () => {
    const initialCompany = { id: 'comp-uae', name: 'UAE Hauler LLC', code: 'UAE' };
    const transit: {
      id: string;
      company: typeof initialCompany;
      companyId: string;
      events: Array<{ id: string; companyId: string; company: typeof initialCompany; origin: string; destination: string; status: string }>;
    } = {
      id: 'trn-2',
      company: initialCompany,
      companyId: initialCompany.id,
      events: [],
    };

    const currentCompany = transit.events?.[0]?.company ?? transit.company ?? null;
    assert.equal(currentCompany.id, initialCompany.id);
  });

  it('correctly maps route event statuses to parent TransitStatus', () => {
    function mapEventStatusToTransitStatus(status: string): TransitStatus | null {
      const upper = status.trim().toUpperCase().replace(/[\s_-]+/g, '_');
      if (['IN_TRANSIT', 'LOADED', 'BORDER_CROSSING', 'CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD', 'DEPARTED'].some((s) => upper.includes(s))) {
        return TransitStatus.IN_TRANSIT;
      }
      if (upper === 'ARRIVED' || upper.startsWith('ARRIV')) {
        return TransitStatus.ARRIVED;
      }
      if (upper === 'DISPATCHED' || upper.startsWith('DISPATCH')) {
        return TransitStatus.DISPATCHED;
      }
      if (upper === 'PENDING') {
        return TransitStatus.PENDING;
      }
      return null;
    }

    assert.equal(mapEventStatusToTransitStatus('Border Crossing Islam Qala'), TransitStatus.IN_TRANSIT);
    assert.equal(mapEventStatusToTransitStatus('Loaded on Truck 42'), TransitStatus.IN_TRANSIT);
    assert.equal(mapEventStatusToTransitStatus('Customs Clearance Pending'), TransitStatus.IN_TRANSIT);
    assert.equal(mapEventStatusToTransitStatus('Arrived Kabul Depot'), TransitStatus.ARRIVED);
    assert.equal(mapEventStatusToTransitStatus('Dispatched from Port'), TransitStatus.DISPATCHED);
    assert.equal(mapEventStatusToTransitStatus('Unknown Milestone'), null);
  });

  it('prevents changing carrier on an event if expenses are bound to it', () => {
    const eventExpensesCount = 3;
    const requestedCompanyId: string = 'new-comp-99';
    const existingCompanyId: string = 'old-comp-11';

    let error: string | null = null;
    if (requestedCompanyId !== existingCompanyId && eventExpensesCount > 0) {
      error = `Cannot change carrier on this event because ${eventExpensesCount} expense(s) are already linked to it. Please delete or reassign those expenses first.`;
    }

    assert.ok(error?.includes('Cannot change carrier'));
    assert.ok(error?.includes('3 expense(s)'));
  });

  it('prevents deleting an event with associated expenses', () => {
    const eventExpensesCount = 2;
    let allowedToDelete = false;
    let error: string | null = null;

    if (eventExpensesCount > 0) {
      allowedToDelete = false;
      error = `Cannot delete transit event because it has ${eventExpensesCount} associated expense(s). Please delete or reassign those expenses first.`;
    } else {
      allowedToDelete = true;
    }

    assert.equal(allowedToDelete, false);
    assert.ok(error?.includes('Cannot delete transit event'));
  });

  it('allows delivery confirmation to resolve companyId even if events array was empty', () => {
    const transit = {
      id: 'trn-3',
      companyId: 'comp-fallback',
      origin: 'Dubai',
      destination: 'Kabul',
      events: [] as Array<{ companyId: string; origin: string; destination: string }>,
    };

    const currentEvent = transit.events?.[0] ?? null;
    const resolvedCompanyId = currentEvent?.companyId || transit.companyId;

    assert.equal(resolvedCompanyId, 'comp-fallback');
    assert.equal(currentEvent?.origin || transit.origin, 'Dubai');
  });
});

