import { describe, expect, it } from "vitest";
import {
  type Admin,
  adminChangeSchema,
  applyAdminChange,
  applyAdminOverrides,
  checkAdminChange,
  checkInvite,
  emptyAdminOverrides,
  inviteSchema,
  MAX_PENDING_INVITES,
} from "./admins";

const admins = applyAdminOverrides(emptyAdminOverrides());
const byId = (id: string, list: readonly Admin[] = admins) =>
  list.find((admin) => admin.id === id)!;

const adaeze = "usr_adaeze";

describe("applyAdminOverrides", () => {
  it("starts with the demo accounts, a deactivated admin and an invite", () => {
    expect(byId("usr_tunde")).toMatchObject({
      role: "operations",
      status: "active",
      canSignIn: true,
    });
    expect(byId("usr_obinna").status).toBe("deactivated");
    expect(byId("usr_zainab").status).toBe("invited");
  });

  it("applies changes, adds invites and drops revoked ones", () => {
    const list = applyAdminOverrides({
      changed: {
        usr_tunde: {
          role: "viewer",
          status: "active",
          by: "Adaeze Okafor",
          at: "2026-11-02T09:00:00.000Z",
        },
      },
      invited: [
        {
          id: "usr_new",
          name: "Seun Afolabi",
          email: "seun@paydesk.example",
          role: "operations",
          addedAt: "2026-11-02T09:00:00.000Z",
          by: "Tunde Bakare",
        },
      ],
      revoked: ["usr_zainab"],
    });
    expect(byId("usr_tunde", list)).toMatchObject({
      role: "viewer",
      changedBy: "Adaeze Okafor",
    });
    expect(byId("usr_new", list)).toMatchObject({
      status: "invited",
      changedBy: "Tunde Bakare",
      canSignIn: false,
    });
    expect(list.some((admin) => admin.id === "usr_zainab")).toBe(false);
  });
});

describe("checkAdminChange", () => {
  it("allows ordinary changes", () => {
    expect(
      checkAdminChange(
        admins,
        byId("usr_tunde"),
        { action: "change_role", role: "viewer" },
        adaeze,
      ),
    ).toBeNull();
    expect(
      checkAdminChange(admins, byId("usr_tunde"), { action: "deactivate" }, adaeze),
    ).toBeNull();
    expect(
      checkAdminChange(admins, byId("usr_obinna"), { action: "reactivate" }, adaeze),
    ).toBeNull();
  });

  it("never lets admins change their own account", () => {
    expect(
      checkAdminChange(admins, byId(adaeze), { action: "deactivate" }, adaeze),
    ).toBe("self");
  });

  it("keeps at least one active super admin", () => {
    // Tunde promoted, so he can act on Adaeze while she's the only other one
    const withTwo = admins.map((a) =>
      a.id === "usr_tunde" ? { ...a, role: "super_admin" as const } : a,
    );
    expect(
      checkAdminChange(withTwo, byId(adaeze, withTwo), { action: "deactivate" }, "usr_tunde"),
    ).toBeNull();

    const withOne = withTwo.map((a) =>
      a.id === adaeze ? { ...a, status: "deactivated" as const } : a,
    );
    // Tunde is now the only one: an attempt to demote him is refused
    expect(
      checkAdminChange(
        withOne,
        byId("usr_tunde", withOne),
        { action: "change_role", role: "viewer" },
        "usr_ngozi",
      ),
    ).toBe("last_super_admin");
  });

  it("doesn't count invited super admins as active", () => {
    const withInvite = [
      ...admins,
      {
        ...byId("usr_zainab"),
        id: "usr_invited_super",
        role: "super_admin" as const,
      },
    ];
    expect(
      checkAdminChange(
        withInvite,
        byId(adaeze, withInvite),
        { action: "deactivate" },
        "usr_tunde",
      ),
    ).toBe("last_super_admin");
  });

  it("refuses changes that make no sense", () => {
    const tunde = byId("usr_tunde");
    expect(
      checkAdminChange(admins, tunde, { action: "change_role", role: "operations" }, adaeze),
    ).toBe("same_role");
    expect(
      checkAdminChange(admins, byId("usr_obinna"), { action: "deactivate" }, adaeze),
    ).toBe("already_deactivated");
    expect(
      checkAdminChange(admins, tunde, { action: "reactivate" }, adaeze),
    ).toBe("not_deactivated");
    expect(
      checkAdminChange(admins, byId("usr_zainab"), { action: "deactivate" }, adaeze),
    ).toBe("invite_pending");
  });
});

describe("applyAdminChange", () => {
  it("changes only what was asked", () => {
    const tunde = byId("usr_tunde");
    expect(applyAdminChange(tunde, { action: "change_role", role: "viewer" })).toEqual({
      ...tunde,
      role: "viewer",
    });
    expect(applyAdminChange(tunde, { action: "deactivate" }).status).toBe(
      "deactivated",
    );
  });
});

describe("adminChangeSchema", () => {
  it.each([
    [{ action: "change_role", role: "god_mode" }],
    [{ action: "change_role" }],
    [{ action: "delete" }],
    [null],
  ])("rejects %j", (body) => {
    expect(adminChangeSchema.safeParse(body).success).toBe(false);
  });
});

describe("inviteSchema", () => {
  const valid = {
    name: "Seun Afolabi",
    email: "seun@paydesk.example",
    role: "operations",
  };

  it("tidies the email", () => {
    expect(
      inviteSchema.parse({ ...valid, email: "  Seun@PayDesk.Example " }).email,
    ).toBe("seun@paydesk.example");
  });

  it.each([
    [{ name: "S" }, "Enter their full name"],
    [{ email: "seun" }, "Enter a valid email address"],
    [{ email: "seun@gmail.com" }, "Use a company address ending in @paydesk.example"],
    [{ email: "seun@paydesk.example.evil.com" }, "Use a company address ending in @paydesk.example"],
    [{ role: "owner" }, "Choose a role"],
  ])("rejects %j", (change, message) => {
    const result = inviteSchema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });
});

describe("checkInvite", () => {
  const invite = {
    name: "Seun Afolabi",
    email: "seun@paydesk.example",
    role: "operations" as const,
  };

  it("allows a new address", () => {
    expect(checkInvite(admins, invite)).toBeNull();
  });

  it("refuses an address that's already used, even by a deactivated account", () => {
    expect(
      checkInvite(admins, { ...invite, email: "obinna@paydesk.example" }),
    ).toBe("email_taken");
  });

  it("limits pending invites", () => {
    const full = [
      ...admins,
      ...Array.from({ length: MAX_PENDING_INVITES - 1 }, (_, i) => ({
        ...byId("usr_zainab"),
        id: `usr_i${i}`,
        email: `i${i}@paydesk.example`,
      })),
    ];
    expect(checkInvite(full, invite)).toBe("too_many_invites");
  });
});
