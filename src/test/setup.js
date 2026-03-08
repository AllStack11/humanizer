import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (!window.requestAnimationFrame) {
  Object.defineProperty(window, "requestAnimationFrame", {
    writable: true,
    value: (callback) => setTimeout(() => callback(Date.now()), 0),
  });
}

if (!window.cancelAnimationFrame) {
  Object.defineProperty(window, "cancelAnimationFrame", {
    writable: true,
    value: (id) => clearTimeout(id),
  });
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
