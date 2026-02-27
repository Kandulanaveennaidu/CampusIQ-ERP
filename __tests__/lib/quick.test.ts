// Quick test to isolate the Jest compile error
import { passwordSchema, registerSchema } from "@/lib/validators";

describe("Quick Test", () => {
  it("passwordSchema exists", () => {
    expect(passwordSchema).toBeDefined();
  });

  it("registerSchema exists", () => {
    expect(registerSchema).toBeDefined();
  });

  it("valid password passes", () => {
    const r = passwordSchema.safeParse("Password1");
    expect(r.success).toBe(true);
  });
});
