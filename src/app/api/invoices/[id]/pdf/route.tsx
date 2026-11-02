import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { prisma } from '@/lib/db';
import InvoiceTemplate from '@/components/invoices/pdf/InvoiceTemplate';
import { auth } from '@/lib/auth';
import { verifySignedDownloadToken } from '../../../../../../mcps/jacxishipping/src/oauth';
import { verifyAuth } from '../../../../../../mcps/jacxishipping/src/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const token = request.nextUrl.searchParams.get('token');

        let isAuthorized = false;
        if (token) {
            const verified =
                verifySignedDownloadToken(token, 'invoice', id) ||
                verifySignedDownloadToken(token, 'invoice');
            if (verified) isAuthorized = true;
        }

        if (!isAuthorized) {
            const session = await auth();
            if (session?.user) {
                isAuthorized = true;
            } else {
                const mcpAuth = await verifyAuth(request);
                if (mcpAuth.authenticated) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const invoice = await prisma.userInvoice.findFirst({
            where: {
                OR: [
                    { id },
                    { invoiceNumber: { equals: id, mode: 'insensitive' } },
                ],
            },
            include: {
                user: true,
                container: true,
                shipment: true,
                lineItems: {
                    include: {
                        shipment: true,
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });

        if (!invoice) {
            return new NextResponse('Invoice not found', { status: 404 });
        }

        // Render PDF
        // @ts-ignore - renderToStream types can be tricky with NextResponse
        const stream = await renderToStream(<InvoiceTemplate invoice={invoice} />);

        const isDownload = request.nextUrl.searchParams.get('download') === '1';
        const disposition = isDownload ? 'attachment' : 'inline';

        return new NextResponse(stream as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `${disposition}; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
            },
        });
    } catch (error) {
        console.error('PDF Generation Error:', error);
        return new NextResponse('Error generating PDF', { status: 500 });
    }
}
