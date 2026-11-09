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
 * Seals a sandbox so it fits in a cookie, dropping the oldest history if
 * needed: withdrawal records first, then audit entries. Only history is lost:
 * balances are kept separately, so money that left a wallet stays gone, and
 * the audit log still records the withdrawal. If it still doesn't fit, this
 * throws rather than letting the browser silently discard the whole cookie.
 */
export async function sealToFit<
  T extends { withdrawals: unknown[]; audit?: unknown[] },
>(
  sandbox: T,
  seal: (data: T) => Promise<string>,
  limit = MAX_COOKIE_LENGTH,
): Promise<string> {
  const trimmed = {
    ...sandbox,
    withdrawals: [...sandbox.withdrawals],
    ...(sandbox.audit && { audit: [...sandbox.audit] }),
  };
  for (;;) {
    const sealed = await seal(trimmed);
    if (sealed.length <= limit) return sealed;
    // Both lists are newest first, so pop() removes the oldest
    if (trimmed.withdrawals.length > 0) trimmed.withdrawals.pop();
    else if (trimmed.audit?.length) trimmed.audit.pop();
    else throw new SandboxFullError();
  }
}
