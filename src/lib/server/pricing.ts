import type { Plan } from "./content_schema"

/** Where each plan's button goes. Paid plans without a Stripe price go to
 * the contact form so a half-configured plan never breaks checkout. */
export const planHref = (plan: Plan, signedIn: boolean) => {
  if (!plan.stripePriceId) {
    return plan.price.replace(/[^0-9.]/g, "") === "0" || plan.price === ""
      ? signedIn
        ? "/account"
        : "/login/sign_up"
      : "/contact_us"
  }
  return signedIn
    ? `/account/subscribe/${plan.id}`
    : `/login/sign_up?next=${encodeURIComponent(`/account/subscribe/${plan.id}`)}`
}

export const plansForDisplay = (plans: Plan[], signedIn: boolean) =>
  plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    interval: p.interval,
    features: p.features,
    highlighted: p.highlighted,
    ctaLabel: p.ctaLabel,
    href: planHref(p, signedIn),
  }))
