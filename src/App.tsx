import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import StatusPage from './pages/StatusPage'
import ProfilePreview from './pages/ProfilePreview'
import VerifyEmail from './pages/VerifyEmail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/profile-preview" element={<ProfilePreview />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App



