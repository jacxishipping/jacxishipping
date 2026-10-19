import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { saveBrandLogoUpload } from '@/lib/services/site-branding-service';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user.role || '').toLowerCase();
    const canManage = role === 'admin' || role === 'manager';
    if (!canManage) {
      return NextResponse.json(
        { message: 'Forbidden: Admin or Manager permission required to upload logo' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file format. Please upload PNG, JPG, WebP, or SVG.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json(
        { message: 'Logo file size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    const result = await saveBrandLogoUpload(file);

    return NextResponse.json({
      message: 'Logo uploaded successfully',
      url: result.url,
      filename: result.filename,
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading brand logo:', error);
    return NextResponse.json({ message: 'Failed to upload brand logo' }, { status: 500 });
  }
}
