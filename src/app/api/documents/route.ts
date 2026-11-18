import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { DocumentCategory } from '@prisma/client';

const VALID_DOCUMENT_CATEGORIES: Set<DocumentCategory> = new Set([
  'INVOICE',
  'BILL_OF_LADING',
  'CUSTOMS',
  'INSURANCE',
  'TITLE',
  'INSPECTION_REPORT',
  'PHOTO',
  'CONTRACT',
  'OTHER',
  'EXPORT_DOCUMENT',
  'PACKING_LIST',
]);

function normalizeDocumentCategory(input?: string | null): DocumentCategory {
  if (!input) return 'OTHER';
  const clean = input.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (VALID_DOCUMENT_CATEGORIES.has(clean as DocumentCategory)) {
    return clean as DocumentCategory;
  }
  if (clean.includes('INVOICE') || clean.includes('BILL_OF_SALE')) return 'INVOICE';
  if (clean.includes('LADING') || clean.includes('BOL')) return 'BILL_OF_LADING';
  if (clean.includes('CUSTOM')) return 'CUSTOMS';
  if (clean.includes('INSUR')) return 'INSURANCE';
  if (clean.includes('TITLE')) return 'TITLE';
  if (clean.includes('INSPECT')) return 'INSPECTION_REPORT';
  if (clean.includes('EXPORT')) return 'EXPORT_DOCUMENT';
  if (clean.includes('PACK')) return 'PACKING_LIST';
  if (clean.includes('PHOTO') || clean.includes('IMAGE')) return 'PHOTO';
  if (clean.includes('CONTRACT') || clean.includes('AGREEMENT')) return 'CONTRACT';
  return 'OTHER';
}

// GET: Fetch documents
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipmentId');
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    type WhereType = {
      OR?: Array<Record<string, unknown>>;
      AND?: Array<Record<string, unknown>>;
      shipmentId?: string;
      userId?: string;
      category?: DocumentCategory;
      isPublic?: boolean;
    };
    const where: WhereType = {};
    
    // Non-admin users can only see their own documents or public ones
    if (session.user?.role !== 'admin') {
      where.OR = [
        { userId: session.user?.id },
        { isPublic: true },
      ];
    }

    if (shipmentId) where.shipmentId = shipmentId;
    if (userId && session.user?.role === 'admin') where.userId = userId;
    if (category) where.category = normalizeDocumentCategory(category);
    if (isPublic !== null) where.isPublic = isPublic === 'true';

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          shipment: {
            select: {
              id: true,
              vehicleType: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({ 
      documents,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Upload document
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      name,
      description,
      fileUrl,
      fileType,
      fileSize,
      category,
      shipmentId,
      userId,
      isPublic,
      tags,
    } = data;

    if (!name || !fileUrl || !fileType) {
      return NextResponse.json(
        { message: 'Name, file URL, and file type are required' },
        { status: 400 }
      );
    }

    const safeCategory = normalizeDocumentCategory(category);
    const parsedFileSize = typeof fileSize === 'number'
      ? Math.max(0, Math.round(fileSize))
      : parseInt(String(fileSize || 0), 10) || 0;

    // Verify shipment existence if shipmentId is provided
    let safeShipmentId: string | null = null;
    if (shipmentId && typeof shipmentId === 'string' && shipmentId.trim().length > 0) {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId.trim() },
        select: { id: true },
      });
      if (shipment) {
        safeShipmentId = shipment.id;
      }
    }

    const document = await prisma.document.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        fileUrl: String(fileUrl).trim(),
        fileType: String(fileType).trim(),
        fileSize: parsedFileSize,
        category: safeCategory,
        shipmentId: safeShipmentId,
        userId: userId || session.user?.id,
        uploadedBy: session.user?.name || session.user?.email || 'Unknown',
        isPublic: Boolean(isPublic),
        tags: Array.isArray(tags) ? tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
      },
      include: {
        shipment: {
          select: {
            id: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Document uploaded successfully', document },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
