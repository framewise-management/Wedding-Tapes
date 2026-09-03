// Best-effort event logging — a Discord outage or missing webhook must never
// break the request that triggered the notification.
export async function notifyDiscord(content: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      console.error('Discord notification rejected:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('Discord notification failed:', err);
  }
}
