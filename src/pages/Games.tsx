import { Link } from 'react-router-dom'
import { GameCard } from '../components/GameCard'
import { games } from '../data/games'

export function Games() {
  return <main className="home-shell games-page"><nav className="topbar"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><Link className="topbar-note" to="/">← 回到首页</Link></nav>
    <section className="games-page-intro"><p className="eyebrow"><span>✳</span> THE PLAYGROUND</p><h1>今天玩点什么？</h1><p>挑一个喜欢的，叫上朋友一起开始。</p></section>
    <section className="games-section"><div className="games-grid">{games.map((game, index) => <GameCard key={game.slug} game={game} index={index} />)}</div></section>
    <footer className="site-footer"><Link className="brand" to="/"><span className="brand-mark">西</span><span>西八小站<span className="brand-dot">.</span></span></Link><p>八个人的小小游乐场</p><span className="maker-credit">MADE WITH ♥ BY <strong>姜霁宸</strong></span></footer>
  </main>
}
