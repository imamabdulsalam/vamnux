export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Open VAMNUX's local account page without leaving the Namecheap-hosted application. */
export const startLogin = (next = "/account") => {
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const query = target === "/account" ? "" : `?next=${encodeURIComponent(target)}`;
  window.location.assign(`/login${query}`);
};
