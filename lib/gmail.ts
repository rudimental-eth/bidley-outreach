import { google } from "googleapis";

export type ThreadMsg = { internalDate: string; headers: { From: string } };
export type Thread = { messages: ThreadMsg[] };

export function threadHasReply(thread: Thread, onsAdres: string, sinceMs: number): boolean {
  return thread.messages.some(
    (m) =>
      Number(m.internalDate) > sinceMs &&
      !m.headers.From.toLowerCase().includes(onsAdres.toLowerCase()),
  );
}

function gmailClient() {
  const oauth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET,
  );
  oauth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth: oauth });
}

export async function fetchThread(threadId: string): Promise<Thread> {
  const gmail = gmailClient();
  const res = await gmail.users.threads.get({ userId: "me", id: threadId });
  const messages = (res.data.messages ?? []).map((m) => ({
    internalDate: m.internalDate ?? "0",
    headers: {
      From: m.payload?.headers?.find((h) => h.name === "From")?.value ?? "",
    },
  }));
  return { messages };
}

// pure: is er minstens één internalDate na sinceMs?
export function anyAfter(internalDates: string[], sinceMs: number): boolean {
  return internalDates.some((d) => Number(d) > sinceMs);
}

export async function hasReplyFrom(prospectEmail: string, sinceMs: number): Promise<boolean> {
  const gmail = gmailClient();
  const res = await gmail.users.messages.list({
    userId: "me",
    q: `from:${prospectEmail} newer_than:30d`,
    maxResults: 10,
  });
  const ids = (res.data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  const dates: string[] = [];
  for (const id of ids) {
    const msg = await gmail.users.messages.get({ userId: "me", id, format: "minimal" });
    dates.push(msg.data.internalDate ?? "0");
  }
  return anyAfter(dates, sinceMs);
}
