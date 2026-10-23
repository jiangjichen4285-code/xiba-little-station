import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FriendMatchQuiz } from './pages/FriendMatchQuiz'
import { FriendMatchResult } from './pages/FriendMatchResult'
import { Home } from './pages/Home'
import { MbtiTest } from './pages/MbtiTest'
import './styles.css'
export function App() { const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, ''); return <BrowserRouter basename={basename}><Routes><Route path="/" element={<Home />} /><Route path="/games/friend-match" element={<FriendMatchQuiz />} /><Route path="/games/friend-match/result" element={<FriendMatchResult />} /><Route path="/games/mbti-test" element={<MbtiTest />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter> }
