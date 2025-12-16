import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiService } from '../utils/api'
import {
  getStoredLanguage,
  useTranslations,
  type Language,
} from '../utils/i18n'
import './StatusPage.css'

export default function StatusPage() {
  const [searchParams] = useSearchParams()
  const [language] = useState<Language>(getStoredLanguage())
  const t = useTranslations(language)

  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [referralCode, setReferralCode] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [vehicle, setVehicle] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const code = searchParams.get('code')
    const nameParam = searchParams.get('name')
    const carParam = searchParams.get('car')

    if (nameParam) setName(decodeURIComponent(nameParam))
    if (carParam) setVehicle(decodeURIComponent(carParam))

    if (code) {
      setReferralCode(code)
      fetchStatus(code)
    } else {
      setIsLoading(false)
    }
  }, [searchParams])

  const fetchStatus = async (code: string) => {
    try {
      const status = await apiService.getWaitlistStatus(code)
      setQueuePosition(status.queue_position)
      // Always use the referral_code from the API response (it's the source of truth)
      if (status.referral_code) {
        setReferralCode(status.referral_code)
      }
      if (status.name) setName(status.name)
      if (status.vehicle_model) setVehicle(status.vehicle_model)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyLink = () => {
    const refLink = document.getElementById('ref-link') as HTMLInputElement
    if (refLink) {
      refLink.select()
      refLink.setSelectionRange(0, 99999)
      navigator.clipboard.writeText(refLink.value)

      const btn = document.querySelector('.btn-copy') as HTMLButtonElement
      if (btn) {
        btn.innerText = t('btn_copied')
        btn.style.background = '#10B981'

        setTimeout(() => {
          btn.innerText = t('btn_copy')
          btn.style.background = 'var(--text-main)'
        }, 2000)
      }
    }
  }

  const shareTo = (platform: string) => {
    const refLink = document.getElementById('ref-link') as HTMLInputElement
    if (!refLink) return

    const url = encodeURIComponent(refLink.value)
    const text = encodeURIComponent(t('share_text'))

    let shareUrl = ''
    if (platform === 'whatsapp') {
      shareUrl = `https://wa.me/?text=${text}%20${url}`
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
    } else if (platform === 'email') {
      shareUrl = `mailto:?subject=Check out Peepeep&body=${text}%20${url}`
    }

    if (shareUrl) window.open(shareUrl, '_blank')
  }

  const refUrl = referralCode
    ? `${window.location.origin}/?ref=${referralCode}`
    : 'https://peepeep.com/?ref=pat82'

  const greeting = name
    ? t('greeting_custom').replace('{name}', name)
    : t('greeting_default')

  const vehicleDisplay = vehicle || t('vehicle_default')

  return (
    <div className="status-page">
      <div className="status-card">
        <div className="card-header">
          <div className="brand">
            Pee<span>peep</span>
          </div>
          <br />
          <div className="header-sub">
            <span
              className="material-icons-round"
              style={{ fontSize: '12px', verticalAlign: 'middle' }}
            >
              check_circle
            </span>
            <span>{t('header_sub')}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="content" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            <div className="queue-container">
              <div className="queue-label">{t('label_position')}</div>
              <div className="queue-num">
                #{queuePosition?.toLocaleString() || '4,821'}
              </div>
            </div>

            <div className="content">
              <h2 id="status-greeting">{greeting}</h2>
              <p>{t('desc_text')}</p>

              <div className="vehicle-tag">
                <span
                  className="material-icons-round"
                  style={{ fontSize: '1.1rem', color: 'var(--primary)' }}
                >
                  directions_car
                </span>
                <span id="vehicle-display">{vehicleDisplay}</span>
              </div>

              <div className="progress-container">
                <div className="progress-labels">
                  <span style={{ color: 'var(--success)' }}>{t('prog_joined')}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {t('prog_access')}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill"></div>
                </div>
              </div>

              <div className="referral-box">
                <div className="ref-title">
                  <span
                    className="material-icons-round"
                    style={{ fontSize: '16px', color: 'var(--primary)' }}
                  >
                    bolt
                  </span>
                  <span>{t('ref_title')}</span>
                </div>
                <div className="ref-sub">{t('ref_sub')}</div>

                <div className="link-copy">
                  <input
                    type="text"
                    value={refUrl}
                    className="link-input"
                    readOnly
                    id="ref-link"
                  />
                  <button className="btn-copy" onClick={copyLink}>
                    {t('btn_copy')}
                  </button>
                </div>

                <div className="social-share">
                  <a
                    href="#"
                    className="btn-social wa"
                    onClick={(e) => {
                      e.preventDefault()
                      shareTo('whatsapp')
                    }}
                  >
                    <svg
                      className="social-icon"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    WhatsApp
                  </a>
                  <a
                    href="#"
                    className="btn-social x"
                    onClick={(e) => {
                      e.preventDefault()
                      shareTo('twitter')
                    }}
                  >
                    <svg
                      className="social-icon"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    X
                  </a>
                  <a
                    href="#"
                    className="btn-social"
                    onClick={(e) => {
                      e.preventDefault()
                      shareTo('email')
                    }}
                  >
                    <span
                      className="material-icons-round"
                      style={{ fontSize: '1.1rem', marginRight: '4px' }}
                    >
                      email
                    </span>
                    Email
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

