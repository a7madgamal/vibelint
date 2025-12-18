import type { Finding } from "./plugin"

/**
 * Count-based system - only counts findings by weight category.
 * No scoring or math operations, just counting.
 *
 * Weight scale: 1-5
 * - 1: Low impact
 * - 2: Minor issue
 * - 3: Medium issue
 * - 4: High issue
 * - 5: Catastrophic issue
 */

/**
 * Counts findings by weight category.
 * Returns counts for each weight level (1-5).
 */
export function countFindingsByWeight(findings: Finding[]): {
  weight5: number // Critical
  weight4: number // High
  weight3: number // Medium
  weight2: number // Low
  weight1: number // Low
} {
  const counts = {
    weight5: 0,
    weight4: 0,
    weight3: 0,
    weight2: 0,
    weight1: 0
  }

  for (const finding of findings) {
    // Count findings by weight (strictly 1-5)
    const weight = finding.weight
    if (weight === 5) counts.weight5++
    else if (weight === 4) counts.weight4++
    else if (weight === 3) counts.weight3++
    else if (weight === 2) counts.weight2++
    else if (weight === 1) counts.weight1++
  }

  return counts
}
