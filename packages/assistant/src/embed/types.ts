// Turns text into vectors. Search keeps working on keywords if an engine is missing or fails.
export interface EmbeddingEngine {
  /** Stored with each vector, so changing engine re-embeds rather than mixing incompatible ones. */
  readonly model: string
  embed(texts: string[]): Promise<Float32Array[]>
  status(): Promise<{ state: string; detail?: string }>
}
