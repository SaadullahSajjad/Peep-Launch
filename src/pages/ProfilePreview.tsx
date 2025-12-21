import { useState, useEffect, FormEvent, useRef } from 'react'
import { apiService } from '../utils/api'
import html2canvas from 'html2canvas'
import {
  getStoredLanguage,
  setStoredLanguage,
  useTranslations,
  type Language,
} from '../utils/i18n'
import './ProfilePreview.css'

export default function ProfilePreview() {
  const [language, setLanguage] = useState<Language>(getStoredLanguage())
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [providerId, setProviderId] = useState<string | null>(null)
  const badgePreviewRef = useRef<HTMLDivElement>(null)
  const t = useTranslations(language)
  
  // Modal refs
  const loginDialogRef = useRef<HTMLDialogElement>(null)
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const shareDialogRef = useRef<HTMLDialogElement>(null)
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: "Joe's Garage",
    location: "Montreal, QC",
    rate: "$95/hr",
    turnaround: "24h",
    services: "Brakes, Diagnostics, Suspension, Oil Change",
    initials: "JG",
    bannerImage: null as string | null,
    avatarImage: null as string | null,
    email: '',
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    rate: '',
    turnaround: '',
    services: '',
  })

  // File upload state
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    // Ensure all dialogs are closed on mount
    if (loginDialogRef.current) loginDialogRef.current.close()
    if (editDialogRef.current) editDialogRef.current.close()
    if (shareDialogRef.current) shareDialogRef.current.close()
    
    // Check if user is logged in
    const token = localStorage.getItem('ppe_provider_auth_token')
    const providerEmail = localStorage.getItem('ppe_provider_email')
    setIsLoggedIn(!!token)

    // Load profile data from backend if logged in
    if (token && providerEmail) {
      loadProviderProfile(providerEmail)
    } else {
      // Load from localStorage as fallback
      const savedData = localStorage.getItem('ppe_provider_data')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setProfileData(parsed)
          setEditForm({
            name: parsed.name || '',
            location: parsed.location || '',
            rate: parsed.rate || '',
            turnaround: parsed.turnaround || '',
            services: parsed.services || '',
          })
        } catch (e) {
          console.error('Failed to parse saved data:', e)
        }
      }
    }
  }, [])

  useEffect(() => {
    setStoredLanguage(language)
    document.documentElement.lang = language
  }, [language])

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'fr' : 'en'
    setLanguage(newLang)
  }

  // Handle login modal
  useEffect(() => {
    const dialog = loginDialogRef.current
    if (!dialog) return

    if (isLoginModalOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isLoginModalOpen])

  // Handle edit modal
  useEffect(() => {
    const dialog = editDialogRef.current
    if (!dialog) return

    if (isEditModalOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isEditModalOpen])

  // Handle share modal
  useEffect(() => {
    const dialog = shareDialogRef.current
    if (!dialog) return

    if (isShareModalOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isShareModalOpen])

  const loadProviderProfile = async (email: string) => {
    try {
      const signup = await apiService.getProviderSignup(email)
      if (signup) {
        // Extract and format provider ID
        if (signup.id) {
          const formattedId = `#PRO-${signup.id.substring(0, 4).toUpperCase()}`
          setProviderId(formattedId)
        }
        
        // Map backend data to profile format
        const name = signup.business_name || "Joe's Garage"
        const nameParts = name.split(' ')
        let initials = nameParts[0][0]
        if (nameParts.length > 1) {
          initials += nameParts[1][0]
        } else if (name.length > 1) {
          initials += name[1]
        }

        const location = signup.address ? `${signup.address}${signup.city ? ', ' + signup.city : ''}${signup.province ? ', ' + signup.province : ''}` : 'Montreal, QC'
        const rate = signup.hourly_rate ? `$${signup.hourly_rate}/hr` : '$95/hr'
        
        const profile = {
          name,
          location,
          rate,
          turnaround: signup.turnaround || '24h', // From backend or default
          services: signup.services || 'Brakes, Diagnostics, Suspension, Oil Change', // From backend or default
          initials: initials.toUpperCase(),
          bannerImage: signup.banner_url || null,
          avatarImage: signup.logo_url || null,
          email: signup.email,
        }

        setProfileData(profile)
        setEditForm({
          name: profile.name,
          location: profile.location,
          rate: profile.rate,
          turnaround: profile.turnaround,
          services: profile.services,
        })
      }
    } catch (error) {
      console.error('Failed to load provider profile:', error)
    }
  }

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Please enter both email and password')
      return
    }

    setIsLoading(true)
    setLoginError('')

    try {
      const result = await apiService.loginProvider(loginForm.email, loginForm.password)
      
      // Store token and email
      localStorage.setItem('ppe_provider_auth_token', result.token)
      localStorage.setItem('ppe_provider_email', loginForm.email)
      
      setIsLoggedIn(true)
      setIsLoginModalOpen(false)
      
      // Load profile data
      await loadProviderProfile(loginForm.email)
      
      // Clear login form
      setLoginForm({ email: '', password: '' })
    } catch (error: any) {
      setLoginError(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('ppe_provider_auth_token')
    localStorage.removeItem('ppe_provider_email')
    setIsLoggedIn(false)
    setProfileData({
      name: "Joe's Garage",
      location: "Montreal, QC",
      rate: "$95/hr",
      turnaround: "24h",
      services: "Brakes, Diagnostics, Suspension, Oil Change",
      initials: "JG",
      bannerImage: null,
      avatarImage: null,
      email: '',
    })
  }

  const handleEdit = () => {
    if (!isLoggedIn) {
      setIsLoginModalOpen(true)
      return
    }
    // Initialize previews with current images
    setBannerPreview(profileData.bannerImage)
    setLogoPreview(profileData.avatarImage)
    setIsEditModalOpen(true)
  }

  const handleBannerUpload = async (file: File) => {
    setIsUploadingBanner(true)
    try {
      const result = await apiService.uploadImage(file)
      setBannerPreview(result.url)
      
      // Update profile data immediately
      setProfileData({ ...profileData, bannerImage: result.url })
      
      // Save to backend
      if (profileData.email) {
        await apiService.updateProviderSignup({
          email: profileData.email,
          banner_url: result.url,
        })
      }
    } catch (error: any) {
      alert(error.message || 'Failed to upload banner image')
    } finally {
      setIsUploadingBanner(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true)
    try {
      const result = await apiService.uploadImage(file)
      setLogoPreview(result.url)
      
      // Update profile data immediately
      setProfileData({ ...profileData, avatarImage: result.url })
      
      // Save to backend
      if (profileData.email) {
        await apiService.updateProviderSignup({
          email: profileData.email,
          logo_url: result.url,
        })
      }
    } catch (error: any) {
      alert(error.message || 'Failed to upload logo image')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      // Upload immediately
      handleBannerUpload(file)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      // Upload immediately
      handleLogoUpload(file)
    }
  }

  const handleSaveProfile = async () => {
    if (!profileData.email) {
      alert('Please log in to save your profile')
      return
    }

    setIsLoading(true)

    try {
      // Parse rate to extract number (remove $ and /hr)
      const rateValue = editForm.rate.replace('$', '').replace('/hr', '').trim()
      
      // Parse location to extract address parts
      const locationParts = editForm.location.split(',').map(s => s.trim())
      const address = locationParts[0] || ''
      const city = locationParts[1] || ''
      const province = locationParts[2] || ''

      await apiService.updateProviderSignup({
        email: profileData.email,
        address: address || undefined,
        city: city || undefined,
        province: province || undefined,
        hourly_rate: rateValue ? parseFloat(rateValue) : undefined,
        banner_url: bannerPreview || profileData.bannerImage || undefined,
        logo_url: logoPreview || profileData.avatarImage || undefined,
        services: editForm.services || undefined,
        turnaround: editForm.turnaround || undefined,
      })

      // Generate initials from name
      const nameParts = editForm.name.trim().split(' ')
      let initials = nameParts[0][0]
      if (nameParts.length > 1) {
        initials += nameParts[1][0]
      } else if (editForm.name.length > 1) {
        initials += editForm.name[1]
      }

      const updatedData = {
        ...profileData,
        name: editForm.name,
        location: editForm.location,
        rate: editForm.rate,
        turnaround: editForm.turnaround,
        services: editForm.services,
        initials: initials.toUpperCase(),
        bannerImage: bannerPreview || profileData.bannerImage,
        avatarImage: logoPreview || profileData.avatarImage,
      }

      setProfileData(updatedData)
      localStorage.setItem('ppe_provider_data', JSON.stringify(updatedData))
      
      // Clear previews after save
      setBannerPreview(null)
      setLogoPreview(null)
      
      setIsEditModalOpen(false)
      alert('Profile updated successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenShareModal = () => {
    setIsShareModalOpen(true)
  }

  const handleDownloadBadge = async () => {
    if (!badgePreviewRef.current) return

    setIsDownloading(true)

    try {
      const canvas = await html2canvas(badgePreviewRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      })

      const link = document.createElement('a')
      link.download = 'Peepeep-Badge.png'
      link.href = canvas.toDataURL('image/png')
      link.click()

      // Show success state
      setDownloadSuccess(true)
    } catch (error) {
      console.error('Failed to download badge:', error)
      alert('Failed to download badge. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSocialShare = async (platform: string) => {
    const profileUrl = window.location.href
    
    switch (platform) {
      case 'LinkedIn':
        // LinkedIn sharing URL
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`
        window.open(linkedInUrl, '_blank', 'width=600,height=400')
        break
        
      case 'Facebook':
        // Facebook sharing URL
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`
        window.open(facebookUrl, '_blank', 'width=600,height=400')
        break
        
      case 'Instagram':
        // Instagram doesn't support direct web sharing, so we'll copy the image
        // and show instructions
        try {
          if (badgePreviewRef.current) {
            const canvas = await html2canvas(badgePreviewRef.current, {
              scale: 2,
              backgroundColor: null,
              useCORS: true,
            })
            const dataUrl = canvas.toDataURL('image/png')
            
            // Try to copy image to clipboard (modern browsers)
            if (navigator.clipboard && navigator.clipboard.write) {
              const blob = await (await fetch(dataUrl)).blob()
              const item = new ClipboardItem({ 'image/png': blob })
              await navigator.clipboard.write([item])
              alert('Badge image copied to clipboard! You can now paste it in Instagram.')
            } else {
              // Fallback: download the image
              const link = document.createElement('a')
              link.download = 'Peepeep-Badge.png'
              link.href = dataUrl
              link.click()
              alert('Badge downloaded! You can now upload it to Instagram.')
            }
          }
        } catch (error) {
          console.error('Failed to copy image:', error)
          alert('Please download the badge first, then upload it to Instagram.')
        }
        break
        
      case 'Copy Link':
        // Copy profile URL to clipboard
        try {
          await navigator.clipboard.writeText(profileUrl)
          alert(t('link_copied'))
        } catch (error) {
          // Fallback for older browsers
          const textArea = document.createElement('textarea')
          textArea.value = profileUrl
          textArea.style.position = 'fixed'
          textArea.style.opacity = '0'
          document.body.appendChild(textArea)
          textArea.select()
          try {
            document.execCommand('copy')
            alert('Profile link copied to clipboard!')
          } catch (err) {
            alert('Failed to copy link. Please copy manually: ' + profileUrl)
          }
          document.body.removeChild(textArea)
        }
        break
        
      default:
        alert(`Sharing to ${platform}...`)
    }
  }

  const servicesList = profileData.services.split(',').map(s => s.trim()).filter(Boolean)

  return (
    <div className="profile-preview-page">
      <aside className="sidebar">
        <div className="brand-container">
          <a href="/" className="brand">
            Pee<span className="color">peep</span>
            <span className="brand-badge">Pro</span>
          </a>
          <button className="lang-toggle" onClick={toggleLanguage}>
            {language === 'en' ? 'FR' : 'EN'}
          </button>
        </div>

        <div className="control-group">
          <div className="control-label">{t('profile_status_title')}</div>
          <div className="action-card">
            <div className="status-indicator">
              <div className="pulse-dot"></div>
              <span>{t('profile_status_live')}</span>
            </div>
            <p style={{ color: 'var(--sidebar-text)', fontSize: '0.85rem', lineHeight: 1.5,marginBottom: 0 }}>
              {t('profile_status_desc')}
            </p>
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">{t('quick_actions')}</div>
          <button className="btn btn-sidebar" onClick={handleOpenShareModal}>
            <span className="material-icons-round">share</span>
            <span>{t('btn_share_status')}</span>
          </button>
          <button className="btn btn-sidebar-outline" style={{ marginTop: '0.75rem' }} onClick={handleEdit}>
            <span className="material-icons-round">edit</span>
            <span>{t('btn_edit_profile')}</span>
          </button>
        </div>

        <div className="sidebar-footer">
          {isLoggedIn ? (
            <div className="user-profile-card">
              <div className="user-avatar">
                {profileData.avatarImage ? (
                  <img src={profileData.avatarImage} alt={profileData.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                ) : (
                  profileData.initials
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{profileData.name}</div>
                <div style={{ marginTop: '2px' }}>
                  <span className="badge founding">
                    <span className="material-icons-round" style={{ fontSize: '10px' }}>verified</span>
                    <span>Founding Partner</span>
                  </span>
                </div>
              </div>
              <button className="btn-logout-icon" onClick={handleLogout} title="Sign Out">
                <span className="material-icons-round">logout</span>
              </button>
            </div>
          ) : (
            <div className="user-profile-card guest" onClick={() => setIsLoginModalOpen(true)}>
              <div className="user-avatar guest">
                <span className="material-icons-round">person</span>
              </div>
            <div className="user-info">
              <div className="user-name">{t('guest_view')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--sidebar-text)' }}>{t('login_to_edit')}</div>
            </div>
              <button className="btn-logout-icon">
                <span className="material-icons-round">login</span>
              </button>
            </div>
          )}
          <div style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem' }}>
            {t('waitlist_id')}: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{providerId || '#PRO-8821'}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="header">
          <div>
            <h1 className="page-title">{t('page_title')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              {t('page_subtitle')}
            </p>
          </div>
        </div>

        <div className="phone-frame">
          <div className="p-header" style={{ backgroundImage: profileData.bannerImage ? `url(${profileData.bannerImage})` : undefined }}>
            <div className="p-badge">
              <span className="material-icons-round" style={{ fontSize: '12px', color: '#F59E0B' }}>verified</span>
              <span>{t('verified_partner')}</span>
            </div>
          </div>
          <div className="p-body">
            <div className="shop-avatar">
              {profileData.avatarImage ? (
                <img src={profileData.avatarImage} alt={profileData.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
              ) : (
                profileData.initials
              )}
            </div>
            <div className="p-info">
              <div className="p-name">{profileData.name}</div>
              <div className="p-meta">
                <span className="p-rating">
                  <span className="material-icons-round" style={{ fontSize: '14px' }}>star</span> 5.0
                </span>
                <span>•</span>
                <span>{profileData.location}</span>
                <span>•</span>
                <span style={{ color: '#10B981' }}>Less than 5km</span>
              </div>
            </div>
            <div className="p-stats">
              <div className="p-stat-card">
                <span className="stat-num">{profileData.rate}</span>
                <span className="stat-label">{t('label_labor_rate')}</span>
              </div>
              <div className="p-stat-card">
                <span className="stat-num">{profileData.turnaround}</span>
                <span className="stat-label">{t('label_avg_turnaround')}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--phone-text)', marginBottom: '8px' }}>
              {t('label_services')}
            </div>
            <div className="p-services">
              {servicesList.map((service, idx) => (
                <span key={idx} className="service-pill">{service}</span>
              ))}
            </div>
            <button className="p-btn">{t('btn_request_quote')}</button>
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <dialog ref={loginDialogRef} className="modal" onClose={() => setIsLoginModalOpen(false)}>
          <div className="modal-header">
            <h3 className="modal-title">{t('modal_login_title')}</h3>
            <span className="material-icons-round" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsLoginModalOpen(false)}>close</span>
          </div>
          <form onSubmit={handleLogin}>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {t('modal_login_desc')}
              </p>
              
              {loginError && (
                <div style={{ 
                  background: 'var(--danger-bg)', 
                  color: 'var(--danger-text)', 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  {loginError}
                </div>
              )}

              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="provider@peepeep.com"
                required
                disabled={isLoading}
              />
              
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
              
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="material-icons-round" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <span className="material-icons-round">lock_open</span> {t('btn_edit_profile')}
                  </>
                )}
              </button>
            </div>
          </form>
        </dialog>

      {/* Edit Modal */}
      <dialog ref={editDialogRef} className="modal" onClose={() => setIsEditModalOpen(false)}>
          <div className="modal-header">
            <h3 className="modal-title">Edit Public Profile</h3>
            <span className="material-icons-round" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsEditModalOpen(false)}>close</span>
          </div>
          <div className="modal-body">
            <div className="form-label">Branding Assets</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <label className={`upload-trigger ${bannerPreview || profileData.bannerImage ? 'has-file' : ''}`} style={{ backgroundImage: bannerPreview || profileData.bannerImage ? `url(${bannerPreview || profileData.bannerImage})` : undefined }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleBannerChange}
                  disabled={isUploadingBanner}
                />
                <span className="material-icons-round">image</span>
                <span>{isUploadingBanner ? t('generating') : bannerPreview || profileData.bannerImage ? t('btn_update_banner') + ' ✓' : t('btn_update_banner')}</span>
                {(bannerPreview || profileData.bannerImage) && (
                  <span className="material-icons-round upload-status-icon">check</span>
                )}
              </label>
              <label className={`upload-trigger ${logoPreview || profileData.avatarImage ? 'has-file' : ''}`} style={{ backgroundImage: logoPreview || profileData.avatarImage ? `url(${logoPreview || profileData.avatarImage})` : undefined }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoChange}
                  disabled={isUploadingLogo}
                />
                <span className="material-icons-round">account_circle</span>
                <span>{isUploadingLogo ? t('generating') : logoPreview || profileData.avatarImage ? t('btn_update_logo') + ' ✓' : t('btn_update_logo')}</span>
                {(logoPreview || profileData.avatarImage) && (
                  <span className="material-icons-round upload-status-icon">check</span>
                )}
              </label>
            </div>

            <label className="form-label">{t('label_shop_name')}</label>
            <input
              type="text"
              className="form-control"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <label className="form-label">{t('label_location')}</label>
            <input
              type="text"
              className="form-control"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">{t('label_labor_rate')}</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.rate}
                  onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">{t('label_avg_turnaround')}</label>
                <input
                  type="text"
                  className="form-control"
                  value={editForm.turnaround}
                  onChange={(e) => setEditForm({ ...editForm, turnaround: e.target.value })}
                />
              </div>
            </div>
            <label className="form-label">{t('label_services_input')}</label>
            <input
              type="text"
              className="form-control"
              value={editForm.services}
              onChange={(e) => setEditForm({ ...editForm, services: e.target.value })}
              disabled={isLoading}
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleSaveProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="material-icons-round" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                  Saving...
                </>
              ) : (
                t('btn_save_changes')
              )}
            </button>
          </div>
        </dialog>

      {/* Share Modal */}
      <dialog ref={shareDialogRef} className="modal" onClose={() => {
        setIsShareModalOpen(false)
        setDownloadSuccess(false)
      }}>
          <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <span className="material-icons-round" style={{ cursor: 'pointer', marginLeft: 'auto', color: 'var(--text-muted)' }} onClick={() => {
              setIsShareModalOpen(false)
              setDownloadSuccess(false)
            }}>close</span>
          </div>
          <div className="modal-body" style={{ textAlign: 'center' }}>
            {!downloadSuccess ? (
              <>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '1rem', color: 'var(--text-main)' }}>
                  Official Partner 2025
                </h2>
                <div className="badge-preview" ref={badgePreviewRef}>
                  <span className="material-icons-round" style={{ fontSize: '3rem', color: '#F59E0B', marginBottom: '0.5rem' }}>verified</span>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'white' }}>Peepeep Pro</div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>FOUNDING PARTNER</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '1rem', color: 'white' }}>{profileData.name}</div>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleDownloadBadge} 
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <span className="material-icons-round" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span className="material-icons-round">download</span> {t('btn_download_asset')}
                    </>
                  )}
                </button>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t('share_desc')}
                </div>
              </>
            ) : (
              <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'var(--success-bg)',
                  borderRadius: '50%',
                  color: 'var(--success-text)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 1rem auto',
                  border: '1px solid rgba(16,185,129,0.2)'
                }}>
                  <span className="material-icons-round" style={{ fontSize: '2rem' }}>check</span>
                </div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                  {t('share_success_title')}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  {t('share_success_desc')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    onClick={() => handleSocialShare('LinkedIn')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: '0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.background = 'var(--info-bg)'
                      e.currentTarget.style.color = 'var(--primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--bg-subtle)'
                      e.currentTarget.style.color = 'var(--text-main)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <span className="material-icons-round" style={{ color: '#0A66C2', fontSize: '1.5rem' }}>post_add</span>
                    LinkedIn
                  </button>
                  <button 
                    onClick={() => handleSocialShare('Facebook')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: '0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.background = 'var(--info-bg)'
                      e.currentTarget.style.color = 'var(--primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--bg-subtle)'
                      e.currentTarget.style.color = 'var(--text-main)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <span className="material-icons-round" style={{ color: '#1877F2', fontSize: '1.5rem' }}>facebook</span>
                    Facebook
                  </button>
                  <button 
                    onClick={() => handleSocialShare('Instagram')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: '0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.background = 'var(--info-bg)'
                      e.currentTarget.style.color = 'var(--primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--bg-subtle)'
                      e.currentTarget.style.color = 'var(--text-main)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <span className="material-icons-round" style={{ color: '#E1306C', fontSize: '1.5rem' }}>photo_camera</span>
                    Instagram
                  </button>
                  <button 
                    onClick={() => handleSocialShare('Copy Link')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: '0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.background = 'var(--info-bg)'
                      e.currentTarget.style.color = 'var(--primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--bg-subtle)'
                      e.currentTarget.style.color = 'var(--text-main)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <span className="material-icons-round" style={{ color: 'var(--text-main)', fontSize: '1.5rem' }}>link</span>
                    Link
                  </button>
                </div>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
                  onClick={() => {
                    setIsShareModalOpen(false)
                    setDownloadSuccess(false)
                  }}
                >
                  {t('btn_done')}
                </button>
              </div>
            )}
          </div>
        </dialog>
    </div>
  )
}

