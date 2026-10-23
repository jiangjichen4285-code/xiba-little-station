import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FriendMatchQuiz } from './pages/FriendMatchQuiz'
import { FriendMatchResult } from './pages/FriendMatchResult'
import { Home } from './pages/Home'
import { MbtiTest } from './pages/MbtiTest'
import { DrawAndGuess } from './pages/DrawAndGuess'
import { Games } from './pages/Games'
import { PlayerAccountProvider, usePlayerAccount } from './context/PlayerAccount'
import './styles.css'
function RequirePlayer({ children }: { children: React.ReactNode }) { const { playerName } = usePlayerAccount(); return playerName ? <>{children}</> : <Navigate to="/games" replace /> }
export function App() { const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, ''); return <BrowserRouter basename={basename}><PlayerAccountProvider><Routes><Route path="/" element={<Home />} /><Route path="/games" element={<Games />} /><Route path="/games/friend-match" element={<RequirePlayer><FriendMatchQuiz /></RequirePlayer>} /><Route path="/games/friend-match/result" element={<RequirePlayer><FriendMatchResult /></RequirePlayer>} /><Route path="/games/mbti-test" element={<RequirePlayer><MbtiTest /></RequirePlayer>} /><Route path="/games/draw-and-guess" element={<RequirePlayer><DrawAndGuess /></RequirePlayer>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></PlayerAccountProvider></BrowserRouter> }
