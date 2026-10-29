import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// motion/react's whileInView and the Google Maps wrapper expect these browser APIs.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(globalThis, "IntersectionObserver", { value: IO, writable: true });
Object.defineProperty(globalThis, "ResizeObserver", { value: IO, writable: true });
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

process.env.NEXT_PUBLIC_CONVEX_URL ??= "http://127.0.0.1:3210";

afterEach(() => cleanup());
