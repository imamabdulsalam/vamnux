import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workspaceSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/SuperAdmin.tsx"), "utf8");
const mobileMenuStyles = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/adminFeatureListMenu.css"), "utf8");

describe("VAMNUX Admin mobile feature list", () => {
  it("adds only a keyboard-accessible three-line feature-list trigger to the existing Admin shell", () => {
    expect(workspaceSource).toContain('className = "admin-feature-list-trigger"');
    expect(workspaceSource).toContain('aria-controls", "admin-feature-list"');
    expect(workspaceSource).toContain('event.key === "Escape"');
    expect(workspaceSource).toContain('nav.addEventListener("click", closeMenu)');
  });

  it("uses the existing navigation list as a phone-only scrollable overlay without changing desktop styles", () => {
    expect(mobileMenuStyles).toContain("@media (max-width: 680px)");
    expect(mobileMenuStyles).toContain(".admin-sidebar.feature-list-open");
    expect(mobileMenuStyles).toContain("overflow-y: auto");
    expect(mobileMenuStyles).toContain("display: none !important");
    expect(mobileMenuStyles).not.toContain("@media (min-width");
  });

  it("keeps every existing top-bar control visible on phones by giving the brand, search, and actions their own rows", () => {
    expect(mobileMenuStyles).toContain('"brand trigger"');
    expect(mobileMenuStyles).toContain('"search search"');
    expect(mobileMenuStyles).toContain('"actions actions"');
    expect(mobileMenuStyles).toContain(".admin-topbar .admin-global-search");
    expect(mobileMenuStyles).toContain(".admin-topbar > div span");
  });

  it("uses a phone-only full-height app shell with a stable header and touch-aware scrolling", () => {
    expect(mobileMenuStyles).toContain("min-height: 100dvh");
    expect(mobileMenuStyles).toContain("position: sticky");
    expect(mobileMenuStyles).toContain("-webkit-overflow-scrolling: touch");
    expect(mobileMenuStyles).toContain("safe-area-inset-bottom");
  });
});
