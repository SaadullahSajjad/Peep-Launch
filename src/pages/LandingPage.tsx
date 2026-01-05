import { useState, useEffect, FormEvent, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiService } from '../utils/api'
import {
  getStoredLanguage,
  setStoredLanguage,
  useTranslations,
  type Language,
} from '../utils/i18n'
import { getCarMakes, getCarModels, generateYears } from '../data/carDatabase'
import { useToast } from '../contexts/ToastContext'
import ContactModal from '../components/ContactModal'
import ProModal from '../components/ProModal'
import ProWizard from '../components/ProWizard'
import SearchableSelect from '../components/SearchableSelect'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const t = useTranslations(language)
  const { showToast } = useToast()
  
  // Get referral code from URL parameter
  const referralCodeFromUrl = searchParams.get('ref') || null

  // Form state
  const [currentStep, setCurrentStep] = useState(1)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [carYear, setCarYear] = useState('')
  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carModelOther, setCarModelOther] = useState('')
  
  // Derive showModelOther directly from state values for instant updates
  const showModelOther = carMake === 'Other' || carModel === 'Other'
  const [savedVehicle, setSavedVehicle] = useState<{
    year: string
    model: string
  } | null>(null)

  // Modal state
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [isProOpen, setIsProOpen] = useState(false)
  const [isProSuccessOpen, setIsProSuccessOpen] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [storedBizName, setStoredBizName] = useState('')
  const [storedProviderEmail, setStoredProviderEmail] = useState('')

  // Loading states
  const [isProcessing, setIsProcessing] = useState(false)
  const [duplicateEmailError, setDuplicateEmailError] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [statusUrl, setStatusUrl] = useState<string | null>(null)
  
  // Modal refs
  const proSuccessDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    setStoredLanguage(language)
    document.documentElement.lang = language
  }, [language])

  // Countdown timer for auto-navigation
  useEffect(() => {
    if (currentStep === 3 && statusUrl && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate(statusUrl)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [currentStep, statusUrl, countdown, navigate])

  // Track referral click when page loads with referral code (only once)
  const hasTrackedRef = useRef(false)
  useEffect(() => {
    if (referralCodeFromUrl && !hasTrackedRef.current) {
      hasTrackedRef.current = true
      // Track the referral click (don't wait for it, fire and forget)
      apiService.trackReferralClick({ referral_code: referralCodeFromUrl }).catch((error) => {
        // Silently fail - tracking is not critical
        console.error('Failed to track referral click:', error)
      })
    }
  }, [referralCodeFromUrl])


  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'fr' : 'en'
    setLanguage(newLang)
  }

  const updateProgress = (step: number) => {
    setCurrentStep(step)
  }

  // Step 1: Vehicle selection - just moves to step 2 (doesn't check availability)
  const handleVehicleCheck = (e: FormEvent) => {
    e.preventDefault()

    let finalModel = carModel
    if (showModelOther && carModelOther.trim() !== '') {
      finalModel = carModelOther.trim()
    }

    if (!carYear || !carMake || !finalModel) {
      showToast(
        language === 'en'
          ? 'Please select all vehicle details.'
          : 'Veuillez sélectionner tous les détails du véhicule.',
        'error'
      )
      return
    }

    // Just move to step 2 - no API call
    setCurrentStep(2)
    updateProgress(2)
  }

  // Step 2: Email submission - does the actual API call
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (localStorage.getItem('ppe_joined_email') === email) {
      setDuplicateEmailError(true)
      return
    }

    setDuplicateEmailError(false)
    setIsProcessing(true)

    try {
      let finalModel = carModel
      if (showModelOther && carModelOther.trim() !== '') {
        finalModel = carModelOther.trim()
      }

      const fullCarName = `${carMake} ${finalModel}`
      const result = await apiService.signupWaitlist({
        email,
        name: email.split('@')[0], // Use email prefix as name if not provided
        vehicle_year: parseInt(carYear, 10),
        vehicle_model: fullCarName,
        referral_code: referralCodeFromUrl || undefined,
        language,
      })

      // ✅ Safe storage (never breaks signup)
      try {
        localStorage.setItem('ppe_joined_email', email)
      } catch (_) {
        console.warn('localStorage blocked (Safari private)')
      }

      setSavedVehicle({ year: carYear, model: fullCarName })

      // Always show success step first
      setCurrentStep(3)
      updateProgress(3)
      
      // Store status URL for navigation after countdown and reset countdown
      if (result.status_url) {
        const url = result.status_url.replace('/status.html', '/status')
        setStatusUrl(url)
        setCountdown(5)
      } else {
        // No status URL, reset countdown
        setStatusUrl(null)
        setCountdown(5)
      }
    } catch (error) {
      console.error('Failed to signup:', error)
      const errorMessage = error instanceof Error ? error.message : String(error) || 'An unknown error occurred'
      showToast(`${t('btn_error')}: ${errorMessage}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const goBack = () => {
    setCurrentStep(1)
    updateProgress(1)
    setDuplicateEmailError(false)
  }

  const updateModels = () => {
    // Reset model when make changes
    setCarModel('')
    setCarModelOther('')
  }

  const checkOtherModel = (value: string) => {
    // Reset other model input when switching away from Other
    if (value !== 'Other') {
      setCarModelOther('')
    }
  }

  const openProWizard = () => {
    proSuccessDialogRef.current?.close()
    setIsProSuccessOpen(false)
    setIsWizardOpen(true)
  }

  // Handle Pro Success modal
  useEffect(() => {
    const dialog = proSuccessDialogRef.current
    if (!dialog) return

    if (isProSuccessOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isProSuccessOpen])

  const carMakes = getCarMakes()
  const carModels = carMake ? getCarModels(carMake) : []
  const years = generateYears()

  // Prepare options for SearchableSelect components
  const yearOptions = years.map((year) => ({ value: String(year), label: String(year) }))
  const makeOptions = carMakes.map((make) => ({ value: make, label: make }))
  const modelOptions = carModels.map((model) => ({ value: model, label: model }))

  return (
    <div className="landing-page">
      <div className="container">
        <header>
          <a href="#" className="brandLanding">
            Pee<span>peep</span>
          </a>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-text"
              onClick={() => setIsProOpen(true)}
            >
              {t('nav_pro')}
            </button>
            {/* <button
              type="button"
              className="btn-text"
              onClick={() => setIsContactOpen(true)}
            >
              {t('nav_contact')}
            </button> */}

            <button className="lang-discreet" id="lang-btn" onClick={toggleLanguage}>
              <span id="lang-text">{t('btn_lang_switch')}</span>
            </button>
          </div>
        </header>

        <section className="hero">
          <h1>
            <span>{t('hero_title_1')}</span>
            <br />
            <span className="h1-highlight">{t('hero_title_2')}</span>
          </h1>

          <p className="subtitle">
            {t('hero_subtitle').split('. ').map((line, index, array) => (
              <span key={index}>
                {line}
                {index < array.length - 1 ? '. ' : ''}
                {index === 0 && <br />}
              </span>
            ))}
          </p>

          <div className="form-container">
            <div className="progress-steps">
              <div
                className={`step-dot ${currentStep >= 1 ? (currentStep > 1 ? 'completed' : 'active') : ''}`}
                id="dot-1"
              ></div>
              <div
                className={`step-dot ${currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'active') : ''}`}
                id="dot-2"
              ></div>
              <div
                className={`step-dot ${currentStep >= 3 ? 'active' : ''}`}
                id="dot-3"
              ></div>
            </div>

            {currentStep === 1 && (
              <div className="step active" id="step-1">
                <div className="card-form" style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                      {t('step1_header')}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        background: '#FEF2F2',
                        color: '#EF4444',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}
                    >
                      {t('badge_limited')}
                    </span>
                  </div>

                  <form onSubmit={handleVehicleCheck}>
                    <label className="form-label-left">{t('label_vehicle')}</label>
                    <div
                      style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}
                    >
                      <SearchableSelect
                        id="car-year"
                        value={carYear}
                        onChange={(value) => setCarYear(value)}
                        options={yearOptions}
                        placeholder="Year"
                        required
                        style={{ flex: 1 }}
                      />
                      <SearchableSelect
                        id="car-make"
                        value={carMake}
                        onChange={(value) => {
                          setCarMake(value)
                          updateModels()
                        }}
                        options={makeOptions}
                        placeholder="Make"
                        required
                        showOtherOption={true}
                        onOtherSelect={() => {
                          setCarMake('Other')
                          updateModels()
                        }}
                        style={{ flex: 2 }}
                      />
                    </div>

                    {!showModelOther ? (
                      <SearchableSelect
                        id="car-model"
                        value={carModel}
                        onChange={(value) => {
                          setCarModel(value)
                          checkOtherModel(value)
                        }}
                        options={modelOptions}
                        placeholder={
                          carMake
                            ? 'Model'
                            : 'Model'
                        }
                        disabled={!carMake || carMake === 'Other'}
                        required
                        showOtherOption={carModels.length > 0}
                        onOtherSelect={() => {
                          setCarModel('Other')
                          checkOtherModel('Other')
                        }}
                        style={{ marginBottom: '1.5rem' }}
                      />
                    ) : (
                      <input
                        type="text"
                        id="car-model-other"
                        className="vehicle-input fallback-input visible"
                        value={carModelOther}
                        onChange={(e) => setCarModelOther(e.target.value)}
                        placeholder="Enter Model Name manually"
                        style={{ marginBottom: '1.5rem' }}
                        required
                      />
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      id="check-btn"
                    >
                      {t('btn_check')}
                    </button>
                    <div
                      style={{
                        textAlign: 'center',
                        marginTop: '1rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {t('txt_rollout')}
                    </div>
                  </form>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="step active" id="step-2">
                <div className="card-form" style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      background: '#EFF6FF',
                      color: 'var(--primary)',
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      marginBottom: '1rem',
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                      check_circle
                    </span>
                    <span>
                      {language === 'en'
                        ? `Great news! We support ${carMake}.`
                        : `Bonne nouvelle ! Nous supportons ${carMake}.`}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {t('step2_title')}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1.5rem',
                    }}
                    dangerouslySetInnerHTML={{ __html: t('step2_desc') }}
                  />

                  <form onSubmit={handleEmailSubmit}>
                    <input
                      type="email"
                      id="email-input"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setDuplicateEmailError(false)
                      }}
                      className="vehicle-input"
                      placeholder={t('placeholder_email')}
                      style={{ marginBottom: '0.5rem' }}
                      required
                    />

                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginBottom: '1rem',
                      }}
                    >
                      <span
                        className="material-icons-round"
                        style={{ fontSize: '12px', color: '#10B981' }}
                      >
                        lock
                      </span>
                      <span>{t('privacy_text')}</span>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                      id="final-btn"
                      disabled={isProcessing}
                    >
                      {duplicateEmailError ? t('msg_duplicate') : isProcessing ? t('btn_processing') : t('btn_join')}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ width: '100%' }}
                      onClick={goBack}
                    >
                      {t('btn_back')}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="step active" id="step-3">
                <div className="success-message">
                  <span
                    className="material-icons-round"
                    style={{
                      fontSize: '3.5rem',
                      marginBottom: '0.5rem',
                      color: '#10B981',
                    }}
                  >
                    celebration
                  </span>
                  <div>
                    <strong
                      style={{
                        fontSize: '1.4rem',
                        display: 'block',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {t('success_title')}
                    </strong>
                    <p
                      style={{
                        fontSize: '0.95rem',
                        color: 'var(--text-main)',
                        lineHeight: 1.5,
                      }}
                    >
                      {savedVehicle ? (
                        <>
                          {t('success_msg')} <strong>{savedVehicle.year} {savedVehicle.model}</strong>.
                        </>
                      ) : (
                        t('success_msg_default')
                      )}
                    </p>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        opacity: 0.8,
                        marginTop: '0.5rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {t('success_sub')}
                    </p>
                    {statusUrl && countdown > 0 && (
                      <div
                        style={{
                          marginTop: '1rem',
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="preview-container">
            <div
              style={{
                textAlign: 'center',
                marginBottom: '1rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {t('sneak_peek')}
            </div>
            <div className="dashboard-mockup">
              <div className="mock-overlay">
                <div className="overlay-badge">{t('coming_soon')}</div>
              </div>
              <div className="mock-nav">
                <div className="mock-dot"></div>
                <div className="mock-dot"></div>
                <div className="mock-dot"></div>
              </div>
              <div className="mock-body" style={{ filter: 'blur(1px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div
                    style={{
                      width: '150px',
                      height: '20px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '4px',
                    }}
                  ></div>
                  <div
                    style={{
                      width: '100px',
                      height: '30px',
                      background: 'var(--primary)',
                      borderRadius: '6px',
                      opacity: 0.2,
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '100px',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    marginTop: '1rem',
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '60%',
                      height: '15px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '4px',
                      marginBottom: '10px',
                    }}
                  ></div>
                  <div
                    style={{
                      width: '40%',
                      height: '15px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '4px',
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '100px',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1rem',
                    opacity: 0.6,
                  }}
                >
                  <div
                    style={{
                      width: '60%',
                      height: '15px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '4px',
                      marginBottom: '10px',
                    }}
                  ></div>
                  <div
                    style={{
                      width: '40%',
                      height: '15px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '4px',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="features">
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t('features_title')}
          </h2>
          <div className="feature-grid">
            <div className="feature-item">
              <span className="material-icons-round f-icon">rocket_launch</span>
              <h3>{t('feat1_title')}</h3>
              <p>{t('feat1_desc')}</p>
            </div>
            <div className="feature-item">
              <span className="material-icons-round f-icon">monetization_on</span>
              <h3>{t('feat2_title')}</h3>
              <p>{t('feat2_desc')}</p>
            </div>
            <div className="feature-item">
              <span className="material-icons-round f-icon">build_circle</span>
              <h3>{t('feat3_title')}</h3>
              <p>{t('feat3_desc')}</p>
            </div>
          </div>
          <div
            style={{
              marginTop: '2.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            © 2025 Peepeep Inc.{' '}
            <span style={{ opacity: 0.6 }}>{t('footer_tag')}</span>
          </div>
        </div>
      </section>

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        language={language}
      />

      <ProModal
        isOpen={isProOpen}
        onClose={() => setIsProOpen(false)}
        language={language}
        onOpenWizard={() => {
          setIsProSuccessOpen(true)
        }}
        setStoredBizName={setStoredBizName}
        setStoredProviderEmail={setStoredProviderEmail}
      />


      <ProWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        language={language}
        businessName={storedBizName}
        email={storedProviderEmail}
      />

      {/* Pro Success Modal */}
      <dialog ref={proSuccessDialogRef} className="modal" id="modal-pro-success">
        <div
          className="modal-body"
          style={{
            padding: '2.5rem 2rem',
            backgroundColor: '#0F172A',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#F59E0B',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 1.5rem auto',
              fontSize: '2rem',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <span className="material-icons-round">rocket_launch</span>
          </div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {t('success_pro_title')}
          </h2>
          <p
            style={{
              color: '#94A3B8',
              fontSize: '0.95rem',
              lineHeight: 1.5,
            }}
          >
            {t('success_pro_desc')}
          </p>

          <div
            style={{
              background: '#1E293B',
              borderRadius: '12px',
              padding: '1.5rem',
              marginTop: '1.5rem',
              border: '1px solid #334155',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#F59E0B',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.5rem',
              }}
            >
              {t('nba_title')}
            </div>
            <p
              style={{
                color: '#E2E8F0',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                lineHeight: 1.5,
              }}
            >
              {t('nba_desc')}
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', color: '#0F172A', fontWeight: 800 }}
              onClick={openProWizard}
            >
              {t('nba_btn')}
            </button>
          </div>

          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: '1rem', color: '#94A3B8' }}
            onClick={() => {
              proSuccessDialogRef.current?.close()
              setIsProSuccessOpen(false)
            }}
          >
            {t('btn_close')}
          </button>
        </div>
      </dialog>
    </div>
  )
}

