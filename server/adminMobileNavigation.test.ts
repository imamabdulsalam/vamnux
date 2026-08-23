import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workspaceSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/SuperAdmin.tsx"), "utf8");
const mobileStyles = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/adminMobileNavigation.css"), "utf8");

describe("VAMNUX Admin mobile navigation", () => {
  it("adds a keyboard-accessible three-line Admin navigation control without replacing desktop navigation", () => {
    expect(workspaceSource).toContain('className = "admin-mobile-menu-trigger"');
    expect(workspaceSource).toContain('aria-controls", "admin-mobile-navigation"');
    expect(workspaceSource).toContain('event.key === "Escape"');
    expect(workspaceSource).toContain('nav.addEventListener("click", closeOnNavigation)');
  });

  it("keeps the mobile navigation overlay scrollable and preserves responsive Admin workspace boundaries", () => {
    expect(mobileStyles).toContain(".admin-sidebar.mobile-open");
    expect(mobileStyles).toContain("overflow-y: auto");
    expect(mobileStyles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(mobileStyles).toContain(".admin-shell > main");
  });
});
