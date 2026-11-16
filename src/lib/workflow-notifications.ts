import { NotificationType, PrismaClient } from '@prisma/client';
import { createNotifications } from '@/lib/notifications';
import { hasPermission } from '@/lib/rbac';
import { sendConfiguredWhatsApp } from '@/lib/communication-settings';

type WorkflowNotificationEvent = {
  shipmentId: string;
  shipmentUserId: string;
  title: string;
  customerDescription: string;
  internalDescription?: string;
  link: string;
};

type WorkflowNotificationDeps = {
  prisma: PrismaClient;
  createNotificationsFn?: typeof createNotifications;
  sendWhatsAppFn?: typeof sendConfiguredWhatsApp;
};

function canReceiveWorkflowNotifications(role: string) {
  return (
    hasPermission(role, 'customers:view') ||
    hasPermission(role, 'shipments:read_all') ||
    hasPermission(role, 'shipments:manage') ||
    hasPermission(role, 'dispatches:manage') ||
    hasPermission(role, 'containers:manage') ||
    hasPermission(role, 'transits:manage')
  );
}

export async function sendShipmentWorkflowNotifications(
  actorId: string,
  events: WorkflowNotificationEvent[],
  deps: WorkflowNotificationDeps,
) {
  if (events.length === 0) {
    return { count: 0, whatsappDispatched: 0 };
  }

  const createNotificationsFn = deps.createNotificationsFn || createNotifications;
  const sendWhatsAppFn = deps.sendWhatsAppFn || sendConfiguredWhatsApp;

  const internalUsers = await deps.prisma.user.findMany({
    where: {
      role: {
        not: 'user',
      },
      id: {
        not: actorId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  const internalRecipientIds = internalUsers
    .filter((user) => canReceiveWorkflowNotifications(user.role))
    .map((user) => user.id);

  const candidateRecipientIds = Array.from(
    new Set([
      ...events.map((event) => event.shipmentUserId).filter((userId) => userId !== actorId),
      ...internalRecipientIds,
    ])
  );

  const [settings, customerUsers] = await Promise.all([
    candidateRecipientIds.length
      ? deps.prisma.userSettings.findMany({
          where: {
            userId: {
              in: candidateRecipientIds,
            },
          },
          select: {
            userId: true,
            notifyShipmentPush: true,
            notifyCriticalSms: true,
          },
        })
      : [],
    candidateRecipientIds.length
      ? deps.prisma.user.findMany({
          where: {
            id: {
              in: candidateRecipientIds,
            },
          },
          select: {
            id: true,
            name: true,
            phone: true,
          },
        })
      : [],
  ]);

  const pushPreferenceByUserId = new Map(settings.map((setting) => [setting.userId, setting.notifyShipmentPush]));
  const customerById = new Map(customerUsers.map((user) => [user.id, user]));
  const notificationInputs = new Map<string, Parameters<typeof createNotifications>[0][number]>();

  for (const event of events) {
    const addNotification = (userId: string, description: string) => {
      const pushEnabled = pushPreferenceByUserId.get(userId);
      if (pushEnabled === false) {
        return;
      }

      const key = `${userId}::${event.title}::${description}::${event.link}`;
      notificationInputs.set(key, {
        userId,
        senderId: actorId,
        title: event.title,
        description,
        type: NotificationType.INFO,
        link: event.link,
      });
    };

    if (event.shipmentUserId !== actorId) {
      addNotification(event.shipmentUserId, event.customerDescription);
    }

    for (const recipientId of internalRecipientIds) {
      addNotification(recipientId, event.internalDescription || event.customerDescription);
    }
  }

  // Automated WhatsApp Milestone Notifications to Customer Users
  let whatsappDispatched = 0;
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://jacxishipping.com';
  const customerEvents = events.filter((event) => event.shipmentUserId !== actorId);

  if (customerEvents.length > 0) {
    const whatsappTasks = customerEvents.map(async (event) => {
      const customer = customerById.get(event.shipmentUserId);
      if (!customer?.phone) {
        return null;
      }

      const pushPref = pushPreferenceByUserId.get(event.shipmentUserId);
      if (pushPref === false) {
        return null;
      }

      const customerName = customer.name?.trim() || 'Valued Customer';
      const cleanLink = event.link.startsWith('/') ? event.link : `/${event.link}`;
      const trackingUrl = `${baseUrl.replace(/\/$/, '')}${cleanLink}`;

      const messageBody = [
        `🚢 *JACXI Shipping — Milestone Update*`,
        ``,
        `Hello *${customerName}*,`,
        ``,
        `Your shipment has reached a new milestone:`,
        `📍 *${event.title}*`,
        `${event.customerDescription}`,
        ``,
        `🔗 *Live Tracking Link*:`,
        `${trackingUrl}`,
        ``,
        `_JACXI Global Logistics & Auto Transport_`,
      ].join('\n');

      try {
        const result = await sendWhatsAppFn({
          to: customer.phone,
          body: messageBody,
          previewUrl: true,
        });

        if (result?.success) {
          whatsappDispatched++;
        }
        return result;
      } catch (waError) {
        console.warn(`[Workflow Notifications] WhatsApp dispatch failed for ${customer.phone}:`, waError);
        return null;
      }
    });

    await Promise.allSettled(whatsappTasks);
  }

  if (notificationInputs.size === 0) {
    return { count: 0, whatsappDispatched };
  }

  const notificationResult = await createNotificationsFn(Array.from(notificationInputs.values()));
  const notificationCount = typeof notificationResult === 'object' && notificationResult !== null && 'count' in notificationResult
    ? (notificationResult as { count: number }).count
    : (Array.isArray(notificationResult) ? (notificationResult as any[]).length : 1);

  return {
    count: notificationCount,
    whatsappDispatched,
  };
}