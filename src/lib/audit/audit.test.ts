import { describe, expect, it } from "vitest";
import {
  appendAudit,
  type AuditEntry,
  auditActions,
  auditActors,
  auditCategories,
  auditLogFor,
  filterAudit,
  MAX_VISITOR_ENTRIES,
} from "./audit";

const tunde = { name: "Tunde Bakare", role: "operations" as const };

describe("appendAudit", () => {
  it("adds the entry first, with who did it and their role at the time", () => {
    const log = appendAudit(
      [],
      tunde,
      { action: "wallet.freeze", target: "Kola Kitchen", detail: "Suspected fraud" },
      "2026-11-09T10:00:00.000Z",
      "abc",
    );
    expect(log).toEqual([
      {
        id: "abc",
        at: "2026-11-09T10:00:00.000Z",
        actor: "Tunde Bakare",
        actorRole: "operations",
        action: "wallet.freeze",
        target: "Kola Kitchen",
        detail: "Suspected fraud",
      },
    ]);
  });

  it("keeps only the most recent entries", () => {
    let log: AuditEntry[] = [];
    for (let i = 0; i < MAX_VISITOR_ENTRIES + 5; i++) {
      log = appendAudit(log, tunde, { action: "wallet.unfreeze", target: `w${i}` });
    }
    expect(log).toHaveLength(MAX_VISITOR_ENTRIES);
    expect(log[0].target).toBe(`w${MAX_VISITOR_ENTRIES + 4}`);
  });
});

describe("auditLogFor", () => {
  it("merges the visitor's entries into the history, newest first", () => {
    const mine = appendAudit([], tunde, {
      action: "transactions.export",
      target: "Transactions",
    }, "2026-11-09T10:00:00.000Z");
    const log = auditLogFor(mine);
    expect(log[0]).toBe(mine[0]);
    expect(log.length).toBeGreaterThan(1);
    for (let i = 1; i < log.length; i++) {
      expect(log[i - 1].at >= log[i].at).toBe(true);
    }
  });
});

describe("filterAudit", () => {
  const log = auditLogFor([]);

  it("filters by category", () => {
    const fees = filterAudit(log, { category: "fees" });
    expect(fees.length).toBeGreaterThan(0);
    expect(fees.every((e) => e.action.startsWith("fee."))).toBe(true);
  });

  it("filters by who did it", () => {
    const risk = filterAudit(log, { actor: "Risk team" });
    expect(risk.length).toBe(2);
    expect(risk.every((e) => e.actorRole === undefined)).toBe(true);
  });

  it("returns everything with no filter", () => {
    expect(filterAudit(log, {})).toEqual(log);
  });
});

describe("auditActors", () => {
  it("lists each person once", () => {
    expect(auditActors(auditLogFor([]))).toEqual(["Adaeze Okafor", "Risk team"]);
  });
});

describe("auditActions", () => {
  it("puts every action in a known category", () => {
    for (const { category } of Object.values(auditActions)) {
      expect(Object.keys(auditCategories)).toContain(category);
    }
  });
});
