import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const useQuery = vi.fn();
vi.mock("convex/react", async (orig) => ({ ...(await orig<typeof import("convex/react")>()), useQuery: (...a: unknown[]) => useQuery(...a) }));

import { CoverageMap } from "@/components/landing/CoverageMap";

beforeEach(() => {
  useQuery.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("CoverageMap", () => {
  it("shows the sample preview while the query is loading or empty", () => {
    useQuery.mockReturnValue(undefined);
    render(<CoverageMap />);
    expect(screen.getByText("Sample coverage preview")).toBeInTheDocument();
    expect(screen.getByLabelText(/Map of the Philippines/)).toBeInTheDocument();
  });

  it("switches to live mode when the backend returns pins", () => {
    useQuery.mockReturnValue([
      { lat: 14.6, lng: 120.98, tank: "11kg" },
      { lat: 10.3, lng: 123.9, tank: "2.7kg" },
    ]);
    render(<CoverageMap />);
    expect(screen.getByText(/Live: active customer locations/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // customers pinned stat, no "+" suffix
  });

  it("falls back to demo pins instead of crashing when the Convex function is missing", () => {
    useQuery.mockImplementation(() => {
      throw new Error("[CONVEX Q(publicData:coveragePins)] Could not find public function for 'publicData:coveragePins'");
    });
    render(<CoverageMap />);
    expect(screen.getByText("Sample coverage preview")).toBeInTheDocument();
    expect(screen.getByText(/customers pinned/)).toBeInTheDocument();
  });
});
