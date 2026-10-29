import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallAppButton, PwaRegister } from "@/components/pwa/InstallApp";

const setUA = (ua: string, platform = "Win32", touch = 0) => {
  Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
  Object.defineProperty(navigator, "platform", { value: platform, configurable: true });
  Object.defineProperty(navigator, "maxTouchPoints", { value: touch, configurable: true });
};

beforeEach(() => {
  window.__pgiInstallPrompt = null;
  setUA("Mozilla/5.0 (Windows NT 10.0) Chrome/130");
});
afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe("InstallAppButton", () => {
  it("stays hidden when the browser has not offered an install prompt", () => {
    render(<InstallAppButton />);
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });

  it("appears once the browser fires beforeinstallprompt and triggers the native prompt on click", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });

    render(
      <>
        <PwaRegister />
        <InstallAppButton />
      </>
    );
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();

    const prompt = vi.fn().mockResolvedValue(undefined);
    const evt = Object.assign(new Event("beforeinstallprompt"), { prompt, userChoice: Promise.resolve({ outcome: "accepted" as const }) });
    const preventDefault = vi.spyOn(evt, "preventDefault");
    await act(async () => {
      window.dispatchEvent(evt);
    });
    expect(preventDefault).toHaveBeenCalled(); // browser mini-infobar suppressed, we show our own button

    const btn = screen.getByRole("button", { name: "Install app" });
    await user.click(btn);
    expect(prompt).toHaveBeenCalledTimes(1);
    // accepted -> button disappears
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });

  it("on iPhone shows Add to Home Screen instructions instead", async () => {
    const user = userEvent.setup();
    setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1", "iPhone", 5);
    render(<InstallAppButton />);
    await user.click(screen.getByRole("button", { name: "Install app" }));
    expect(screen.getByRole("dialog", { name: "Install on iPhone" })).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hides itself when already running as an installed app", () => {
    window.__pgiInstallPrompt = Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "dismissed" as const }) });
    const mm = vi.spyOn(window, "matchMedia").mockImplementation((q: string) => ({ matches: q.includes("standalone"), media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
    render(<InstallAppButton />);
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
    mm.mockRestore();
  });
});
