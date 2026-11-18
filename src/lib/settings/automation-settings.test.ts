import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStoredAutomationSettings,
  saveStoredAutomationSettings,
  DEFAULT_AUTOMATION_SETTINGS,
} from './automation-settings';

test('getStoredAutomationSettings returns valid default values', () => {
  const settings = getStoredAutomationSettings();
  assert.equal(typeof settings.autoInvoicingEnabled, 'boolean');
  assert.equal(typeof settings.autoInvoiceOnShipmentCreation, 'boolean');
  assert.equal(typeof settings.autoInvoiceOnContainerCompletion, 'boolean');
  assert.equal(typeof settings.autoInvoiceCronBatchEnabled, 'boolean');
  assert.equal(typeof settings.autoInvoicePaymentTermsDays, 'number');
  assert.equal(typeof settings.autoInvoiceSendEmail, 'boolean');
});

test('saveStoredAutomationSettings persists custom overrides', () => {
  const updated = saveStoredAutomationSettings({
    autoInvoicingEnabled: false,
    autoInvoicePaymentTermsDays: 45,
  });

  assert.equal(updated.autoInvoicingEnabled, false);
  assert.equal(updated.autoInvoicePaymentTermsDays, 45);

  const reloaded = getStoredAutomationSettings();
  assert.equal(reloaded.autoInvoicingEnabled, false);
  assert.equal(reloaded.autoInvoicePaymentTermsDays, 45);

  // Restore defaults
  saveStoredAutomationSettings(DEFAULT_AUTOMATION_SETTINGS);
  const restored = getStoredAutomationSettings();
  assert.equal(restored.autoInvoicingEnabled, true);
  assert.equal(restored.autoInvoicePaymentTermsDays, 30);
});

test('specific milestone toggles can be selectively toggled', () => {
  saveStoredAutomationSettings({
    autoInvoiceOnShipmentCreation: false,
    autoInvoiceOnContainerCompletion: true,
  });

  const settings = getStoredAutomationSettings();
  assert.equal(settings.autoInvoiceOnShipmentCreation, false);
  assert.equal(settings.autoInvoiceOnContainerCompletion, true);

  // Reset
  saveStoredAutomationSettings(DEFAULT_AUTOMATION_SETTINGS);
});

