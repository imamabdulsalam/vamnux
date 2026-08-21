export const ADMIN_AUTH_FACTOR_STATES = {
  emailChallenge: {
    status: "unavailable" as const,
    title: "Email confirmation code",
    detail: "A verified transactional email sender and server-side challenge flow are required before email codes can protect Admin sign-in.",
  },
  authenticator: {
    status: "unavailable" as const,
    title: "Authenticator application",
    detail: "TOTP enrolment, encrypted secret storage, recovery codes, and an enforced login challenge are required before an authenticator can be enabled.",
  },
  phone: {
    status: "unavailable" as const,
    title: "Phone verification",
    detail: "A verified SMS or voice provider, rate limits, and server-side code verification are required before a phone can be used for Admin sign-in.",
  },
  allSessions: {
    status: "unavailable" as const,
    title: "Sign out all devices",
    detail: "The current OAuth provider manages sessions. Global revocation cannot be claimed until its session-revocation capability is integrated and tested.",
  },
};

export function displayOwnerName(profile: { firstName?: string | null; lastName?: string | null } | null | undefined, fallback: string | null | undefined) {
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  return name || fallback || "VAMNUX owner";
}
