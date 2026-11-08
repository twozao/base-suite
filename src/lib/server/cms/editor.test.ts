import { describe, expect, it } from "vitest"
import { permissionsFor } from "$lib/permissions"
import { accessFor } from "./editor"

const staff = (
  role: "admin" | "editor" | "author" | "contributor" | "support",
  userId = "me",
) => ({ userId, permissions: permissionsFor([role]) })

describe("who may edit and publish", () => {
  it("editors handle everything", () => {
    const a = accessFor(staff("editor"), {
      created_by: "other",
      status: "published",
    })
    expect(a).toEqual({ canEdit: true, canPublish: true, canDelete: true })
  })
  it("authors publish their own work only", () => {
    expect(
      accessFor(staff("author"), { created_by: "me", status: "published" }),
    ).toMatchObject({ canEdit: true, canPublish: true })
    expect(
      accessFor(staff("author"), { created_by: "other", status: "draft" }),
    ).toMatchObject({ canEdit: false, canPublish: false })
  })
  it("contributors write drafts and cannot touch live content", () => {
    expect(accessFor(staff("contributor"), null)).toMatchObject({
      canEdit: true,
      canPublish: false,
    })
    expect(
      accessFor(staff("contributor"), {
        created_by: "me",
        status: "published",
      }),
    ).toMatchObject({ canEdit: false })
    expect(
      accessFor(staff("contributor"), { created_by: "me", status: "draft" })
        .canDelete,
    ).toBe(false)
  })
  it("support staff cannot write content", () => {
    expect(accessFor(staff("support"), null).canEdit).toBe(false)
  })
})
