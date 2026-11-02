import type { LayoutServerLoad } from "./$types"
import { getStaff } from "$lib/server/auth/staff"

export const load: LayoutServerLoad = async (event) => {
  // Session here is from authGuard hook
  const staff = event.locals.user ? await getStaff(event) : null

  return {
    session: event.locals.session,
    cookies: event.cookies.getAll(),
    isStaff: !!staff,
  }
}
