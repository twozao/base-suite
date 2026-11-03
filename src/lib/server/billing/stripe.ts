import Stripe from "stripe"
import { env } from "$env/dynamic/private"

// One Stripe client for the app. Read at request time (not import time) so a build never needs the key
// and a deployment without the subscriptions module needs no Stripe account at all.
export const STRIPE_API_VERSION = "2023-08-16"

let client: { key: string; stripe: Stripe } | null = null

/** The Stripe client, or null when PRIVATE_STRIPE_API_KEY is not set. */
export const stripeClient = (): Stripe | null => {
  const key = env.PRIVATE_STRIPE_API_KEY
  if (!key) return null
  if (client?.key !== key) {
    client = {
      key,
      stripe: new Stripe(key, {
        apiVersion: STRIPE_API_VERSION,
        httpClient: Stripe.createFetchHttpClient(),
      }),
    }
  }
  return client.stripe
}
