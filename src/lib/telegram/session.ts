import { prisma } from '@/lib/db';
import { isValidLoginCode, loginCodeToVoiceDigits } from '@/lib/loginCode';
import { normalizeVoiceDigits } from '@/lib/voice/speech';

export type TelegramLinkedUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  loginCode: string | null;
  role: string;
};

// In-memory persistent session cache for fast webhook processing
type SessionData = {
  userId: string;
  user: TelegramLinkedUser;
  telegramUsername?: string;
  linkedAt: number;
};

const sessionStore = new Map<string, SessionData>();

/**
 * Normalizes input access code from user (strips spaces, dashes, converts to uppercase)
 */
export function sanitizeAccessCode(rawCode: string): string {
  if (!rawCode) return '';
  return rawCode.replace(/[\s\-_]/g, '').trim().toUpperCase();
}

/**
 * Searches and validates an 8-character/digit customer access code
 */
export async function findUserByAccessCode(accessCode: string): Promise<TelegramLinkedUser | null> {
  const sanitized = sanitizeAccessCode(accessCode);
  if (!sanitized || sanitized.length !== 8) {
    return null;
  }

  try {
    // 1. Direct alphanumeric login code match
    if (isValidLoginCode(sanitized)) {
      const directMatch = await prisma.user.findFirst({
        where: {
          loginCode: {
            equals: sanitized,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          loginCode: true,
          role: true,
        },
      });

      if (directMatch) {
        return directMatch;
      }
    }

    // 2. Numeric keypad voice digit match
    const normalizedDigits = normalizeVoiceDigits(sanitized);
    if (normalizedDigits.length === 8) {
      // Check direct numeric login codes
      const numericDirectMatch = await prisma.user.findFirst({
        where: {
          loginCode: {
            equals: normalizedDigits,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          loginCode: true,
          role: true,
        },
      });

      if (numericDirectMatch) {
        return numericDirectMatch;
      }

      // Check mapped keypad digits across users with login codes
      const usersWithCodes = await prisma.user.findMany({
        where: {
          loginCode: { not: null },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          loginCode: true,
          role: true,
        },
        take: 200,
      });

      const keypadMatch = usersWithCodes.find((u) => {
        if (!u.loginCode) return false;
        return loginCodeToVoiceDigits(u.loginCode) === normalizedDigits;
      });

      if (keypadMatch) {
        return keypadMatch;
      }
    }
  } catch (error) {
    console.error('Database error in findUserByAccessCode:', error);
    return null;
  }

  return null;
}

/**
 * Retrieves the authenticated Jacxi user for a Telegram chat ID
 */
export async function getTelegramSessionUser(chatId: number | string): Promise<TelegramLinkedUser | null> {
  const key = String(chatId);
  const cached = sessionStore.get(key);
  if (cached) {
    // Verify user still exists in DB
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: cached.userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          loginCode: true,
          role: true,
        },
      });
      if (dbUser) {
        cached.user = dbUser;
        return dbUser;
      } else {
        sessionStore.delete(key);
        return null;
      }
    } catch {
      return cached.user;
    }
  }

  return null;
}

/**
 * Links a Telegram Chat ID to a Jacxi user upon successful digit code verification
 */
export function linkTelegramSession(
  chatId: number | string,
  user: TelegramLinkedUser,
  telegramUsername?: string
): void {
  const key = String(chatId);
  sessionStore.set(key, {
    userId: user.id,
    user,
    telegramUsername,
    linkedAt: Date.now(),
  });
}

/**
 * Logs out / Unlinks a Telegram Chat ID
 */
export function unlinkTelegramSession(chatId: number | string): boolean {
  const key = String(chatId);
  return sessionStore.delete(key);
}
