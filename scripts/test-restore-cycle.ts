import { backupService } from '../src/lib/services/backup-service';

async function main() {
  console.log('1. Creating backup...');
  const { backup, filename } = await backupService.createBackup();
  console.log('Backup created:', filename, 'total records:', backup.totalRecords);

  console.log('2. Attempting to restore newly created backup...');
  const res = await backupService.restoreBackup({ backupContent: backup });
  console.log('Restore result:', JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error('FAILED WITH ERROR:', err);
  process.exit(1);
});
