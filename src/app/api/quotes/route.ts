import { NextRequest, NextResponse } from 'next/server';
import { QuoteStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

const createQuoteSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Invalid email address').max(160),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 characters').max(40),
  message: z.string().trim().min(3, 'Message is required').max(4000),
  // Silent anti-spam honeypot field — legitimate users never populate this
  website: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    const parsed = createQuoteSchema.safeParse(rawData);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Name, email, phone, and message are required';
      return NextResponse.json(
        { message: firstError },
        { status: 400 }
      );
    }

    const { name, email, phone, message, website } = parsed.data;

    if (website && website.trim().length > 0) {
      return NextResponse.json(
        { message: 'Quote request submitted successfully' },
        { status: 201 }
      );
    }

    const quote = await prisma.quote.create({
      data: {
        name,
        email,
        phone,
        message,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      { message: 'Quote request submitted successfully', quote },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'customers:view')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status')?.trim().toUpperCase();
    const validStatuses = Object.values(QuoteStatus) as string[];
    const where: Prisma.QuoteWhereInput =
      statusParam && validStatuses.includes(statusParam)
        ? { status: statusParam as QuoteStatus }
        : {};

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ quotes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

