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
  const proSuccessDialogRef = useRef<HTMLDialogElement>(null)

  // Loading states
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    setStoredLanguage(language)
    document.documentElement.lang = language
  }, [language])

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

  useEffect(() => {
    const dialog = proSuccessDialogRef.current
    if (!dialog) return

    if (isProSuccessOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isProSuccessOpen])

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'fr' : 'en'
    setLanguage(newLang)
  }

  const updateProgress = (step: number) => {
    setCurrentStep(step)
  }

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (localStorage.getItem('ppe_joined_email') === email) {
      alert(t('msg_duplicate'))
      return
    }

    setIsProcessing(true)
    setTimeout(() => {
      setCurrentStep(2)
      updateProgress(2)
      setIsProcessing(false)
    }, 600)
  }

  const handleVehicleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    let finalModel = carModel
    if (showModelOther && carModelOther.trim() !== '') {
      finalModel = carModelOther.trim()
    }

    if (!carYear || !carMake || !finalModel) {
      alert(
        language === 'en'
          ? 'Please select all vehicle details.'
          : 'Veuillez sélectionner tous les détails du véhicule.'
      )
      return
    }

    setIsProcessing(true)

    try {
      const fullCarName = `${carMake} ${finalModel}`
      const result = await apiService.signupWaitlist({
        email,
        name,
        vehicle_year: parseInt(carYear),
        vehicle_model: fullCarName,
        referral_code: referralCodeFromUrl || undefined,
        language,
      })

      localStorage.setItem('ppe_joined_email', email)
      setSavedVehicle({ year: carYear, model: fullCarName })

      if (result.status_url) {
        navigate(result.status_url.replace('/status.html', '/status'))
      } else {
        setCurrentStep(3)
        updateProgress(3)
      }
    } catch (error) {
      console.error('Failed to signup:', error)
      alert(t('btn_error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const skipStep = () => {
    setSavedVehicle(null)
    setCurrentStep(3)
    updateProgress(3)
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
    setIsProSuccessOpen(false)
    setIsWizardOpen(true)
  }

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
            <button
              type="button"
              className="btn-text"
              onClick={() => setIsContactOpen(true)}
            >
              {t('nav_contact')}
            </button>

            <button className="lang-toggle" id="lang-btn" onClick={toggleLanguage}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>
                language
              </span>
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

          <p className="subtitle">{t('hero_subtitle')}</p>

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
                <form onSubmit={handleEmailSubmit}>
                  <div className="input-group">
                    <input
                      type="email"
                      id="email-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('placeholder_email')}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      id="email-btn"
                      disabled={isProcessing}
                    >
                      {isProcessing ? t('btn_processing') : t('btn_access')}
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: '1rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      className="material-icons-round"
                      style={{
                        fontSize: '12px',
                        verticalAlign: 'middle',
                        color: '#10B981',
                      }}
                    >
                      lock
                    </span>{' '}
                    <span>{t('privacy_text')}</span>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 2 && (
              <div className="step active" id="step-2">
                <div className="card-form">
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      color: 'var(--text-main)',
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
                  >
                    {t('step2_desc')}
                  </p>

                  <form onSubmit={handleVehicleSubmit}>
                    <label className="form-label-left">{t('label_name')}</label>
                    <input
                      type="text"
                      id="user-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="vehicle-input"
                      placeholder={t('placeholder_name')}
                      style={{ marginBottom: '1rem' }}
                      required
                    />

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
                            : 'Model (Select Make First)'
                        }
                        disabled={!carMake || carMake === 'Other'}
                        required
                        showOtherOption={carModels.length > 0}
                        onOtherSelect={() => {
                          setCarModel('Other')
                          checkOtherModel('Other')
                        }}
                        style={{ marginBottom: '0.5rem'}}
                      />
                    ) : (
                      <input
                        type="text"
                        id="car-model-other"
                        className="vehicle-input fallback-input visible"
                        value={carModelOther}
                        onChange={(e) => setCarModelOther(e.target.value)}
                        placeholder="Enter Model Name manually"
                        style={{ marginBottom: '0.5rem' }}
                        required
                      />
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '1rem' }}
                      id="vehicle-btn"
                      disabled={isProcessing}
                    >
                      {isProcessing ? t('btn_sending') : t('btn_complete')}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={skipStep}
                    >
                      {t('btn_skip')}
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
                    check_circle
                  </span>
                  <div>
                    <strong
                      style={{
                        fontSize: '1.4rem',
                        display: 'block',
                        marginBottom: '0.5rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      {t('success_title')}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.95rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                      }}
                      id="final-msg"
                    >
                      {savedVehicle
                        ? `${t('msg_custom_success')} ${savedVehicle.year} ${savedVehicle.model}.`
                        : t('success_msg_default')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="preview-container">
            <div className="dashboard-mockup">
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '200px',
                  borderRight: '1px solid var(--border)',
                  padding: '1.5rem',
                  background: 'var(--bg-subtle)',
                }}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    background: 'var(--primary)',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                  }}
                ></div>
                <div
                  style={{
                    height: '10px',
                    width: '80%',
                    background: '#E5E7EB',
                    marginBottom: '1rem',
                    borderRadius: '4px',
                  }}
                ></div>
                <div
                  style={{
                    height: '10px',
                    width: '60%',
                    background: '#E5E7EB',
                    marginBottom: '1rem',
                    borderRadius: '4px',
                  }}
                ></div>
                <div
                  style={{
                    height: '10px',
                    width: '70%',
                    background: '#E5E7EB',
                    marginBottom: '1rem',
                    borderRadius: '4px',
                  }}
                ></div>
              </div>
              <div style={{ marginLeft: '200px' }}>
                <div className="mock-header">
                  <div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        marginBottom: '5px',
                      }}
                    >
                      {t('mock_dash')}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span>{t('mock_welcome')}</span>, Patrick
                    </div>
                  </div>
                  <div
                    className="btn btn-primary"
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                    }}
                  >
                    {t('mock_new_req')}
                  </div>
                </div>
                <div className="mock-grid">
                  <div className="mock-card active">
                    <div
                      className="flex justify-between"
                      style={{ alignItems: 'center', marginBottom: '10px' }}
                    >
                      <div className="mock-icon">
                        <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>
                          disc_full
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#EF4444',
                          background: '#FEF2F2',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        URGENT
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {t('mock_brake')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t('mock_quotes')}
                      </div>
                    </div>
                  </div>
                  <div
                    className="mock-card active"
                    style={{ borderColor: 'var(--border)', boxShadow: 'none' }}
                  >
                    <div
                      className="flex justify-between"
                      style={{ alignItems: 'center', marginBottom: '10px' }}
                    >
                      <div
                        className="mock-icon"
                        style={{
                          color: 'var(--text-main)',
                          background: 'var(--bg-body)',
                        }}
                      >
                        <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>
                          oil_barrel
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          background: '#EFF6FF',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        {t('mock_due')}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {t('mock_oil')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t('mock_rec')}
                      </div>
                    </div>
                  </div>
                  <div className="mock-card"></div>
                </div>
                <div
                  style={{
                    marginTop: '1.5rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: '12px',
                    height: '150px',
                    border: '1px solid var(--border)',
                  }}
                ></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="features">
        <div className="container">
          <div className="feature-grid">
            <div className="feature-item">
              <div className="f-icon">
                <span className="material-icons-round">request_quote</span>
              </div>
              <h3>{t('feat1_title')}</h3>
              <p>{t('feat1_desc')}</p>
            </div>
            <div className="feature-item">
              <div className="f-icon">
                <span className="material-icons-round">chat</span>
              </div>
              <h3>{t('feat2_title')}</h3>
              <p>{t('feat2_desc')}</p>
            </div>
            <div className="feature-item">
              <div className="f-icon">
                <span className="material-icons-round">history</span>
              </div>
              <h3>{t('feat3_title')}</h3>
              <p>{t('feat3_desc')}</p>
            </div>
          </div>
          <div className="footer-copyright">{t('copyright')}</div>
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

      <dialog
        ref={proSuccessDialogRef}
        className="modal"
        id="modal-pro-success"
        style={{
          backgroundColor: 'var(--pro-bg)',
          color: 'var(--pro-text)',
          border: '1px solid #334155',
          textAlign: 'center',
          maxWidth: '450px',
          width: '95%',
          margin: 'auto',
        }}
      >
          <div
            className="modal-body"
            style={{ padding: '2.5rem 2rem', backgroundColor: '#0F172A', color: 'white' }}
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

      <ProWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        language={language}
        businessName={storedBizName}
        email={storedProviderEmail}
      />
    </div>
  )
}

