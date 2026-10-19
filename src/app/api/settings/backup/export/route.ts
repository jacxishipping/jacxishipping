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
    const catParam = searchParams.get('categories');
    const categories = catParam ? catParam.split(',').filter(Boolean) : undefined;

    const result = await backupService.createBackup({
      categories,
      initiatedBy: session.user.email || 'Admin',
    });

    const jsonStr = JSON.stringify(result.backup, null, 2);

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to generate backup' },
      { status: 500 }
    );
  }
}
