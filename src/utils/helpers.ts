export function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length))
}
