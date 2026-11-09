import { describe, expect, it } from "vitest";
import { SandboxFullError, sealToFit } from "./fit";

const seal = async (data: unknown) => JSON.stringify(data);

describe("sealToFit", () => {
  it("keeps everything when it fits", async () => {
    const sandbox = { withdrawals: ["new", "old"] };
    expect(await sealToFit(sandbox, seal, 100)).toBe(JSON.stringify(sandbox));
  });

  it("drops the oldest withdrawals until it fits", async () => {
    const sandbox = { withdrawals: ["newest", "middle", "oldest"] };
    const sealed = await sealToFit(sandbox, seal, 30);
    expect(JSON.parse(sealed).withdrawals).toEqual(["newest"]);
  });

  it("doesn't change the original", async () => {
    const sandbox = { withdrawals: ["newest", "oldest"] };
    await sealToFit(sandbox, seal, 25);
    expect(sandbox.withdrawals).toHaveLength(2);
  });

  it("drops withdrawal history before audit entries", async () => {
    const sandbox = { withdrawals: ["w1", "w2"], audit: ["a1", "a2"] };
    const kept = JSON.parse(
      await sealToFit(sandbox, seal, JSON.stringify(sandbox).length - 5),
    );
    expect(kept).toEqual({ withdrawals: ["w1"], audit: ["a1", "a2"] });

    // {"withdrawals":[],"audit":["a1","a2"]} is 38 characters, so 35 forces one out
    const tight = JSON.parse(await sealToFit(sandbox, seal, 35));
    expect(tight.withdrawals).toEqual([]);
    expect(tight.audit).toEqual(["a1"]);
  });

  it("throws rather than losing other data", async () => {
    const sandbox = { wallets: "x".repeat(50), withdrawals: [] };
    await expect(sealToFit(sandbox, seal, 20)).rejects.toThrow(
      SandboxFullError,
    );
  });
});
