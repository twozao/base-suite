import type { Migration } from "kysely/migration"
import type { DialectName } from "../index"
import { initial } from "./0001_initial"
import { oauthAccounts } from "./0002_oauth_accounts"
import { nativeBooking } from "./0003_native_booking"
import { contactFields } from "./0004_contact_fields"
import { operationsModules } from "./0005_operations_modules"
import { cmsPlatform } from "./0006_cms_platform"

// Ordered by key. Each entry builds a dialect-aware Migration; add new ones at the end.
export const migrations: Record<string, (dialect: DialectName) => Migration> = {
  "0001_initial": initial,
  "0002_oauth_accounts": oauthAccounts,
  "0003_native_booking": nativeBooking,
  "0004_contact_fields": contactFields,
  "0005_operations_modules": operationsModules,
  "0006_cms_platform": cmsPlatform,
}
