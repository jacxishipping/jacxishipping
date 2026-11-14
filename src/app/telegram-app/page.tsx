import { redirect } from 'next/navigation';

// /telegram-app used to render a byte-identical copy of /telegram.
// There is a single Telegram launchpad: /telegram already detects the
// Telegram WebApp (Mini App) environment and handles bridge tokens, so
// this route redirects there, preserving any token/target query params.
export default async function TelegramAppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string' && value) query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  redirect(query.size ? `/telegram?${query.toString()}` : '/telegram');
}
