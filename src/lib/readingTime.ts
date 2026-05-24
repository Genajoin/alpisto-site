export function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute))
  return `${minutes} min read`
}
