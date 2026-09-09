import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPaymentReminderEmail } from '@/lib/email';
import { validateCronRequest } from '@/lib/cron-auth';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    
    // Find overdue invoices that are still pending
    const overdueInvoices = await prisma.userInvoice.findMany({
      where: {
        status: {
          in: ['PENDING', 'SENT'],
        },
        dueDate: {
          lt: today,
        },
      },
      include: {
        user: true,
      },
    });

    const results = [];
    let remindersSent = 0;
    const invoiceIdsToUpdateToOverdue: string[] = [];

    for (const invoice of overdueInvoices) {
      if (!invoice.dueDate) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send reminders at specific intervals: 3, 7, 14, 30 days overdue
      const shouldSendReminder = [3, 7, 14, 30].includes(daysOverdue);

      if (shouldSendReminder && invoice.user.email) {
        const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invoices/${invoice.id}/pdf`;
        
        const emailResult = await sendPaymentReminderEmail({
          to: invoice.user.email,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.total,
          dueDate: new Date(invoice.dueDate).toLocaleDateString(),
          daysOverdue,
          pdfUrl,
        });

        if (emailResult.success) {
          remindersSent++;
          
          // Mark for status update to OVERDUE if not already
          if (invoice.status !== 'OVERDUE') {
            invoiceIdsToUpdateToOverdue.push(invoice.id);
          }

          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            emailSent: true,
            recipient: invoice.user.email,
          });
        } else {
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            emailSent: false,
            error: 'Email send failed',
          });
        }
      } else if (daysOverdue > 0 && invoice.status !== 'OVERDUE') {
        // Mark for status update to OVERDUE even if we don't send a reminder
        invoiceIdsToUpdateToOverdue.push(invoice.id);
      }
    }

    // Batch update invoice statuses to OVERDUE
    if (invoiceIdsToUpdateToOverdue.length > 0) {
      await prisma.userInvoice.updateMany({
        where: {
          id: { in: invoiceIdsToUpdateToOverdue },
        },
        data: {
          status: 'OVERDUE',
        },
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        overdueInvoicesChecked: overdueInvoices.length,
        remindersSent: remindersSent,
        statusUpdatedToOverdue: invoiceIdsToUpdateToOverdue.length,
      },
      details: results,
    });
  } catch (error) {
    console.error('Payment reminder cron failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process payment reminders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
