import test from 'node:test';
import assert from 'node:assert/strict';
import { backupService, BACKUP_CATEGORIES } from '@/lib/services/backup-service';

test('BackupService operations and validation', async (t) => {
  await t.test('has complete list of backup categories', () => {
    assert.ok(BACKUP_CATEGORIES.length >= 8);
    const categoryIds = BACKUP_CATEGORIES.map((c) => c.id);
    assert.ok(categoryIds.includes('shipments'));
    assert.ok(categoryIds.includes('containers'));
    assert.ok(categoryIds.includes('companies'));
    assert.ok(categoryIds.includes('financials'));
    assert.ok(categoryIds.includes('logistics'));
    assert.ok(categoryIds.includes('partners'));
    assert.ok(categoryIds.includes('settings'));
    assert.ok(categoryIds.includes('users'));
  });

  await t.test('previewBackup accurately validates valid backup payload', () => {
    const mockBackup = {
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      scope: 'custom',
      totalRecords: 3,
      data: {
        shipments: [
          { id: 'ship-1', vehicleVIN: '1HGBH41JXMN109186', vehicleMake: 'Toyota', vehicleModel: 'Camry' },
        ],
        containers: [
          { id: 'cont-1', containerNumber: 'TRKU1234567' },
        ],
        companies: [
          { id: 'comp-1', name: 'Test Shipping Line' },
        ],
      },
    };

    const preview = backupService.previewBackup(mockBackup);
    assert.equal(preview.valid, true);
    assert.equal(preview.version, '1.2.0');
    assert.equal(preview.totalRecords, 3);
    assert.ok(preview.categoriesAvailable.includes('shipments'));
    assert.ok(preview.categoriesAvailable.includes('containers'));
    assert.ok(preview.categoriesAvailable.includes('companies'));
    assert.equal(preview.modelsFound.shipments, 1);
    assert.equal(preview.modelsFound.containers, 1);
    assert.equal(preview.modelsFound.companies, 1);
  });

  await t.test('previewBackup handles invalid payloads gracefully', () => {
    const invalidPreview = backupService.previewBackup('not json');
    assert.equal(invalidPreview.valid, false);
    assert.ok(invalidPreview.error);

    const emptyObjPreview = backupService.previewBackup({});
    assert.equal(emptyObjPreview.valid, false);
  });

  await t.test('listStoredBackups returns array of files with metadata', async () => {
    const listResult = await backupService.listStoredBackups();
    assert.ok(Array.isArray(listResult.backups));
    assert.ok(listResult.backupPath);
  });

  await t.test('createBackup generates valid payload for custom categories', async () => {
    const res = await backupService.createBackup({ categories: ['settings'], initiatedBy: 'tester' });
    assert.ok(res.backup);
    assert.equal(res.backup.version, '1.2.0');
    assert.equal(res.backup.scope, 'custom');
    assert.ok(Array.isArray(res.backup.selectedCategories));
    assert.ok(res.filename.startsWith('jacxi-backup-'));
  });
});
