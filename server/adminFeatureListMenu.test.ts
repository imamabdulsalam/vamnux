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
});
