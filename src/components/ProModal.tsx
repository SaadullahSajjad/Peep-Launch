import { useState, FormEvent, useEffect, useRef } from 'react'
import { apiService } from '../utils/api'
import { useTranslations } from '../utils/i18n'
import { useToast } from '../contexts/ToastContext'
import { initializeGoogleAuth, triggerGoogleSignIn, type GoogleUserInfo } from '../utils/googleOAuth'
import './ProModal.css'

interface ProModalProps {
  isOpen: boolean
  onClose: () => void
  language: 'en' | 'fr'
  onOpenWizard: () => void
  setStoredBizName: (name: string) => void
  setStoredProviderEmail: (email: string) => void
}

export default function ProModal({
  isOpen,
  onClose,
  language,
  onOpenWizard,
  setStoredBizName,
  setStoredProviderEmail,
}: ProModalProps) {
  const t = useTranslations(language)
  const { showToast } = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [businessName, setBusinessName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showBusinessNamePrompt, setShowBusinessNamePrompt] = useState(false)
  const [googleUserInfo, setGoogleUserInfo] = useState<GoogleUserInfo | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      onClose()
    }

    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
    }
  }, [onClose])

  // Initialize Google OAuth when modal opens
  useEffect(() => {
    if (!isOpen) return

    let cleanup: (() => void) | undefined

    try {
      cleanup = initializeGoogleAuth(
        async (userInfo: GoogleUserInfo) => {
          setIsGoogleLoading(false)
          setGoogleUserInfo(userInfo)
          setFullName(userInfo.name)
          setEmail(userInfo.email)
          // Prompt for business name since it's required
          setShowBusinessNamePrompt(true)
        },
        (error) => {
          console.error('Google sign-in error:', error)
          setIsGoogleLoading(false)
          showToast('Google sign-in failed. Please try again or use email sign-up.', 'error')
        }
      )
    } catch (error) {
      console.error('Failed to initialize Google OAuth:', error)
      // If Google OAuth is not configured, the button will show an error when clicked
    }

    return () => {
      cleanup?.()
    }
  }, [isOpen])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Save to provider_signups table (without password - password will be set in ProfilePreview)
      await apiService.createProviderSignup({
        email,
        business_name: businessName,
        full_name: fullName,
        language,
      })
      setStoredBizName(businessName)
      setStoredProviderEmail(email)
      dialogRef.current?.close()
      onClose()
      onOpenWizard()
      setBusinessName('')
      setFullName('')
      setEmail('')
    } catch (error) {
      console.error('Failed to submit provider registration:', error)
      const errorMessage = error instanceof Error ? error.message : String(error) || 'An unknown error occurred'
      showToast(`Error: ${errorMessage}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    dialogRef.current?.close()
    onClose()
    // Reset state when closing
    setShowBusinessNamePrompt(false)
    setGoogleUserInfo(null)
    setBusinessName('')
    setFullName('')
    setEmail('')
  }

  const handleGoogleSignIn = () => {
    try {
      setIsGoogleLoading(true)
      triggerGoogleSignIn()
    } catch (error) {
      console.error('Failed to trigger Google sign-in:', error)
      setIsGoogleLoading(false)
      showToast('Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.', 'error')
    }
  }

  const handleGoogleBusinessNameSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!businessName.trim() || !googleUserInfo) return

    setIsSubmitting(true)

    try {
      // Save to provider_signups table (same flow as email signup)
      await apiService.createProviderSignup({
        email: googleUserInfo.email,
        business_name: businessName.trim(),
        full_name: googleUserInfo.name,
        language,
      })
      setStoredBizName(businessName.trim())
      setStoredProviderEmail(googleUserInfo.email)
      dialogRef.current?.close()
      onClose()
      onOpenWizard()
      // Reset state
      setBusinessName('')
      setFullName('')
      setEmail('')
      setShowBusinessNamePrompt(false)
      setGoogleUserInfo(null)
    } catch (error) {
      console.error('Failed to submit provider registration:', error)
      showToast('Error submitting registration. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal modal-pro" id="modal-pro">
      <div className="modal-header">
        <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Peepeep <span className="pro-badge">Pro</span>
        </h3>
        <span className="material-icons-round close-icon" onClick={handleClose}>
          close
        </span>
      </div>
      <form onSubmit={handleSubmit} id="pro-form">
        <div className="modal-body">
          {(isGoogleLoading || isSubmitting) ? (
            <div className="pro-processing">
              <div className="pro-spinner" aria-hidden="true">
                <span className="material-icons-round">{isGoogleLoading ? 'login' : 'hourglass_top'}</span>
              </div>
              <p className="pro-text">
                {isGoogleLoading
                  ? (language === 'en' ? 'Signing in with Google...' : 'Connexion avec Google...')
                  : (language === 'en' ? 'Applying...' : 'Envoi en cours...')}
              </p>
              <div className="pro-dots">
                <span className="pro-dot" />
                <span className="pro-dot" />
                <span className="pro-dot" />
              </div>
            </div>
          ) : (
            <>
          <div className="social-grid">
            <button
              type="button"
              className="btn-social"
              style={{ width: '100%' }}
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>

          <div className="auth-divider">Or continue with email</div>

          <p className="pro-desc" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {t('pro_desc')}
          </p>

          <label className="form-label">{t('label_biz')}</label>
          <input
            type="text"
            className="form-control"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Joe's Garage"
            id="quick-biz-name"
            required
          />

          <label className="form-label" style={{ marginTop: '0.5rem' }}>
            Full Name
          </label>
          <input
            type="text"
            className="form-control"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Joseph Smith"
            required
          />

          <label className="form-label" style={{ marginTop: '0.5rem' }}>
            {t('label_email')}
          </label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="partner@shop.com"
            required
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', fontWeight: 800 }}
            disabled={isSubmitting}
          >
            {t('btn_apply')}
          </button>
            </>
          )}
        </div>
      </form>

      {/* Business Name Prompt Modal for Google Sign-In */}
      {showBusinessNamePrompt && googleUserInfo && (
        <div 
          className="pro-prompt-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setShowBusinessNamePrompt(false)
              setGoogleUserInfo(null)
              setIsGoogleLoading(false)
            }
          }}
        >
          <div className="pro-prompt-card" onClick={(e) => e.stopPropagation()}>
            {isSubmitting ? (
              <div className="pro-processing">
                <div className="pro-spinner" aria-hidden="true">
                  <span className="material-icons-round">save</span>
                </div>
                <p className="pro-text">
                  {language === 'en' ? 'Saving...' : 'Enregistrement...'}
                </p>
                <div className="pro-dots">
                  <span className="pro-dot" />
                  <span className="pro-dot" />
                  <span className="pro-dot" />
                </div>
              </div>
            ) : (
              <>
            <h3 className="pro-prompt-title">Almost there!</h3>
            <p className="pro-prompt-desc">
              We need your business name to complete the registration.
            </p>
            <form onSubmit={handleGoogleBusinessNameSubmit}>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Business Name
              </label>
              <input
                type="text"
                className="form-control"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Joe's Garage"
                required
                autoFocus
                style={{ width: '100%', marginBottom: '1.5rem' }}
              />
              <div className="pro-prompt-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowBusinessNamePrompt(false)
                    setGoogleUserInfo(null)
                    setIsGoogleLoading(false)
                    setBusinessName('')
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!businessName.trim()}
                  style={{ flex: 1, fontWeight: 800 }}
                >
                  Continue
                </button>
              </div>
            </form>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}

