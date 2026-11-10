/**
 * Tests for shared tracking utility functions.
 * Run with: npx tsx --test src/lib/tracking-utils.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isCompletedStatus, calculateProgress, calculateProgressFromStatus } from './tracking-utils';

describe('isCompletedStatus', () => {
	it('returns true for delivered status', () => {
		assert.strictEqual(isCompletedStatus('Delivered'), true);
		assert.strictEqual(isCompletedStatus('delivered'), true);
		assert.strictEqual(isCompletedStatus('Out for Delivery'), false);
	});

	it('returns true for completed status', () => {
		assert.strictEqual(isCompletedStatus('Completed'), true);
		assert.strictEqual(isCompletedStatus('completed'), true);
	});

	it('returns true for arrived status', () => {
		assert.strictEqual(isCompletedStatus('Arrived at Port'), true);
		assert.strictEqual(isCompletedStatus('arrived'), true);
	});

	it('returns true for released status', () => {
		assert.strictEqual(isCompletedStatus('Released'), true);
		assert.strictEqual(isCompletedStatus('released from customs'), true);
	});

	it('returns true for cleared status', () => {
		assert.strictEqual(isCompletedStatus('Cleared'), true);
		assert.strictEqual(isCompletedStatus('Customs Clearance'), false);
	});

	it('returns false for non-completed statuses', () => {
		assert.strictEqual(isCompletedStatus('In Transit'), false);
		assert.strictEqual(isCompletedStatus('Loaded'), false);
		assert.strictEqual(isCompletedStatus('Booked'), false);
		assert.strictEqual(isCompletedStatus(''), false);
	});

	it('is case-insensitive', () => {
		assert.strictEqual(isCompletedStatus('ARRIVED'), true);
		assert.strictEqual(isCompletedStatus('DELIVERED'), true);
		assert.strictEqual(isCompletedStatus('RELEASED'), true);
	});
});

describe('calculateProgress', () => {
	it('returns 10 for booking status', () => {
		assert.strictEqual(calculateProgress('Booked'), 10);
		assert.strictEqual(calculateProgress('Booking Confirmed'), 10);
	});

	it('returns 20 for pickup/empty status', () => {
		assert.strictEqual(calculateProgress('Pickup Arranged'), 20);
		assert.strictEqual(calculateProgress('Empty Container'), 20);
	});

	it('returns 25 for loading status', () => {
		assert.strictEqual(calculateProgress('Loading'), 25);
	});

	it('returns 30 for loaded status', () => {
		assert.strictEqual(calculateProgress('Loaded'), 30);
		assert.strictEqual(calculateProgress('Loaded on Vessel'), 30);
	});

	it('returns 35 for dock status', () => {
		assert.strictEqual(calculateProgress('At Dock'), 35);
	});

	it('returns 40 for departure status', () => {
		assert.strictEqual(calculateProgress('Departed'), 40);
		assert.strictEqual(calculateProgress('Departure'), 40);
	});

	it('returns 60 for transit/ocean status', () => {
		assert.strictEqual(calculateProgress('In Transit'), 60);
		assert.strictEqual(calculateProgress('Ocean Voyage'), 60);
	});

	it('returns 75 for arrived status', () => {
		assert.strictEqual(calculateProgress('Arrived at Port'), 75);
	});

	it('returns 85 for customs status', () => {
		assert.strictEqual(calculateProgress('Customs Clearance'), 85);
	});

	it('returns 90 for released/cleared status', () => {
		assert.strictEqual(calculateProgress('Released'), 90);
		assert.strictEqual(calculateProgress('Cleared'), 90);
	});

	it('returns 95 for delivery/out for status', () => {
		assert.strictEqual(calculateProgress('Out for Delivery'), 95);
		assert.strictEqual(calculateProgress('Delivery Scheduled'), 95);
	});

	it('returns 100 for delivered/completed status', () => {
		assert.strictEqual(calculateProgress('Delivered'), 100);
		assert.strictEqual(calculateProgress('Completed'), 100);
	});

	it('returns 50 as default for unknown statuses', () => {
		assert.strictEqual(calculateProgress('Unknown'), 50);
		assert.strictEqual(calculateProgress(''), 50);
	});

	it('is case-insensitive', () => {
		assert.strictEqual(calculateProgress('IN TRANSIT'), 60);
		assert.strictEqual(calculateProgress('ARRIVED'), 75);
	});
});

describe('calculateProgressFromStatus', () => {
	it('returns same as calculateProgress for a given status', () => {
		assert.strictEqual(calculateProgressFromStatus('In Transit'), calculateProgress('In Transit'));
		assert.strictEqual(calculateProgressFromStatus('Delivered'), calculateProgress('Delivered'));
	});

	it('returns 50 for undefined/empty', () => {
		assert.strictEqual(calculateProgressFromStatus(undefined), 50);
		assert.strictEqual(calculateProgressFromStatus(''), 50);
	});
});
