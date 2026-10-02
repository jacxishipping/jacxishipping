import client from './client';
import { Invoice, InvoiceFilters, InvoiceListResponse, Payment } from '../types/invoice';
import { PaginationParams } from '../types/api';

export const invoicesApi = {
  async getInvoices(
    filters?: InvoiceFilters,
    pagination?: PaginationParams
  ): Promise<InvoiceListResponse> {
    // Backend supports status/userId/containerId/shipmentId/search + limit/offset
    // (see src/app/api/invoices/route.ts). Map the legacy mobile `customerId`
    // filter onto `userId` and never send unsupported date filters.
    const { customerId, userId, dateFrom: _dateFrom, dateTo: _dateTo, ...rest } = filters ?? {};
    void _dateFrom;
    void _dateTo;
    const response = await client.get<InvoiceListResponse>('/api/invoices', {
      params: {
        ...rest,
        userId: userId ?? customerId,
        limit: pagination?.pageSize,
        offset:
          pagination?.pageSize && pagination?.page
            ? (pagination.page - 1) * pagination.pageSize
            : undefined,
      },
    });
    return response.data;
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await client.get<Invoice>(`/api/invoices/${id}`);
    return response.data;
  },

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const response = await client.post<Invoice>('/api/invoices', data);
    return response.data;
  },

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const response = await client.patch<Invoice>(`/api/invoices/${id}`, data);
    return response.data;
  },

  async deleteInvoice(id: string): Promise<void> {
    await client.delete(`/api/invoices/${id}`);
  },

  async markAsPaid(
    id: string,
    payment?: Partial<Pick<Payment, 'method' | 'reference' | 'notes'>>,
  ): Promise<Invoice> {
    const response = await client.patch<Invoice>(`/api/invoices/${id}`, {
      status: 'PAID',
      paidDate: new Date().toISOString(),
      paymentMethod: payment?.method,
      paymentReference: payment?.reference,
      notes: payment?.notes,
    });
    return response.data;
  },

  async downloadInvoice(id: string): Promise<Blob> {
    // React Native has no Blob URL download affordance; request raw bytes and
    // let the caller hand them to expo-file-system / sharing.
    const response = await client.get(`/api/invoices/${id}/pdf`, {
      responseType: 'arraybuffer',
    });
    return response.data;
  },
};
