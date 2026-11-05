export type ProfileFields = {
  full_name: string | null
  company_name: string | null
  website: string | null
}

/** The CreateProfileStep (src/config.ts) holds the portal until these three are filled in. */
export const hasFullProfile = (
  profile: ProfileFields | null | undefined,
): boolean =>
  !!profile &&
  !!profile.full_name &&
  !!profile.company_name &&
  !!profile.website
