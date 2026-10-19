import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { backupService } from '@/lib/services/backup-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
    }

    const content = await backupService.readBackupFile(filename);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to download backup' },
      { status: 404 }
    );
  }
}
