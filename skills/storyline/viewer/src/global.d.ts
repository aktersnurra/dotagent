interface ClaudeSample {
  (
    input: string,
    options?: {
      signal?: AbortSignal
      cache?: boolean
      modelTier?: "quick" | "default" | "complex"
      onText?: (u: { text: string; delta: string }) => void
    },
  ): Promise<{ text: string; truncated: boolean }>
}
interface Window {
  claude?: { use(name: "sample"): Promise<ClaudeSample | null> }
}

declare module "*.svg" {
  const svg: string
  export default svg
}
