import { useState, FormEvent, useEffect, useRef } from 'react'
import { apiService } from '../utils/api'
import { useTranslations } from '../utils/i18n'
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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [businessName, setBusinessName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Save to provider_signups table
      await apiService.createProviderSignup({
        email,
        business_name: businessName,
        full_name: fullName,
        password,
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
      setPassword('')
    } catch (error) {
      console.error('Failed to submit provider registration:', error)
      alert('Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    dialogRef.current?.close()
    onClose()
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
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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

          <label className="form-label" style={{ marginTop: '0.5rem' }}>
            Password
          </label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', color: '#0F172A', fontWeight: 800 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? '...' : t('btn_apply')}
          </button>
        </div>
      </form>
    </dialog>
  )
}

