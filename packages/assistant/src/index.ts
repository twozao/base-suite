export {
  createAssistant,
  type Assistant,
  type AssistantOptions,
  type Reply,
  type Who,
} from "./assistant"
export { createHandler, type HandlerOptions } from "./http/handler"
export type { SqlDriver, SqlRow } from "./store/driver"
export type { EmbeddingEngine } from "./embed/types"
export {
  remoteEngine,
  workersAiEngine,
  NEEDLE_MODEL,
} from "./embed/needle-core"
export type { Visitor, VisitorDetails } from "./store/store"
export { canChat, parseSettings, type Role, type Settings } from "./settings"
