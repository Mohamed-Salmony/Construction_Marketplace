export type MockEmail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string; // ISO
};

const STORAGE_KEY = 'mock_email_outbox';

function readOutbox(): MockEmail[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr as MockEmail[] : [];
  } catch {
    return [];
  }
}

function writeOutbox(list: MockEmail[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export function sendEmail(to: string, subject: string, body: string): MockEmail {
  const email: MockEmail = {
    id: String(Date.now()),
    to: to.trim(),
    subject,
    body,
    createdAt: new Date().toISOString(),
  };
  const out = readOutbox();
  out.push(email);
  writeOutbox(out);
  return email;
}

export function getOutbox(): MockEmail[] {
  return readOutbox();
}
