export function getToneMessage(score: number): string {
  if (score >= 90) {
    return "Wow, you actually know what you're doing! Shocking, I know."
  }
  if (score >= 70) {
    return "Not terrible, but we've seen better. You're trying, I guess?"
  }
  if (score >= 50) {
    return "Yikes. This is... something. At least it's not on fire?"
  }
  if (score >= 30) {
    return "Oh no. Oh no no no. What even is this?"
  }
  return "I'm calling the police. This is a crime scene."
}
