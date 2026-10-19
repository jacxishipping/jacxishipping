import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getStoredSiteBranding,
  saveStoredSiteBranding,
  resetStoredSiteBranding,
} from '@/lib/services/site-branding-service';
import { createSystemAuditLog } from '@/lib/system-audit';

export async function GET() {
  try {
    const branding = await getStoredSiteBranding();
    return NextResponse.json({ branding }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error fetching site branding:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user.role || '').toLowerCase();
    const canManage = role === 'admin' || role === 'manager';
    if (!canManage) {
      return NextResponse.json(
        { message: 'Forbidden: Admin or Manager permission required to change branding' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (body.action === 'reset') {
      const resetBranding = await resetStoredSiteBranding();
      await createSystemAuditLog({
        action: 'settings-branding-reset',
        entityType: 'SITE_BRANDING',
        entityId: 'global',
        actorUserId: session.user.id,
        summary: 'Reset site branding and logo to system defaults',
      }).catch(() => null);

      return NextResponse.json({ branding: resetBranding, message: 'Branding reset to default' }, { status: 200 });
    }

    const { companyName, companyTagline, logoUrl, headerLogoUrl, faviconUrl } = body;

    const updates: Record<string, string> = {};
    if (typeof companyName === 'string') updates.companyName = companyName;
    if (typeof companyTagline === 'string') updates.companyTagline = companyTagline;
    if (typeof logoUrl === 'string') updates.logoUrl = logoUrl;
    if (typeof headerLogoUrl === 'string') updates.headerLogoUrl = headerLogoUrl;
    if (typeof faviconUrl === 'string') updates.faviconUrl = faviconUrl;

    const updatedBranding = await saveStoredSiteBranding(updates);

    await createSystemAuditLog({
      action: 'settings-branding-update',
      entityType: 'SITE_BRANDING',
      entityId: 'global',
      actorUserId: session.user.id,
      summary: `Updated site branding. Logo: ${updatedBranding.logoUrl}`,
      metadata: JSON.parse(JSON.stringify({
        fields: Object.keys(updates),
        branding: updatedBranding,
      })),
    }).catch(() => null);

    return NextResponse.json({ branding: updatedBranding, message: 'Branding updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating site branding:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
