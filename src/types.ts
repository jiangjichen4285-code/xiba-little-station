export const dimensionKeys = ['social', 'logic', 'spontaneity', 'adventure', 'warmth', 'sensitivity'] as const
export type Dimension = typeof dimensionKeys[number]
export type Dimensions = Record<Dimension, number>
export type Friend = { id: string; name: string; emoji: string; color: string; intro: string; tags: string[]; dims: Dimensions; bestTogether: string[]; hidden: string }
export type Option = { text: string; scores: Partial<Dimensions> }
export type Question = { question: string; options: [Option, Option, Option] }
export type MatchResult = { friendId: string; score: number; tags: [string, string] }
