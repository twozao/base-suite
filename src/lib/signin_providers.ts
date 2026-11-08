// Sign-in providers and the setup notes shown in Admin -> Sign-in. Safe for server and browser: no secrets here.
export const OAUTH_PROVIDERS = ["google", "github"] as const
export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]

export const isOAuthProvider = (v: unknown): v is OAuthProviderId =>
  typeof v === "string" && (OAUTH_PROVIDERS as readonly string[]).includes(v)

export const PROVIDER_INFO: Record<
  OAuthProviderId,
  { label: string; consoleUrl: string; consoleName: string; steps: string[] }
> = {
  google: {
    label: "Google",
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    consoleName: "Google Cloud Console",
    steps: [
      "Open APIs & Services -> Credentials and configure the OAuth consent screen if asked.",
      "Choose Create credentials -> OAuth client ID, with the type Web application.",
      "Add the callback URL below under Authorized redirect URIs.",
      "Copy the client ID and client secret here.",
    ],
  },
  github: {
    label: "GitHub",
    consoleUrl: "https://github.com/settings/developers",
    consoleName: "GitHub Developer settings",
    steps: [
      "Open OAuth Apps -> New OAuth App (an OAuth App, not a GitHub App).",
      "Set Homepage URL to your site and paste the callback URL below as the Authorization callback URL.",
      "Register it, then choose Generate a new client secret.",
      "Copy the client ID and client secret here.",
    ],
  },
}

/** Fixed messages for ?oauth_error=, so nothing from the URL is ever shown to the visitor. */
export const OAUTH_ERRORS: Record<string, string> = {
  denied: "Sign-in was cancelled.",
  state: "That sign-in attempt expired. Please try again.",
  provider_failed:
    "We could not complete sign-in with that provider. Please try again.",
  email_unverified:
    "That account has no verified email address, so it cannot be used here.",
  account_exists:
    "An account with this email already exists. Sign in with your password, then connect this provider in Account -> Settings.",
  signup_closed: "New accounts are not open at the moment.",
  closed: "Sign-in is limited to staff.",
  linked_elsewhere: "That account is already connected to a different user.",
  last_method:
    "Set a password or connect another provider before removing your only sign-in method.",
}
