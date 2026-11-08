import { agency } from "./agency"
import { enterprise } from "./enterprise"
import { portfolio } from "./portfolio"
import type { SeedProfile } from "./types"

export type { SeedProfile, SeedPage, SeedPost } from "./types"

export const SEED_PROFILES: Record<string, SeedProfile> = {
  [agency.id]: agency,
  [enterprise.id]: enterprise,
  [portfolio.id]: portfolio,
}

export const seedProfileIds = () => Object.keys(SEED_PROFILES)
