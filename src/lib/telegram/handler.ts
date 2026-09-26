import { telegramClient } from './client';
import {
  escapeHtml,
  formatFinanceTelegramMessage,
  formatShipmentCard,
  formatShipmentListItem,
  getCustomerFinanceOverview,
  getCustomerShipmentByIdOrVin,
  getCustomerShipments,
} from './services';
import {
  findUserByAccessCode,
  getTelegramSessionUser,
  linkTelegramSession,
  sanitizeAccessCode,
  unlinkTelegramSession,
  type TelegramLinkedUser,
} from './session';
import type {
  TelegramCallbackQuery,
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramInputMediaPhoto,
  TelegramMessage,
  TelegramReplyKeyboardMarkup,
  TelegramUpdate,
} from './types';
import { buildTrackingResponse } from '@/lib/tracking-response';

export const MAIN_MENU_KEYBOARD: TelegramReplyKeyboardMarkup = {
  keyboard: [
    [{ text: '📦 My Shipments' }, { text: '📸 Vehicle Photos' }],
    [{ text: '💰 Finance & Invoices' }, { text: '📍 Live Tracking' }],
    [{ text: 'ℹ️ My Account' }, { text: '🚪 Logout' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

export const AUTH_PROMPT_KEYBOARD: TelegramReplyKeyboardMarkup = {
  keyboard: [
    [{ text: '🔑 Enter Access Code' }, { text: '❓ How to find my code' }],
    [{ text: '📞 Contact Support' }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<{ ok: boolean; action?: string }> {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return { ok: true, action: 'callback_query' };
    }

    if (update.message) {
      await handleMessage(update.message);
      return { ok: true, action: 'message' };
    }

    return { ok: true, action: 'ignored' };
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    return { ok: false, action: 'error' };
  }
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const rawText = (message.text || '').trim();
  const lowerText = rawText.toLowerCase();

  // Check if chat is already authenticated
  const user = await getTelegramSessionUser(chatId);

  // If not authenticated, handle login and auth flow
  if (!user) {
    await handleUnauthenticatedMessage(message, rawText);
    return;
  }

  // User is authenticated, handle authenticated commands and menu items
  if (lowerText === '/start' || lowerText === 'menu' || lowerText === '/menu') {
    await sendAuthenticatedWelcome(chatId, user);
    return;
  }

  if (lowerText === '📦 my shipments' || lowerText === '/shipments') {
    await sendShipmentsList(chatId, user);
    return;
  }

  if (lowerText === '📸 vehicle photos' || lowerText === '📸 photos' || lowerText === '/photos') {
    await sendPhotosMenu(chatId, user);
    return;
  }

  if (lowerText === '💰 finance & invoices' || lowerText === '💰 finance' || lowerText === '/finance') {
    await sendFinanceSummary(chatId, user);
    return;
  }

  if (lowerText === '📍 live tracking' || lowerText === '/track') {
    await sendTrackingPrompt(chatId, user);
    return;
  }

  if (lowerText === 'ℹ️ my account' || lowerText === '/account' || lowerText === '/profile') {
    await sendAccountInfo(chatId, user);
    return;
  }

  if (lowerText === '🚪 logout' || lowerText === '/logout') {
    unlinkTelegramSession(chatId);
    await telegramClient.sendMessage(
      chatId,
      '🔒 <b>You have been logged out.</b>\n\nYour Telegram session has been disconnected from your Jacxi account. To log back in anytime, enter your 8-digit access code.',
      {
        parse_mode: 'HTML',
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );
    return;
  }

  if (lowerText === '/help' || lowerText === 'help') {
    await sendHelpMessage(chatId, true);
    return;
  }

  // Check if message is a VIN or Container number search
  const isPossibleVinOrContainer = /^[A-Z0-9]{6,17}$/i.test(rawText.replace(/[\s-]/g, ''));
  if (isPossibleVinOrContainer) {
    await handleSearchQuery(chatId, user, rawText);
    return;
  }

  // Default reply for unrecognized text
  await telegramClient.sendMessage(
    chatId,
    `I didn't quite catch that. Please use the menu buttons below or type a <b>VIN</b> / <b>Container number</b> to track your shipment.`,
    {
      parse_mode: 'HTML',
      reply_markup: MAIN_MENU_KEYBOARD,
    }
  );
}

async function handleUnauthenticatedMessage(message: TelegramMessage, rawText: string): Promise<void> {
  const chatId = message.chat.id;
  const lowerText = rawText.toLowerCase();
  const username = message.from?.username;

  if (lowerText === '❓ how to find my code') {
    await telegramClient.sendMessage(
      chatId,
      [
        '🔑 <b>How to find your 8-digit Access Code:</b>',
        '━━━━━━━━━━━━━━━━━━━━━',
        '1. Log into the <b>Jacxi Portal</b> (web or mobile app).',
        '2. Open your <b>Profile / Settings</b> page.',
        '3. Your unique <b>Access Code</b> (e.g. <code>JACX1234</code> or <code>83492019</code>) is shown there.',
        '4. You can also find your access code on your shipment invoices and booking confirmations.',
        '',
        '👉 Simply type or paste your <b>8-digit code</b> directly here in the chat to login!',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: AUTH_PROMPT_KEYBOARD,
      }
    );
    return;
  }

  if (lowerText === '📞 contact support') {
    await telegramClient.sendMessage(
      chatId,
      [
        '📞 <b>Jacxi Shipping Support:</b>',
        '━━━━━━━━━━━━━━━━━━━━━',
        '🌐 Website: https://jacxishipping.com',
        '📧 Email: support@jacxishipping.com',
        '🕒 Hours: Mon - Fri (8:00 AM - 6:00 PM)',
      ].join('\n'),
      {
        parse_mode: 'HTML',
        reply_markup: AUTH_PROMPT_KEYBOARD,
      }
    );
    return;
  }

  // Check if text is an access code (e.g. 8 alphanumeric characters or formatted with spaces)
  const candidateCode = sanitizeAccessCode(rawText);
  if (candidateCode.length === 8) {
    const matchedUser = await findUserByAccessCode(candidateCode);
    if (matchedUser) {
      linkTelegramSession(chatId, matchedUser, username);
      await telegramClient.sendMessage(
        chatId,
        [
          `🎉 <b>Welcome, ${escapeHtml(matchedUser.name || matchedUser.email)}!</b>`,
          '━━━━━━━━━━━━━━━━━━━━━',
          '✅ You are now authenticated with your Jacxi Shipping account.',
          '',
          `📧 <b>Email:</b> ${escapeHtml(matchedUser.email)}`,
          `🔑 <b>Access Code:</b> <code>${matchedUser.loginCode || candidateCode}</code>`,
          '',
          'Use the menu below to view your shipments, vehicle arrival photos, live tracking, and invoices.',
        ].join('\n'),
        {
          parse_mode: 'HTML',
          reply_markup: MAIN_MENU_KEYBOARD,
        }
      );

      // Auto-display shipments after successful login
      await sendShipmentsList(chatId, matchedUser);
      return;
    } else {
      await telegramClient.sendMessage(
        chatId,
        [
          '❌ <b>Invalid Access Code</b>',
          '',
          `The code <code>${escapeHtml(candidateCode)}</code> was not recognized in our system.`,
          'Please verify the 8-digit code from your Jacxi Shipping dashboard or invoice and try again.',
        ].join('\n'),
        {
          parse_mode: 'HTML',
          reply_markup: AUTH_PROMPT_KEYBOARD,
        }
      );
      return;
    }
  }

  // Default unauthenticated greeting
  await telegramClient.sendMessage(
    chatId,
    [
      '🚢 <b>Welcome to Jacxi Shipping Bot!</b>',
      '━━━━━━━━━━━━━━━━━━━━━',
      'Track your ocean containers, view vehicle arrival & warehouse inspection photos, and check your invoices directly in Telegram.',
      '',
      '🔐 <b>Please enter your 8-digit Customer Access Code to begin:</b>',
      '<i>(Example: <code>83492019</code> or <code>JACX1234</code>)</i>',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: AUTH_PROMPT_KEYBOARD,
    }
  );
}

async function sendAuthenticatedWelcome(chatId: number, user: TelegramLinkedUser): Promise<void> {
  const shipments = await getCustomerShipments(user.id);
  await telegramClient.sendMessage(
    chatId,
    [
      `👋 <b>Hello, ${escapeHtml(user.name || user.email)}!</b>`,
      '━━━━━━━━━━━━━━━━━━━━━',
      `You have <b>${shipments.length}</b> shipment(s) in your Jacxi account.`,
      '',
      'Choose an option below or send a <b>VIN / Container #</b> at any time:',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: MAIN_MENU_KEYBOARD,
    }
  );
}

async function sendShipmentsList(chatId: number, user: TelegramLinkedUser): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'typing');
  const shipments = await getCustomerShipments(user.id);

  if (shipments.length === 0) {
    await telegramClient.sendMessage(
      chatId,
      '📦 <b>No Active Shipments</b>\n\nThere are currently no shipments linked to your account.',
      {
        parse_mode: 'HTML',
        reply_markup: MAIN_MENU_KEYBOARD,
      }
    );
    return;
  }

  // Send summary list
  const listText = [
    `📦 <b>Your Shipments (${shipments.length}):</b>`,
    '━━━━━━━━━━━━━━━━━━━━━',
    ...shipments.map((s, idx) => formatShipmentListItem(s, idx)),
    '',
    '<i>Tap a button below to view details, photos, or tracking for any shipment:</i>',
  ].join('\n');

  // Build inline keyboard with buttons for each vehicle
  const inlineButtons: TelegramInlineKeyboardButton[][] = [];
  shipments.forEach((s) => {
    const label = `${s.vehicleMake || ''} ${s.vehicleModel || ''} (${s.vehicleVIN ? s.vehicleVIN.slice(-6) : s.id.slice(-6)})`.trim();
    inlineButtons.push([
      {
        text: `🚗 ${label}`,
        callback_data: `detail:${s.id}`,
      },
      {
        text: `📸 Photos (${s.totalPhotosCount})`,
        callback_data: `photos:${s.id}`,
      },
    ]);
  });

  await telegramClient.sendMessage(chatId, listText, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: inlineButtons },
  });
}

async function sendPhotosMenu(chatId: number, user: TelegramLinkedUser): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'typing');
  const shipments = await getCustomerShipments(user.id);

  if (shipments.length === 0) {
    await telegramClient.sendMessage(chatId, '📷 No shipments found to show photos for.');
    return;
  }

  // If customer has only 1 shipment, directly send its photos
  if (shipments.length === 1) {
    await sendShipmentPhotosAlbum(chatId, user, shipments[0].id);
    return;
  }

  // If multiple shipments, show selector
  const buttons: TelegramInlineKeyboardButton[][] = shipments.map((s) => [
    {
      text: `📸 ${s.vehicleLabel} (${s.totalPhotosCount} photos)`,
      callback_data: `photos:${s.id}`,
    },
  ]);

  await telegramClient.sendMessage(
    chatId,
    '📸 <b>Select a vehicle to view its inspection & arrival photos:</b>',
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }
  );
}

async function sendShipmentPhotosAlbum(
  chatId: number,
  user: TelegramLinkedUser,
  shipmentId: string
): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'upload_photo');
  const shipment = await getCustomerShipmentByIdOrVin(user.id, shipmentId);

  if (!shipment) {
    await telegramClient.sendMessage(chatId, '❌ Shipment not found.');
    return;
  }

  const allPhotos = [...shipment.arrivalPhotos, ...shipment.vehiclePhotos].filter(Boolean);

  if (allPhotos.length === 0) {
    await telegramClient.sendMessage(
      chatId,
      `📷 <b>No photos available yet</b> for <b>${escapeHtml(shipment.vehicleLabel)}</b>.\n\nArrival inspection photos will appear here as soon as the vehicle is processed at the export yard.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Telegram allows up to 10 photos per sendMediaGroup
  const photosToSend = allPhotos.slice(0, 10);
  const mediaGroup: TelegramInputMediaPhoto[] = photosToSend.map((url, idx) => ({
    type: 'photo',
    media: url,
    caption:
      idx === 0
        ? `📸 <b>${escapeHtml(shipment.vehicleLabel)}</b>\n🔑 VIN: <code>${shipment.vehicleVIN || 'N/A'}</code>\n📍 Status: ${shipment.statusLabel}\n🖼 Showing ${photosToSend.length} of ${allPhotos.length} photos`
        : undefined,
    parse_mode: 'HTML',
  }));

  const res = await telegramClient.sendMediaGroup(chatId, mediaGroup);

  if (!res.ok) {
    // If media group failed (e.g. invalid URL format), fallback to sending first photo with caption
    if (photosToSend.length > 0) {
      await telegramClient.sendPhoto(chatId, photosToSend[0], {
        caption: `📸 <b>${escapeHtml(shipment.vehicleLabel)}</b>\n🔑 VIN: <code>${shipment.vehicleVIN || 'N/A'}</code>\n📍 Status: ${shipment.statusLabel}`,
        parse_mode: 'HTML',
      });
    }
  }

  // If there are more than 10 photos, mention it
  if (allPhotos.length > 10) {
    await telegramClient.sendMessage(
      chatId,
      `ℹ️ <i>There are ${allPhotos.length - 10} additional photos available for this vehicle on your Jacxi web dashboard.</i>`,
      { parse_mode: 'HTML' }
    );
  }
}

async function sendFinanceSummary(chatId: number, user: TelegramLinkedUser): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'typing');
  const finance = await getCustomerFinanceOverview(user.id);
  const text = formatFinanceTelegramMessage(finance);

  await telegramClient.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: MAIN_MENU_KEYBOARD,
  });
}

async function sendTrackingPrompt(chatId: number, user: TelegramLinkedUser): Promise<void> {
  const shipments = await getCustomerShipments(user.id);

  if (shipments.length === 0) {
    await telegramClient.sendMessage(
      chatId,
      '📍 Type any <b>VIN</b> or <b>Container Number</b> in the chat to track live ocean freight.',
      { parse_mode: 'HTML' }
    );
    return;
  }

  const buttons: TelegramInlineKeyboardButton[][] = shipments.map((s) => [
    {
      text: `📍 Track ${s.vehicleLabel} (${s.containerNumber || 'Yard'})`,
      callback_data: `track:${s.id}`,
    },
  ]);

  await telegramClient.sendMessage(
    chatId,
    '📍 <b>Select a shipment to track, or type any VIN / Container number:</b>',
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }
  );
}

async function sendAccountInfo(chatId: number, user: TelegramLinkedUser): Promise<void> {
  await telegramClient.sendMessage(
    chatId,
    [
      'ℹ️ <b>Your Account Details</b>',
      '━━━━━━━━━━━━━━━━━━━━━',
      `👤 <b>Name:</b> ${escapeHtml(user.name || 'Customer')}`,
      `📧 <b>Email:</b> ${escapeHtml(user.email)}`,
      `📞 <b>Phone:</b> ${escapeHtml(user.phone || 'N/A')}`,
      `🔑 <b>Access Code:</b> <code>${user.loginCode || 'N/A'}</code>`,
      `📱 <b>Telegram Chat ID:</b> <code>${chatId}</code>`,
      '',
      '🔒 <i>Your Telegram session is linked and authenticated securely.</i>',
    ].join('\n'),
    {
      parse_mode: 'HTML',
      reply_markup: MAIN_MENU_KEYBOARD,
    }
  );
}

async function sendHelpMessage(chatId: number, isAuthenticated: boolean): Promise<void> {
  const text = [
    '🤖 <b>Jacxi Shipping Bot Commands:</b>',
    '━━━━━━━━━━━━━━━━━━━━━',
    '/shipments - View all your vehicle shipments',
    '/photos - View arrival & inspection photos',
    '/track <VIN> - Track shipment by VIN or Container',
    '/finance - View account balance & invoices',
    '/account - View your account profile',
    '/logout - Disconnect your Telegram session',
    '/help - Show this guide',
  ].join('\n');

  await telegramClient.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: isAuthenticated ? MAIN_MENU_KEYBOARD : AUTH_PROMPT_KEYBOARD,
  });
}

async function handleSearchQuery(
  chatId: number,
  user: TelegramLinkedUser,
  query: string
): Promise<void> {
  await telegramClient.sendChatAction(chatId, 'typing');
  const clean = query.replace(/[\s-]/g, '').toUpperCase();

  // 1. Check if matches user's shipment directly
  const localShipment = await getCustomerShipmentByIdOrVin(user.id, clean);
  if (localShipment) {
    const card = formatShipmentCard(localShipment);
    const buttons: TelegramInlineKeyboardButton[][] = [
      [
        { text: `📸 Photos (${localShipment.totalPhotosCount})`, callback_data: `photos:${localShipment.id}` },
        { text: '📍 Live Tracking', callback_data: `track:${localShipment.id}` },
      ],
    ];

    await telegramClient.sendMessage(chatId, card, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    });
    return;
  }

  // 2. Query universal tracking resolver
  const tracking = await buildTrackingResponse(clean);
  if (tracking) {
    const lines = [
      `🔍 <b>Tracking Result for <code>${escapeHtml(tracking.requestedNumber)}</code>:</b>`,
      '━━━━━━━━━━━━━━━━━━━━━',
      `📦 <b>Container:</b> <code>${escapeHtml(tracking.containerNumber)}</code>`,
      `📍 <b>Status:</b> ${escapeHtml(tracking.shipmentStatus || 'In Progress')}`,
      `🌐 <b>Current Location:</b> ${escapeHtml(tracking.currentLocation || 'In Transit')}`,
      `🛫 <b>Origin:</b> ${escapeHtml(tracking.origin || 'N/A')}`,
      `🛬 <b>Destination:</b> ${escapeHtml(tracking.destination || 'N/A')}`,
      tracking.estimatedArrival ? `📅 <b>ETA:</b> ${escapeHtml(tracking.estimatedArrival)}` : '',
    ].filter(Boolean);

    await telegramClient.sendMessage(chatId, lines.join('\n'), {
      parse_mode: 'HTML',
      reply_markup: MAIN_MENU_KEYBOARD,
    });
    return;
  }

  await telegramClient.sendMessage(
    chatId,
    `❌ No shipment or container found matching <code>${escapeHtml(query)}</code>. Please check the VIN or Container Number and try again.`,
    {
      parse_mode: 'HTML',
      reply_markup: MAIN_MENU_KEYBOARD,
    }
  );
}

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const chatId = query.message?.chat.id || query.from.id;
  const data = query.data || '';
  const user = await getTelegramSessionUser(chatId);

  // Acknowledge query to clear loading spinner on Telegram client
  await telegramClient.answerCallbackQuery(query.id);

  if (!user) {
    await telegramClient.sendMessage(
      chatId,
      '🔒 Your session has expired. Please enter your 8-digit access code to log in.',
      { parse_mode: 'HTML', reply_markup: AUTH_PROMPT_KEYBOARD }
    );
    return;
  }

  if (data.startsWith('photos:')) {
    const shipmentId = data.replace('photos:', '');
    await sendShipmentPhotosAlbum(chatId, user, shipmentId);
    return;
  }

  if (data.startsWith('detail:')) {
    const shipmentId = data.replace('detail:', '');
    const shipment = await getCustomerShipmentByIdOrVin(user.id, shipmentId);
    if (shipment) {
      const card = formatShipmentCard(shipment);
      const buttons: TelegramInlineKeyboardButton[][] = [
        [
          { text: `📸 Photos (${shipment.totalPhotosCount})`, callback_data: `photos:${shipment.id}` },
          { text: '📍 Live Tracking', callback_data: `track:${shipment.id}` },
        ],
      ];
      await telegramClient.sendMessage(chatId, card, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      });
    }
    return;
  }

  if (data.startsWith('track:')) {
    const shipmentId = data.replace('track:', '');
    const shipment = await getCustomerShipmentByIdOrVin(user.id, shipmentId);
    if (shipment) {
      const tracking = await buildTrackingResponse(shipment.vehicleVIN || shipment.containerNumber || shipment.id);
      if (tracking) {
        const lines = [
          `📍 <b>Live Tracking: ${escapeHtml(shipment.vehicleLabel)}</b>`,
          '━━━━━━━━━━━━━━━━━━━━━',
          `📦 <b>Container:</b> <code>${escapeHtml(shipment.containerNumber || 'Pending')}</code>`,
          `🔑 <b>VIN:</b> <code>${escapeHtml(shipment.vehicleVIN || 'N/A')}</code>`,
          `🚢 <b>Vessel:</b> ${escapeHtml(shipment.vesselName || 'TBA')}`,
          `🛫 <b>Origin:</b> ${escapeHtml(shipment.loadingPort || 'Export Port')}`,
          `🛬 <b>Destination:</b> ${escapeHtml(shipment.destinationPort || 'Destination Port')}`,
          shipment.estimatedArrival ? `📅 <b>ETA:</b> ${escapeHtml(shipment.estimatedArrival)}` : '',
          `📊 <b>Progress:</b> <code>${formatProgressBar(shipment.progress)}</code>`,
        ].filter(Boolean);

        await telegramClient.sendMessage(chatId, lines.join('\n'), {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: `📸 View Photos (${shipment.totalPhotosCount})`, callback_data: `photos:${shipment.id}` }],
            ],
          },
        });
      } else {
        await telegramClient.sendMessage(chatId, formatShipmentCard(shipment), { parse_mode: 'HTML' });
      }
    }
    return;
  }
}
