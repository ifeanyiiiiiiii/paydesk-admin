/** Browsers drop cookies over about 4KB; stay safely under that. */
export const MAX_COOKIE_LENGTH = 3_800;

export class SandboxFullError extends Error {
  constructor() {
    super(
      "Your demo storage is full. Undo an earlier change, like a frozen wallet or a custom rate, and try again.",
    );
  }
}

/**
 * Seals a sandbox so it fits in a cookie, dropping the oldest withdrawal
 * records if needed. Only history is lost: balances are kept separately, so
 * money that left a wallet stays gone. If it still doesn't fit, this throws
 * rather than letting the browser silently discard the whole cookie.
 */
export async function sealToFit<T extends { withdrawals: unknown[] }>(
  sandbox: T,
  seal: (data: T) => Promise<string>,
  limit = MAX_COOKIE_LENGTH,
): Promise<string> {
  const trimmed = { ...sandbox, withdrawals: [...sandbox.withdrawals] };
  for (;;) {
    const sealed = await seal(trimmed);
    if (sealed.length <= limit) return sealed;
    if (trimmed.withdrawals.length === 0) throw new SandboxFullError();
    trimmed.withdrawals.pop(); // newest first, so this is the oldest
  }
}
