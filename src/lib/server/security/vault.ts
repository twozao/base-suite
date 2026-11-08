import { secretMaterial } from "../auth/signin"
import { keyFrom, open, seal } from "./secret_box"

// Secrets the site stores for itself (webhook and app signing keys, 2FA seeds), sealed with the site key.
// The context names the field, so a sealed value copied to another field does not open.
export const sealValue = (plain: string, context: string) =>
  seal(plain, keyFrom(secretMaterial()), context)

export const openValue = (box: string, context: string) =>
  open(box, keyFrom(secretMaterial()), context)
