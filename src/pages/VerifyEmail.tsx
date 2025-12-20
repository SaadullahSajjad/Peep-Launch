import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiService } from '../utils/api'
import './VerifyEmail.css'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || !email) {
        setStatus('error')
        setMessage('Missing verification token or email. Please check your email link.')
        return
      }

      try {
        const result = await apiService.verifyProviderEmail(email, token)
        setStatus('success')
        setMessage(result.message || 'Email verified successfully!')
        
        // Redirect to profile preview after 3 seconds
        setTimeout(() => {
          navigate('/profile-preview')
        }, 3000)
      } catch (error: any) {
        setStatus('error')
        setMessage(error.message || 'Failed to verify email. The link may have expired or is invalid.')
      }
    }

    verifyEmail()
  }, [token, email, navigate])

  return (
    <div className="verify-email-page">
      <div className="verify-container">
        {status === 'loading' && (
          <>
            <div className="verify-icon loading">
              <span className="material-icons-round">hourglass_empty</span>
            </div>
            <h1>Verifying your email...</h1>
            <p>Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verify-icon success">
              <span className="material-icons-round">check_circle</span>
            </div>
            <h1>Email Verified!</h1>
            <p>{message}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              Redirecting to your profile preview...
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/profile-preview')}
              style={{ marginTop: '2rem' }}
            >
              Go to Profile Preview
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verify-icon error">
              <span className="material-icons-round">error</span>
            </div>
            <h1>Verification Failed</h1>
            <p>{message}</p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/')}
              >
                Go to Home
              </button>
              <button
                className="btn btn-outline"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

