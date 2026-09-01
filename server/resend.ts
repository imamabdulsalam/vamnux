import { ENV } from "./_core/env";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 100_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

type FetchLike = typeof fetch;

type ResendClientConfig = {
  apiKey: string;
  from: string;
  fetchImpl?: FetchLike;
};

const requireTrimmedText = (value: string, field: string, maxLength: number): string => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new Error(`Invalid transactional email ${field}.`);
  }
  return trimmed;
};

const validateInput = (input: TransactionalEmailInput): TransactionalEmailInput => {
  const to = requireTrimmedText(input.to, "recipient", 320);
  if (!EMAIL_PATTERN.test(to)) {
    throw new Error("Invalid transactional email recipient.");
  }

  const idempotencyKey = requireTrimmedText(input.idempotencyKey, "idempotency key", 256);
  const subject = requireTrimmedText(input.subject, "subject", MAX_SUBJECT_LENGTH);
  const html = requireTrimmedText(input.html, "HTML body", MAX_BODY_LENGTH);
  const text = requireTrimmedText(input.text, "text body", MAX_BODY_LENGTH);

  return { to, subject, html, text, idempotencyKey };
};

export function createResendTransactionalEmailClient(config: ResendClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;

  return async (input: TransactionalEmailInput): Promise<{ providerMessageId: string }> => {
    const normalized = validateInput(input);
    const apiKey = config.apiKey.trim();
    const from = config.from.trim();

    if (!apiKey || !apiKey.startsWith("re_")) {
      throw new Error("Transactional email service is not configured.");
    }
    if (!from || !EMAIL_PATTERN.test(from.match(/<([^>]+)>/)?.[1] ?? from)) {
      throw new Error("Transactional email sender is not configured.");
    }

    const response = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": normalized.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: normalized.to,
        subject: normalized.subject,
        html: normalized.html,
        text: normalized.text,
      }),
    });

    if (!response.ok) {
      throw new Error("Transactional email provider did not accept the message.");
    }

    const payload = (await response.json().catch(() => null)) as { id?: unknown } | null;
    if (!payload || typeof payload.id !== "string" || !payload.id) {
      throw new Error("Transactional email provider returned an invalid response.");
    }

    return { providerMessageId: payload.id };
  };
}

export const sendTransactionalEmail = createResendTransactionalEmailClient({
  apiKey: ENV.resendApiKey,
  from: ENV.resendFromEmail,
});
