import { describe, expect, it } from "vitest";

import type { VaultItemHead } from "@/lib/vault/browser-note-conflict";
import { filterVaultItems, sortVaultItems } from "./vault-workspace-utils";

const note: VaultItemHead = { id: "note-1", revisionNumber: 1, revisionHash: new Uint8Array(32), type: "note", title: "Tokyo itinerary", body: "Book the train", labels: [] };
const login: VaultItemHead = { id: "login-1", revisionNumber: 1, revisionHash: new Uint8Array(32), type: "login", title: "Example account", username: "gabri", password: "not-searchable", url: "https://example.com", labels: [] };

describe("filterVaultItems", () => {
  it("filters by type and relevant decrypted fields", () => {
    expect(filterVaultItems([note, login], "train", "all")).toEqual([note]);
    expect(filterVaultItems([note, login], "gabri", "login")).toEqual([login]);
    expect(filterVaultItems([note, login], "tokyo", "login")).toEqual([]);
  });

  it("does not include login passwords in the local search index", () => {
    expect(filterVaultItems([note, login], "not-searchable", "all")).toEqual([]);
  });

  it("sorts by verified envelope timestamps and title", () => {
    const older = { ...note, title: "Zulu", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" };
    const newer = { ...login, title: "Alpha", createdAt: "2026-01-03T00:00:00.000Z", updatedAt: "2026-01-04T00:00:00.000Z" };
    expect(sortVaultItems([newer, older], "created")).toEqual([newer, older]);
    expect(sortVaultItems([older, newer], "title")).toEqual([newer, older]);
  });
});
