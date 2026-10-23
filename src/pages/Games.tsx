import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameCard } from '../components/GameCard'
import { games } from '../data/games'
import { friends } from '../data/friends'
import { usePlayerAccount } from '../context/PlayerAccount'

export function Games() {
  const { playerName, coins, choosePlayer, refreshCoins } = usePlayerAccount()
  const [identityConfirmed, setIdentityConfirmed] = useState(false)
  useEffect(() => { void refreshCoins().catch(() => undefined) }, [refreshCoins])
  if (!playerName || !identityConfirmed) return <main className="home-shell games-page"><nav className="topbar"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><Link className="topbar-note" to="/">← 回到首页</Link></nav><section className="games-page-intro"><p className="eyebrow"><span>✳</span> YOUR ACCOUNT</p><h1>先选一下，你是谁？</h1><p>选好身份后，就能查看游戏列表和账户西八币。</p></section><div className="dg-account-grid games-account-grid">{friends.map(friend => <button key={friend.id} type="button" onClick={() => { choosePlayer(friend.name); setIdentityConfirmed(true) }} style={{ '--account-color': friend.color } as React.CSSProperties}><span>{friend.emoji}</span><strong>{friend.name}</strong><b>↗</b></button>)}</div></main>
  return <main className="home-shell games-page"><nav className="topbar"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><div className="games-account-tools"><span>当前身份：<strong>{playerName}</strong> · 🪙 {coins} 西八币</span><button onClick={() => choosePlayer(null)}>切换身份</button></div></nav>
    <section className="games-page-intro"><p className="eyebrow"><span>✳</span> THE PLAYGROUND</p><h1>今天玩点什么？</h1><p>挑一个喜欢的，叫上朋友一起开始。</p></section>
    <section className="games-section"><div className="games-grid">{games.map((game, index) => <GameCard key={game.slug} game={game} index={index} />)}</div></section>
    <footer className="site-footer"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><p>八个人的小小游乐场</p><span className="maker-credit">MADE WITH ♥ BY <strong>姜霁宸</strong></span></footer>
  </main>
}
