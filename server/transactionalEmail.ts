import { ENV } from "./_core/env";

type AccountEmail = { to: string; subject: string; html: string; text: string; idempotencyKey: string };

/** Delivery is intentionally disabled unless a real server-only sender credential is configured. */
export function isTransactionalEmailConfigured() {
  return Boolean(ENV.resendApiKey && ENV.emailFrom && ENV.appUrl.startsWith("https://"));
}

export async function sendVamnuxAccountEmail(input: AccountEmail): Promise<{ delivered: boolean }> {
  if (!isTransactionalEmailConfigured()) return { delivered: false };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
        "User-Agent": "VAMNUX Account Security",
      },
      body: JSON.stringify({ from: ENV.emailFrom, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
    });
    return { delivered: response.ok };
  } catch {
    return { delivered: false };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

export function verificationEmail(input: { to?: string; email?: string; firstName?: string | null; token: string }) {
  const to = input.to || input.email;
  if (!to) throw new Error("A VAMNUX account email recipient is required.");
  const url = `${ENV.appUrl}/verify-email?token=${encodeURIComponent(input.token)}`;
  const greeting = escapeHtml(input.firstName?.trim() || "there");
  return { to, subject: "Verify your VAMNUX email address", idempotencyKey: `verify-${input.token.slice(0, 32)}`, text: `Hello ${input.firstName?.trim() || "there"},\n\nVerify your VAMNUX email address: ${url}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`, html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17202d"><h1 style="color:#286dff">Verify your VAMNUX email</h1><p>Hello ${greeting},</p><p>Confirm this email address to verify your VAMNUX password account.</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#286dff;color:#fff;text-decoration:none;font-weight:700">Verify email address</a></p><p>This link expires in 24 hours. If you did not create this account, you can safely ignore this email.</p></main>` };
}

export function passwordResetEmail(input: { to?: string; email?: string; firstName?: string | null; token: string }) {
  const to = input.to || input.email;
  if (!to) throw new Error("A VAMNUX account email recipient is required.");
  const url = `${ENV.appUrl}/reset-password?token=${encodeURIComponent(input.token)}`;
  const greeting = escapeHtml(input.firstName?.trim() || "there");
  return { to, subject: "Reset your VAMNUX password", idempotencyKey: `reset-${input.token.slice(0, 32)}`, text: `Hello ${input.firstName?.trim() || "there"},\n\nReset your VAMNUX password: ${url}\n\nThis link expires in one hour. If you did not request a password reset, ignore this email.`, html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17202d"><h1 style="color:#286dff">Reset your VAMNUX password</h1><p>Hello ${greeting},</p><p>Use the button below to choose a new password for your VAMNUX account.</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#286dff;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p><p>This link expires in one hour. If you did not request this, you can safely ignore this email.</p></main>` };
}
