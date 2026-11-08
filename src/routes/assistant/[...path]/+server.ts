import { error, type RequestHandler } from "@sveltejs/kit"
import { requireModule } from "$lib/server/auth/staff"
import { assistantHandler } from "$lib/server/assistant"

const handle: RequestHandler = (event) => {
  requireModule("assistant")
  if (event.request.method === "HEAD") error(405, "Method not allowed")
  return assistantHandler(event)
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
