import fs from 'node:fs';
import { backupService } from '../src/lib/services/backup-service';

async function main() {
  console.log('Testing preview...');
  const content = fs.readFileSync('./backups/jacxi-backup-2025-11-08T20-30-05-254Z.json', 'utf-8');
  const preview = backupService.previewBackup(content);
  console.log('Preview:', JSON.stringify(preview, null, 2));

  console.log('Testing restore...');
  const res = await backupService.restoreBackup({ backupContent: content });
  console.log('Restore result:', JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error('FAILED WITH ERROR:', err);
  process.exit(1);
});
