import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { OfficeExpenseCategory, ExpensePaymentStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expense = await prisma.officeExpense.findUnique({
      where: { id: params.id },
      include: {
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error fetching office expense detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch office expense details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user?.id ? [{ id: session.user.id }] : []),
          ...(session.user?.email ? [{ email: session.user.email }] : []),
        ],
      },
      select: { id: true, role: true, email: true },
    });

    const role = (dbUser?.role || session.user.role || '').toLowerCase();
    const canManage =
      role === 'admin' ||
      role === 'finance' ||
      role === 'manager' ||
      role === 'operations' ||
      role === 'user' ||
      hasPermission(role, 'finance:manage') ||
      hasPermission(role, 'expenses:post') ||
      Boolean(session.user);

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.officeExpense.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      category,
      amount,
      currency,
      expenseDate,
      paymentMethod,
      vendor,
      referenceNumber,
      receiptUrl,
      receiptName,
      notes,
      status,
    } = body;

    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      data.title = title.trim();
    }

    if (amount !== undefined) {
      const cleanAmt = String(amount ?? '').replace(/[^\d.-]/g, '');
      const parsedAmount = parseFloat(cleanAmt);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 });
      }
      data.amount = parsedAmount;
    }

    if (category !== undefined) {
      if (Object.values(OfficeExpenseCategory).includes(category)) {
        data.category = category;
      }
    }

    if (status !== undefined) {
      if (Object.values(ExpensePaymentStatus).includes(status)) {
        data.status = status;
      }
    }

    if (currency !== undefined) data.currency = String(currency || 'USD').toUpperCase().trim();
    if (expenseDate !== undefined) {
      const parsed = new Date(expenseDate);
      if (!isNaN(parsed.getTime())) {
        data.expenseDate = parsed;
      }
    }
    if (paymentMethod !== undefined) data.paymentMethod = String(paymentMethod).toUpperCase().trim();
    if (vendor !== undefined) data.vendor = vendor ? String(vendor).trim() : null;
    if (referenceNumber !== undefined) data.referenceNumber = referenceNumber ? String(referenceNumber).trim() : null;
    if (receiptUrl !== undefined) data.receiptUrl = receiptUrl ? String(receiptUrl).trim() : null;
    if (receiptName !== undefined) data.receiptName = receiptName ? String(receiptName).trim() : null;
    if (notes !== undefined) data.notes = notes ? String(notes).trim() : null;

    const updated = await prisma.officeExpense.update({
      where: { id: params.id },
      data,
      include: {
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Office expense updated successfully',
      expense: updated,
    });
  } catch (error) {
    console.error('Error updating office expense:', error);
    const message = error instanceof Error ? error.message : 'Failed to update office expense';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user?.id ? [{ id: session.user.id }] : []),
          ...(session.user?.email ? [{ email: session.user.email }] : []),
        ],
      },
      select: { id: true, role: true, email: true },
    });

    const role = (dbUser?.role || session.user.role || '').toLowerCase();
    const canManage =
      role === 'admin' ||
      role === 'finance' ||
      role === 'manager' ||
      role === 'operations' ||
      role === 'user' ||
      hasPermission(role, 'finance:manage') ||
      Boolean(session.user);

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.officeExpense.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.officeExpense.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Office expense deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting office expense:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete office expense';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
