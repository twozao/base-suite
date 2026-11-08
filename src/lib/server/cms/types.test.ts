import { describe, expect, it } from "vitest"
import { fieldListSchema, readFieldValues, type FieldDef } from "./types"

const f = (over: Partial<FieldDef>): FieldDef => ({
  key: "x",
  label: "X",
  type: "text",
  required: false,
  help: "",
  options: [],
  relation: "",
  showInList: false,
  ...over,
})
const form = (o: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(o)) fd.set(k, v)
  return fd
}

describe("content type fields", () => {
  it("rejects duplicate keys and choices without options", () => {
    expect(
      fieldListSchema.safeParse([f({ key: "a" }), f({ key: "a" })]).success,
    ).toBe(false)
    expect(fieldListSchema.safeParse([f({ type: "select" })]).success).toBe(
      false,
    )
  })
  it("validates each value against its type", () => {
    const fields = [
      f({ key: "price", label: "Price", type: "number", required: true }),
      f({ key: "site", label: "Site", type: "link" }),
      f({ key: "size", label: "Size", type: "select", options: ["S", "M"] }),
      f({ key: "photo", label: "Photo", type: "image" }),
      f({ key: "live", label: "Live", type: "boolean" }),
    ]
    const bad = readFieldValues(
      fields,
      form({
        field_price: "",
        field_site: "javascript:alert(1)",
        field_size: "XL",
        field_photo: "http://x/a.png",
      }),
    )
    expect(Object.keys(bad.errors).sort()).toEqual([
      "field_photo",
      "field_price",
      "field_site",
      "field_size",
    ])
    const good = readFieldValues(
      fields,
      form({
        field_price: "12.5",
        field_site: "https://a.test",
        field_size: "M",
        field_live: "on",
      }),
    )
    expect(good.errors).toEqual({})
    expect(good.values).toMatchObject({
      price: 12.5,
      site: "https://a.test",
      size: "M",
      live: true,
      photo: null,
    })
  })
})
