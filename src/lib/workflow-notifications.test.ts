import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sendShipmentWorkflowNotifications } from './workflow-notifications.ts';

describe('Workflow Notifications & Automated WhatsApp Milestones', () => {
  it('sends automated WhatsApp messages to customer users with valid phones', async () => {
    const sentWhatsAppMessages: Array<{ to: string; body: string }> = [];
    const createdInAppNotifications: any[] = [];

    const mockPrisma: any = {
      user: {
        findMany: async ({ where }: any) => {
          if (where?.role?.not === 'user') {
            return [{ id: 'admin-1', role: 'admin' }];
          }
          if (where?.id?.in) {
            return [
              { id: 'cust-1', name: 'Ahmad Khan', phone: '+93704111222' },
              { id: 'cust-2', name: 'Karim Rahimi', phone: '+971501234567' },
            ];
          }
          return [];
        },
      },
      userSettings: {
        findMany: async () => [
          { userId: 'cust-1', notifyShipmentPush: true },
          { userId: 'cust-2', notifyShipmentPush: true },
        ],
      },
    };

    const mockCreateNotifications = async (items: any[]) => {
      createdInAppNotifications.push(...items);
      return { count: items.length };
    };

    const mockSendWhatsApp = async (payload: { to: string; body: string }) => {
      sentWhatsAppMessages.push(payload);
      return { success: true, provider: 'meta_cloud' as const, deliveryMode: 'meta_cloud_api' as const, normalizedPhone: payload.to };
    };

    const result = await sendShipmentWorkflowNotifications(
      'admin-actor',
      [
        {
          shipmentId: 'ship-1',
          shipmentUserId: 'cust-1',
          title: 'Transit Milestone: BORDER_CROSSING',
          customerDescription: 'Toyota Camry milestone reached on leg Islam Qala → Herat.',
          link: '/dashboard/shipments/ship-1',
        },
        {
          shipmentId: 'ship-2',
          shipmentUserId: 'cust-2',
          title: 'Transit Milestone: ARRIVED',
          customerDescription: 'BMW X5 milestone reached at Kabul Warehouse.',
          link: '/dashboard/shipments/ship-2',
        },
      ],
      {
        prisma: mockPrisma,
        createNotificationsFn: mockCreateNotifications,
        sendWhatsAppFn: mockSendWhatsApp as any,
      }
    );

    assert.equal(result.whatsappDispatched, 2);
    assert.equal(sentWhatsAppMessages.length, 2);
    assert.equal(sentWhatsAppMessages[0].to, '+93704111222');
    assert.match(sentWhatsAppMessages[0].body, /Ahmad Khan/);
    assert.match(sentWhatsAppMessages[0].body, /Toyota Camry/);
    assert.match(sentWhatsAppMessages[0].body, /\/dashboard\/shipments\/ship-1/);

    assert.equal(sentWhatsAppMessages[1].to, '+971501234567');
    assert.match(sentWhatsAppMessages[1].body, /Karim Rahimi/);
    assert.match(sentWhatsAppMessages[1].body, /Kabul Warehouse/);
  });

  it('respects notifyShipmentPush: false and skips WhatsApp if opted out or phone missing', async () => {
    const sentWhatsAppMessages: any[] = [];
    const mockPrisma: any = {
      user: {
        findMany: async ({ where }: any) => {
          if (where?.role?.not === 'user') return [];
          return [
            { id: 'cust-opt-out', name: 'Opt Out User', phone: '+93700000000' },
            { id: 'cust-no-phone', name: 'No Phone User', phone: null },
          ];
        },
      },
      userSettings: {
        findMany: async () => [
          { userId: 'cust-opt-out', notifyShipmentPush: false },
        ],
      },
    };

    const result = await sendShipmentWorkflowNotifications(
      'admin-actor',
      [
        {
          shipmentId: 'ship-3',
          shipmentUserId: 'cust-opt-out',
          title: 'Transit Milestone: IN_TRANSIT',
          customerDescription: 'En route to Kandahar.',
          link: '/dashboard/shipments/ship-3',
        },
        {
          shipmentId: 'ship-4',
          shipmentUserId: 'cust-no-phone',
          title: 'Transit Milestone: IN_TRANSIT',
          customerDescription: 'En route to Mazar.',
          link: '/dashboard/shipments/ship-4',
        },
      ],
      {
        prisma: mockPrisma,
        createNotificationsFn: async () => ({ count: 0 }),
        sendWhatsAppFn: (async (payload: any) => {
          sentWhatsAppMessages.push(payload);
          return { success: true };
        }) as any,
      }
    );

    assert.equal(result.whatsappDispatched, 0);
    assert.equal(sentWhatsAppMessages.length, 0);
  });
});
