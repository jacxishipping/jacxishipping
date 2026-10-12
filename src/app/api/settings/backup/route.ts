import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { backupService, BACKUP_CATEGORIES } from '@/lib/services/backup-service';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// GET - Retrieve backup overview, stored backup history, live DB stats, and categories
export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const [storedInfo, dbStats] = await Promise.all([
      backupService.listStoredBackups(),
      backupService.getDatabaseStats(),
    ]);

    return NextResponse.json({
      lastBackupAt: storedInfo.lastBackupAt,
      backupPath: storedInfo.backupPath,
      backups: storedInfo.backups,
      dbStats,
      supportedCategories: BACKUP_CATEGORIES,
    });
  } catch (error: any) {
    logger.error('Failed to get backup metadata:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve backup info', error: error?.message },
      { status: 500 }
    );
  }
}

// POST - Execute backup, restore, preview, or delete
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body?.action || 'backup';

    // 1. Create Backup (Full or Custom)
    if (action === 'backup') {
      const categories = Array.isArray(body?.categories) ? body.categories : undefined;
      const result = await backupService.createBackup({
        categories,
        initiatedBy: session.user.email || 'Admin',
      });

      return NextResponse.json({
        success: true,
        message: `Backup created successfully (${result.backup.totalRecords} records).`,
        lastBackupAt: result.lastBackupAt,
        backupPath: result.filePath,
        filename: result.filename,
        totalRecords: result.backup.totalRecords,
        stats: result.backup.stats,
        scope: result.backup.scope,
        backup: result.backup, // Included so frontend can download directly
      });
    }

    // 2. Preview Backup (Inspect uploaded content or server backup)
    if (action === 'preview') {
      let content = body?.backupContent;
      if (!content && body?.filename) {
        content = await backupService.readBackupFile(body.filename);
      }

      if (!content) {
        return NextResponse.json(
          { message: 'No backup content or filename provided' },
          { status: 400 }
        );
      }

      const preview = backupService.previewBackup(content);
      return NextResponse.json(preview);
    }

    // 3. Restore Backup (Full or Custom)
    if (action === 'restore') {
      let content = body?.backupContent;
      if (!content && body?.filename) {
        content = await backupService.readBackupFile(body.filename);
      }

      if (!content) {
        return NextResponse.json(
          { message: 'Please provide backup content or select a stored backup file' },
          { status: 400 }
        );
      }

      const selectedCategories = Array.isArray(body?.selectedCategories) 
        ? body.selectedCategories 
        : undefined;

      const result = await backupService.restoreBackup({
        backupContent: content,
        selectedCategories,
      });

      if (!result.success) {
        return NextResponse.json(
          { message: result.message || 'Restoration failed', errors: result.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    }

    // 4. Delete Stored Backup
    if (action === 'delete') {
      const filename = body?.filename;
      if (!filename) {
        return NextResponse.json(
          { message: 'Filename is required' },
          { status: 400 }
        );
      }

      await backupService.deleteBackup(filename);
      return NextResponse.json({
        success: true,
        message: `Backup file ${filename} deleted successfully.`,
      });
    }

    return NextResponse.json(
      { message: `Unknown backup action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error('Error executing backup operation:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to process backup request' },
      { status: 500 }
    );
  }
}
