import { z } from "zod"
import type { OAuthProviderId } from "$lib/signin_providers"
import { randomToken } from "../security/crypto"
import type { Credentials } from "./signin"

// OAuth 2.0 authorization code flow with PKCE against each provider's fixed endpoints.
export type OAuthProfile = {
  provider: OAuthProviderId
  subject: string
  email: string
  emailVerified: boolean
  name: string | null
}

const TIMEOUT_MS = 10_000

const ENDPOINTS = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
  },
  github: {
    authorize: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
  },
} as const

export const newFlowSecrets = () => ({
  state: randomToken(),
  verifier: randomToken(48),
})

const pkceChallenge = async (verifier: string) =>
  btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(verifier),
        ),
      ),
    ),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

export const authorizeUrl = async (
  id: OAuthProviderId,
  creds: Pick<Credentials, "clientId">,
  redirectUri: string,
  flow: { state: string; verifier: string },
) => {
  const url = new URL(ENDPOINTS[id].authorize)
  url.search = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ENDPOINTS[id].scope,
    state: flow.state,
    code_challenge: await pkceChallenge(flow.verifier),
    code_challenge_method: "S256",
  }).toString()
  return url.toString()
}

const tokenSchema = z.object({ access_token: z.string().min(1) })
const googleUser = z.object({
  sub: z.string().min(1).max(255),
  email: z.string().email().max(320),
  email_verified: z.boolean().optional(),
  name: z.string().max(200).nullish(),
})
const githubUser = z.object({
  id: z.number(),
  name: z.string().max(200).nullish(),
})
const githubEmails = z.array(
  z.object({
    email: z.string().email().max(320),
    primary: z.boolean(),
    verified: z.boolean(),
  }),
)

const readJson = async (res: Response, what: string) => {
  // Status only: provider bodies can echo codes and tokens, which must not reach the logs.
  if (!res.ok) throw new Error(`${what} answered ${res.status}`)
  return res.json()
}

/** Exchanges the code and reads the identity. Throws on any provider or shape failure. */
export const fetchProfile = async (
  id: OAuthProviderId,
  creds: Credentials,
  input: { code: string; verifier: string; redirectUri: string },
  fetcher: typeof fetch = fetch,
): Promise<OAuthProfile> => {
  const signal = () => AbortSignal.timeout(TIMEOUT_MS)
  const token = tokenSchema.parse(
    await readJson(
      await fetcher(ENDPOINTS[id].token, {
        method: "POST",
        signal: signal(),
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          code: input.code,
          redirect_uri: input.redirectUri,
          code_verifier: input.verifier,
        }),
      }),
      `${id} token endpoint`,
    ),
  ).access_token
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${token}`,
    "user-agent": "base-suite",
  }
  if (id === "google") {
    const u = googleUser.parse(
      await readJson(
        await fetcher("https://openidconnect.googleapis.com/v1/userinfo", {
          headers,
          signal: signal(),
        }),
        "google userinfo",
      ),
    )
    return {
      provider: id,
      subject: u.sub,
      email: u.email,
      emailVerified: u.email_verified === true,
      name: u.name ?? null,
    }
  }
  const [user, emails] = await Promise.all([
    fetcher("https://api.github.com/user", { headers, signal: signal() }).then(
      (r) => readJson(r, "github user"),
    ),
    fetcher("https://api.github.com/user/emails", {
      headers,
      signal: signal(),
    }).then((r) => readJson(r, "github emails")),
  ])
  const u = githubUser.parse(user)
  const list = githubEmails.parse(emails)
  const primary = list.find((e) => e.primary && e.verified)
  return {
    provider: id,
    subject: String(u.id),
    email: primary?.email ?? list.find((e) => e.primary)?.email ?? "",
    emailVerified: !!primary,
    name: u.name ?? null,
  }
}
