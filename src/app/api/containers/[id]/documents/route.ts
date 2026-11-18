import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { hasAnyPermission } from '@/lib/rbac';

const documentSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  fileUrl: z.string().min(1).refine((val) => val.startsWith('/') || /^https?:\/\//i.test(val), {
    message: 'fileUrl must be a valid URL or relative path',
  }),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative().optional().default(0),
  notes: z.string().optional(),
});

// GET - Fetch documents for a container
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where: Record<string, string> = { containerId: params.id };
    if (type) {
      where.type = type;
    }

    const documents = await prisma.containerDocument.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    // Group by type for easy filtering
    const groupedByType = documents.reduce((acc, doc) => {
      if (!acc[doc.type]) {
        acc[doc.type] = [];
      }
      acc[doc.type].push(doc);
      return acc;
    }, {} as Record<string, typeof documents>);

    return NextResponse.json({
      documents,
      groupedByType,
      count: documents.length,
    });
  } catch (error) {
    console.error('Error fetching container documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST - Add document to container
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins or authorized operations staff can add documents
    const canManageDocuments =
      session.user.role === 'admin' ||
      hasAnyPermission(session.user.role, ['containers:manage', 'documents:manage']);

    if (!canManageDocuments) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify container exists
    const container = await prisma.container.findUnique({
      where: { id: params.id },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = documentSchema.parse(body);

    const document = await prisma.containerDocument.create({
      data: {
        containerId: params.id,
        type: validatedData.type,
        name: validatedData.name,
        fileUrl: validatedData.fileUrl,
        fileType: validatedData.fileType,
        fileSize: validatedData.fileSize,
        uploadedBy: session.user.id as string,
        notes: validatedData.notes,
      },
    });

    // Create audit log
    await prisma.containerAuditLog.create({
      data: {
        containerId: params.id,
        action: 'DOCUMENT_UPLOADED',
        description: `Document uploaded: ${validatedData.name} (${validatedData.type})`,
        performedBy: session.user.id as string,
        newValue: validatedData.name,
      },
    });

    return NextResponse.json({
      document,
      message: 'Document uploaded successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// DELETE - Remove document
export async function DELETE(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    await prisma.containerDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
