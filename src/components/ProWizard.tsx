import { useState, useEffect, useRef } from 'react'
import { apiService } from '../utils/api'
import './ProWizard.css'

interface ProWizardProps {
  isOpen: boolean
  onClose: () => void
  language: 'en' | 'fr'
  businessName: string
  email: string
}

export default function ProWizard({
  isOpen,
  onClose,
  language,
  businessName,
  email,
}: ProWizardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Wizard form data
  const [address, setAddress] = useState('')
  const [businessType, setBusinessType] = useState<'shop' | 'mobile'>('shop')
  const [hourlyRate, setHourlyRate] = useState('')
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
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

  const next = (step: number) => {
    setCurrentStep(step)
    const dots = document.querySelectorAll('.wp-step')
    dots.forEach((dot, idx) => {
      if (idx + 1 === step) {
        dot.classList.add('active')
      }
      if (idx + 1 < step) {
        dot.classList.add('completed')
        dot.classList.remove('active')
      } else if (idx + 1 > step) {
        dot.classList.remove('active', 'completed')
      }
    })
  }

  const prev = (step: number) => {
    setCurrentStep(step)
    const dots = document.querySelectorAll('.wp-step')
    dots.forEach((dot, idx) => {
      if (idx + 1 === step) {
        dot.classList.add('active')
        dot.classList.remove('completed')
      }
      if (idx + 1 < step) {
        dot.classList.add('completed')
        dot.classList.remove('active')
      } else if (idx + 1 > step) {
        dot.classList.remove('active', 'completed')
      }
    })
  }

  const handleClose = () => {
    dialogRef.current?.close()
    onClose()
    // Reset form when closing
    setCurrentStep(1)
    setAddress('')
    setBusinessType('shop')
    setHourlyRate('')
    setLicenseFile(null)
  }

  const handleSubmit = async () => {
    if (!email) {
      alert('Email is required')
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: Upload license file to storage and get URL
      // For now, we'll just save the file name
      const wizardData = {
        email,
        address,
        business_type: businessType,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        business_license_file_name: licenseFile?.name || undefined,
        // business_license_url: uploadedFileUrl, // Will be added when file upload is implemented
      }

      await apiService.updateProviderSignup(wizardData)
      
      alert('Profile Completed! We will review your submission and get back to you soon.')
      handleClose()
    } catch (error) {
      console.error('Failed to submit provider signup:', error)
      alert('Error submitting profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal modal-wizard" id="modal-wizard">
      <div className="modal-header">
        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>
          Shop Setup
        </h3>
        <span className="material-icons-round close-icon" onClick={handleClose}>
          close
        </span>
      </div>
      <div className="modal-body">
        <div className="wizard-progress-track">
          <div className={`wp-step ${currentStep >= 1 ? 'active' : ''}`} id="w-dot-1">
            1
          </div>
          <div className={`wp-step ${currentStep >= 2 ? 'active' : ''}`} id="w-dot-2">
            2
          </div>
          <div className={`wp-step ${currentStep >= 3 ? 'active' : ''}`} id="w-dot-3">
            3
          </div>
          <div className={`wp-step ${currentStep >= 4 ? 'active' : ''}`} id="w-dot-4">
            4
          </div>
        </div>

        {currentStep === 1 && (
          <div className="wizard-step active" id="w-step-1">
            <h1 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>
              Location
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Where do you operate?
            </p>
            <label className="form-label">Business Name</label>
            <input
              type="text"
              className="form-control"
              id="wizard-biz-name"
              value={businessName}
              readOnly
            />
            <label className="form-label">Address</label>
            <input type="text" className="form-control" placeholder="123 Main St" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => next(2)}>
                Next
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="wizard-step active" id="w-step-2">
            <h1 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>
              Type
            </h1>
            <div className="type-grid">
              <label className="type-option">
                <input
                  type="radio"
                  name="wShopType"
                  checked={businessType === 'shop'}
                  onChange={() => setBusinessType('shop')}
                />
                <div className="material-icons-round type-icon">storefront</div>
                <div className="type-title">Shop</div>
              </label>
              <label className="type-option">
                <input
                  type="radio"
                  name="wShopType"
                  checked={businessType === 'mobile'}
                  onChange={() => setBusinessType('mobile')}
                />
                <div className="material-icons-round type-icon">local_shipping</div>
                <div className="type-title">Mobile</div>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => prev(1)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={() => next(3)}>
                Next
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="wizard-step active" id="w-step-3">
            <h1 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>
              Rates
            </h1>
            <label className="form-label">Hourly Rate</label>
            <input
              type="number"
              className="form-control"
              placeholder="95.00"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              step="0.01"
              min="0"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => prev(2)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={() => next(4)}>
                Next
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="wizard-step active" id="w-step-4">
            <h1 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>
              Verify
            </h1>
            <label className="upload-box" style={{ cursor: 'pointer' }}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setLicenseFile(file)
                }}
              />
              <div className="material-icons-round upload-icon">cloud_upload</div>
              <div style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
                {licenseFile ? licenseFile.name : 'Upload Business License'}
              </div>
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" onClick={() => prev(3)}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  )
}

