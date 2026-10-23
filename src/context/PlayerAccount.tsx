import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { playerIds } from '../data/playerAccounts'

type AccountContextValue = {
  playerName: string | null
  playerId: string | null
  coins: number
  choosePlayer: (name: string | null) => void
  refreshCoins: () => Promise<void>
  awardGameCoin: (game: 'friend-match' | 'mbti-test', playId: string) => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)
const accountKey = 'xiba-player-name'
const apiBase = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  if (!apiBase || !apiKey) throw new Error('西八币账户暂时无法连接。')
  const response = await fetch(`${apiBase}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`账户操作失败（${response.status}）`)
  return response.json() as Promise<T>
}

export function PlayerAccountProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerName] = useState<string | null>(() => {
    const saved = sessionStorage.getItem(accountKey)
    return saved && playerIds[saved] ? saved : null
  })
  const [coins, setCoins] = useState(0)
  const playerId = playerName ? playerIds[playerName] : null
  const choosePlayer = useCallback((name: string | null) => {
    if (name && playerIds[name]) { sessionStorage.setItem(accountKey, name); setPlayerName(name) }
    else { sessionStorage.removeItem(accountKey); setPlayerName(null); setCoins(0) }
  }, [])
  const refreshCoins = useCallback(async () => {
    if (!playerName) return
    const profile = await rpc<{ xiba_coins: number }>('get_global_drawing_profile', { p_player_name: playerName })
    setCoins(profile.xiba_coins)
  }, [playerName])
  const awardGameCoin = useCallback(async (game: 'friend-match' | 'mbti-test', playId: string) => {
    if (!playerId) throw new Error('请先选择身份。')
    const result = await rpc<{ xiba_coins: number }>('award_game_participation', { p_player_id: playerId, p_game_slug: game, p_play_id: playId })
    setCoins(result.xiba_coins)
  }, [playerId])
  const value = useMemo(() => ({ playerName, playerId, coins, choosePlayer, refreshCoins, awardGameCoin }), [playerName, playerId, coins, choosePlayer, refreshCoins, awardGameCoin])
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function usePlayerAccount() {
  const value = useContext(AccountContext)
  if (!value) throw new Error('PlayerAccountProvider is missing')
  return value
}

export function PlayerCoinBadge() {
  const { playerName, coins } = usePlayerAccount()
  return <span className="account-coin">{playerName} · 🪙 {coins} 西八币</span>
}
