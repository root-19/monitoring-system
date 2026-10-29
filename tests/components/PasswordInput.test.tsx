import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "@/components/ui";

describe("PasswordInput", () => {
  it("hides the password by default and toggles with the eye button", async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="pw" name="password" placeholder="Your password" />);
    const input = screen.getByPlaceholderText("Your password") as HTMLInputElement;
    expect(input.type).toBe("password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    await user.type(input, "Admin@123");
    await user.click(toggle);
    expect(input.type).toBe("text");
    expect(input.value).toBe("Admin@123");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.type).toBe("password");
  });

  it("never submits the toggle button as a form action", () => {
    render(
      <form>
        <PasswordInput name="password" />
      </form>
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
