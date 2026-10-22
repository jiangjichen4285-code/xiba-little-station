import { friends } from '../data/friends'
import { dimensionKeys, type Dimension, type Dimensions, type Friend, type MatchResult } from '../types'

const labels: Record<Dimension, [string, string, string]> = {
  social: ['社交电量满格', '独处回血', '社交灵活切换'], logic: ['清醒分析派', '跟着感觉走', '理性感性平衡'],
  spontaneity: ['松弛随性', '计划控', '随性计划两开花'], adventure: ['冒险尝鲜家', '稳妥派', '新鲜安全都要'],
  warmth: ['共情夸夸机', '真诚直球', '暖度刚刚好'], sensitivity: ['细腻雷达', '钝感快乐人', '细腻钝感平衡'],
}
export function calculateMatch(raw: Dimensions): MatchResult {
  const user = Object.fromEntries(dimensionKeys.map(key => [key, Math.max(-10, Math.min(10, raw[key]))])) as Dimensions
  const ranked = friends.map(friend => {
    const distance = Math.sqrt(dimensionKeys.reduce((sum, key) => sum + (user[key] - friend.dims[key]) ** 2, 0))
    const score = Math.max(55, Math.min(99, Math.round(100 - distance / Math.sqrt(6 * 20 ** 2) * 45)))
    return { friend, score, distance }
  }).sort((a, b) => b.score - a.score)
  const tied = ranked.filter(item => ranked[0].score - item.score < 0.8)
  const winner = tied[Math.floor(Math.random() * tied.length)]
  const tags = dimensionKeys.map((key, index) => ({ key, index, gap: Math.abs(user[key] - winner.friend.dims[key]) })).sort((a, b) => a.gap - b.gap || a.index - b.index).slice(0, 2).map(({ key }) => {
    const [high, low, balanced] = labels[key]
    return user[key] > 0 ? high : user[key] < 0 ? low : balanced
  }) as [string, string]
  return { friendId: winner.friend.id, score: winner.score, tags }
}
export function getFriend(id: string): Friend | undefined { return friends.find(friend => friend.id === id) }
