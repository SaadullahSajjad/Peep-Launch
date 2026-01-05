import { useState, FormEvent, useEffect, useRef } from 'react'
import { apiService } from '../utils/api'
import { useTranslations } from '../utils/i18n'
import { useToast } from '../contexts/ToastContext'
import './ContactModal.css'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  language: 'en' | 'fr'
}

export default function ContactModal({
  isOpen,
  onClose,
  language,
}: ContactModalProps) {
  const t = useTranslations(language)
  const { showToast } = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [subject, setSubject] = useState('General')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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
      setIsSuccess(false)
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
      await apiService.submitContact({
        subject,
        email,
        message,
      })
      setIsSuccess(true)
      setSubject('General')
      setEmail('')
      setMessage('')
    } catch (error) {
      console.error('Failed to submit contact form:', error)
      showToast(t('btn_error'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsSuccess(false)
    dialogRef.current?.close()
    onClose()
  }

  return (
    <dialog ref={dialogRef} className="modal" id="modal-contact">
      <div className="modal-header">
        <h3>{t('contact_title')}</h3>
        <span className="material-icons-round close-icon" onClick={handleClose}>
          close
        </span>
      </div>

      {!isSuccess ? (
        <form onSubmit={handleSubmit} id="contact-form">
          <div className="modal-body" id="contact-form-body">
            <label className="form-label">{t('contact_subject')}</label>
            <select
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            >
              <option value="General">{t('opt_general')}</option>
              <option value="Partnership">{t('opt_partner')}</option>
              <option value="Bug">{t('opt_bug')}</option>
            </select>

            <label className="form-label">{t('contact_email')}</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('placeholder_contact_email')}
              required
            />

            <label className="form-label">{t('contact_msg')}</label>
            <textarea
              className="form-control"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('placeholder_contact_msg')}
              required
            />

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('btn_sending') : t('btn_send_msg')}
            </button>
          </div>
        </form>
      ) : (
        <div
          className="modal-body"
          id="contact-success"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '3rem 1.5rem',
          }}
        >
          <span
            className="material-icons-round"
            style={{ fontSize: '3.5rem', color: '#10B981', marginBottom: '1rem' }}
          >
            mark_email_read
          </span>
          <h3 style={{ marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.4rem' }}>
            {t('thank_you_title')}
          </h3>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              marginBottom: '1.5rem',
            }}
          >
            {t('thank_you_msg')}
          </p>
          <button className="btn btn-ghost" onClick={handleClose}>
            {t('btn_close')}
          </button>
        </div>
      )}
    </dialog>
  )
}

