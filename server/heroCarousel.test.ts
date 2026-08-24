import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("VAMNUX hero carousel", () => {
  it("uses a compact seven-slide fallback carousel without a visible numbered navigation strip", () => {
    expect(homeSource).toContain("const slides = [");
    expect(homeSource).toContain("return validSlides.length >= 5 ? validSlides.slice(0, 7) : slides");
    expect(homeSource).toContain('String(carouselSlides.length).padStart(2, "0")');
    expect(homeSource).not.toContain('className="carousel-controls"');
    expect(homeSource).toContain("setActiveSlide((current) => (current + 1) % carouselSlides.length)");
  });

  it("keeps the review slot truthful and does not render invented testimonial identities", () => {
    expect(homeSource).toContain("Verified customer feedback can appear here after it is approved");
    expect(homeSource).toContain("VAMNUX does not invent reviews or identities.");
    expect(homeSource).not.toContain("Customer review from");
  });
});
