import test from 'node:test';
import assert from 'node:assert/strict';
import {
  processAdminCopilotMessage,
  searchShipmentsTool,
  searchContainersTool,
  getSystemOverviewTool,
  updateShipmentStatusTool,
} from './admin-copilot';

const mockAdminUser = {
  id: 'usr_test_admin_001',
  name: 'System Admin',
  email: 'admin@jacxishipping.com',
  role: 'admin',
};

test('processAdminCopilotMessage handles system overview intent', async () => {
  const res = await processAdminCopilotMessage('give me a shipping overview and stats', [], mockAdminUser);
  assert.equal(res.toolExecuted, 'get_system_overview');
  assert.ok(res.reply.includes('Operations Overview'));
  assert.ok(res.actionCards && res.actionCards.length > 0);
  assert.equal(res.actionCards[0].type, 'OVERVIEW');
});

test('processAdminCopilotMessage detects 17-char VIN query', async () => {
  const sampleVin = '1HGCR2F83HA001234';
  const res = await processAdminCopilotMessage(`Check status of VIN ${sampleVin}`, [], mockAdminUser);
  assert.equal(res.toolExecuted, 'search_shipments');
  assert.ok(res.actionCards);
});

test('processAdminCopilotMessage detects standard container number', async () => {
  const containerNum = 'CAAU5189072';
  const res = await processAdminCopilotMessage(`Find container ${containerNum}`, [], mockAdminUser);
  assert.equal(res.toolExecuted, 'search_containers');
  assert.ok(res.actionCards);
});

test('processAdminCopilotMessage handles invoices inquiry', async () => {
  const res = await processAdminCopilotMessage('show unpaid invoices', [], mockAdminUser);
  assert.equal(res.toolExecuted, 'list_invoices');
  assert.ok(res.actionCards);
});

test('processAdminCopilotMessage handles customer ledger balances', async () => {
  const res = await processAdminCopilotMessage('what is the balance of customer Alex', [], mockAdminUser);
  assert.equal(res.toolExecuted, 'get_customer_ledger');
  assert.ok(res.actionCards);
});

test('processAdminCopilotMessage handles dispatches inquiry', async () => {
  const res = await processAdminCopilotMessage('list all dispatches and towing orders', [], mockAdminUser);
  assert.equal(res.toolExecuted, 'list_dispatches');
  assert.ok(res.actionCards);
});

test('updateShipmentStatusTool rejects invalid status', async () => {
  const res = await updateShipmentStatusTool('any-id', 'BOGUS_STATUS', mockAdminUser);
  assert.ok(res.reply.includes('Invalid status'));
});

test('processAdminCopilotMessage handles carrier partner queries', async () => {
  const res = await processAdminCopilotMessage('who are our towing carriers and companies?', [], mockAdminUser);
  assert.equal(res.toolExecuted, 'search_carriers');
  assert.ok(res.actionCards);
});

test('processAdminCopilotMessage handles damage and condition report queries', async () => {
  const res = await processAdminCopilotMessage('show me vehicles with damage and scratches', [], mockAdminUser);
  assert.equal(res.toolExecuted, 'get_damage_summary');
  assert.ok(res.actionCards);
});

test('processAdminCopilotMessage handles WhatsApp draft intent', async () => {
  const res = await processAdminCopilotMessage('draft whatsapp update for 1HGCR2F83HA001234', [], mockAdminUser);
  assert.equal(res.toolExecuted, 'draft_whatsapp');
  assert.ok(res.actionCards);
});

test('processAdminCopilotMessage handles navigation intent', async () => {
  const res = await processAdminCopilotMessage('go to automation settings', [], mockAdminUser);
  assert.equal(res.toolExecuted, 'navigate_admin');
  assert.ok(res.actionCards && res.actionCards[0].type === 'NAVIGATION');
  assert.ok(res.actionCards[0].primaryAction?.href?.includes('/dashboard/settings'));
});


