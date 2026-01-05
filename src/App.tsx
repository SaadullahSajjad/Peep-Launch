import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import LandingPage from './pages/LandingPage'
import StatusPage from './pages/StatusPage'
import ProfilePreview from './pages/ProfilePreview'
import VerifyEmail from './pages/VerifyEmail'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/profile-preview" element={<ProfilePreview />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App



