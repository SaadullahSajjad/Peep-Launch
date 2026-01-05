import { useState, useEffect, FormEvent, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiService } from '../utils/api'
import html2canvas from 'html2canvas'
import {
  getStoredLanguage,
  setStoredLanguage,
  useTranslations,
  type Language,
} from '../utils/i18n'
import { useToast } from '../contexts/ToastContext'
import { initializeGoogleAuth, triggerGoogleSignIn, type GoogleUserInfo } from '../utils/googleOAuth'
import './ProfilePreview.css'

export default function ProfilePreview() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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
  const { showToast } = useToast()
  
  // Modal refs
  const loginDialogRef = useRef<HTMLDialogElement>(null)
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const shareDialogRef = useRef<HTMLDialogElement>(null)
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })
  const [isClaiming, setIsClaiming] = useState(false) // true if claiming new account, false if logging in
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
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

    // Only load profile data from backend if logged in
    if (token && providerEmail) {
      loadProviderProfile(providerEmail)
    } else {
      // When not logged in, show dummy data only
      // Reset to default dummy data
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
      setEditForm({
        name: "Joe's Garage",
        location: "Montreal, QC",
        rate: "$95/hr",
        turnaround: "24h",
        services: "Brakes, Diagnostics, Suspension, Oil Change",
      })
      setProviderId(null)
    }
  }, [searchParams])

  useEffect(() => {
    setStoredLanguage(language)
    document.documentElement.lang = language
  }, [language])

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'fr' : 'en'
    setLanguage(newLang)
  }

  // Initialize Google OAuth when login modal opens
  useEffect(() => {
    if (!isLoginModalOpen) return

    let cleanup: (() => void) | undefined

    try {
      cleanup = initializeGoogleAuth(
        async (userInfo: GoogleUserInfo, credential?: string) => {
          setIsGoogleLoading(false)
          await handleGoogleLogin(userInfo, credential)
        },
        (error) => {
          console.error('Google sign-in error:', error)
          setIsGoogleLoading(false)
          setLoginError('Google sign-in failed. Please try again or use email/password login.')
        }
      )
    } catch (error) {
      console.error('Failed to initialize Google OAuth:', error)
    }

    return () => {
      cleanup?.()
    }
  }, [isLoginModalOpen])

  // Handle login modal
  useEffect(() => {
    const dialog = loginDialogRef.current
    if (!dialog) return

    if (isLoginModalOpen) {
      // Pre-fill email if available
      if (profileData.email && !loginForm.email) {
        setLoginForm({ ...loginForm, email: profileData.email })
      }
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isLoginModalOpen, profileData.email])

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

  const handleGoogleLogin = async (userInfo: GoogleUserInfo, credential?: string) => {
    setIsLoading(true)
    setLoginError('')

    try {
      // If we have the credential, use Google OAuth login (password-less)
      if (credential) {
        try {
          const result = await apiService.loginProviderWithGoogle(credential)
          
          // Successfully logged in with Google OAuth
          localStorage.setItem('ppe_provider_auth_token', result.token)
          localStorage.setItem('ppe_provider_email', userInfo.email)
          localStorage.setItem('ppe_is_claimed', 'true')
          
          setIsLoggedIn(true)
          setIsLoginModalOpen(false)
          
          // Remove from=verify parameter from URL after successful login
          if (searchParams.get('from') === 'verify') {
            const newParams = new URLSearchParams(searchParams)
            newParams.delete('from')
            navigate(`/profile-preview?${newParams.toString()}`, { replace: true })
          }
          
          // Load profile data
          await loadProviderProfile(userInfo.email)
          
          // Clear login form
          setLoginForm({ email: '', password: '' })
          setIsClaiming(false)
          setIsLoading(false)
          return
        } catch (error: any) {
          // If Google OAuth login fails, fall through to check account status
          console.error('Google OAuth login failed:', error)
          if (error.message && error.message.includes('No account found')) {
            setLoginError('No account found with this Google email. Please sign up first.')
            setIsLoading(false)
            return
          }
          // Continue to check if password is needed
        }
      }

      // Fallback: Check if account exists and needs password
      const signup = await apiService.getProviderSignup(userInfo.email)
      
      if (!signup) {
        setLoginError('No account found with this Google email. Please sign up first.')
        setIsLoading(false)
        return
      }

      // Check if email is verified
      if (!signup.email_verified) {
        setLoginError('Please verify your email address before logging in.')
        setIsLoading(false)
        return
      }

      // If we get here, Google OAuth login didn't work, so check if password is needed
      setLoginForm({ ...loginForm, email: userInfo.email })
      setIsClaiming(true)
      setLoginError('Please set a password to complete your account setup. Your email has been pre-filled.')
      setIsLoading(false)
    } catch (error: any) {
      console.error('Google login error:', error)
      if (error.message && error.message.includes('not found')) {
        setLoginError('No account found with this Google email. Please sign up first.')
      } else {
        setLoginError('Failed to login with Google. Please try using email/password login.')
      }
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    try {
      setIsGoogleLoading(true)
      setLoginError('')
      triggerGoogleSignIn()
    } catch (error) {
      console.error('Failed to trigger Google sign-in:', error)
      setIsGoogleLoading(false)
      setLoginError('Google OAuth is not configured. Please use email/password login.')
    }
  }

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    
    if (!loginForm.email || !loginForm.password) {
      setLoginError(isClaiming ? 'Please enter a password to claim your account' : 'Please enter both email and password')
      return
    }

    setIsLoading(true)
    setLoginError('')

    try {
      if (isClaiming) {
        // Claim account - create password
        await apiService.updateProviderSignup({
          email: loginForm.email,
          password: loginForm.password,
        })
        // Mark account as claimed in localStorage (same key as reference HTML)
        localStorage.setItem('ppe_is_claimed', 'true')
        // After claiming, log in
        const result = await apiService.loginProvider(loginForm.email, loginForm.password)
        localStorage.setItem('ppe_provider_auth_token', result.token)
        localStorage.setItem('ppe_provider_email', loginForm.email)
      } else {
        // Regular login
        const result = await apiService.loginProvider(loginForm.email, loginForm.password)
        // Mark account as claimed (in case it wasn't set before)
        localStorage.setItem('ppe_is_claimed', 'true')
        localStorage.setItem('ppe_provider_auth_token', result.token)
        localStorage.setItem('ppe_provider_email', loginForm.email)
      }
      
      setIsLoggedIn(true)
      setIsLoginModalOpen(false)
      
      // Remove from=verify parameter from URL after successful login/claim
      if (searchParams.get('from') === 'verify') {
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('from')
        navigate(`/profile-preview?${newParams.toString()}`, { replace: true })
      }
      
      // Load profile data
      await loadProviderProfile(loginForm.email)
      
      // Clear login form
      setLoginForm({ email: '', password: '' })
      setIsClaiming(false)
    } catch (error: any) {
      // Handle different error scenarios
      if (error.message && error.message.includes('Account not set up properly')) {
        // Account exists but no password - switch to claim mode
        setIsClaiming(true)
        // Remove claimed flag if it exists
        localStorage.removeItem('ppe_is_claimed')
        setLoginError('Please create a password to claim your account.')
      } else if (error.message && error.message.includes('Invalid email or password')) {
        // Password exists but wrong - if we were in claim mode, switch to login mode
        if (isClaiming) {
          setIsClaiming(false)
          // Mark account as claimed (password exists)
          localStorage.setItem('ppe_is_claimed', 'true')
          setLoginError('This account already has a password. Please use your existing password to login.')
        } else {
          setLoginError('Invalid email or password. Please check your credentials.')
        }
      } else {
        setLoginError(error.message || (isClaiming ? 'Failed to claim account. Please try again.' : 'Login failed. Please check your credentials.'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('ppe_provider_auth_token')
    localStorage.removeItem('ppe_provider_email')
    // Keep ppe_is_claimed so it shows "Welcome Back" next time
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
    
    // Remove from=verify parameter from URL on logout
    if (searchParams.get('from') === 'verify') {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('from')
      navigate(`/profile-preview?${newParams.toString()}`, { replace: true })
    }
  }

  const handleEdit = async () => {
    // Close sidebar on mobile when opening modal
    setIsSidebarOpen(false)
    
    if (!isLoggedIn) {
      // Pre-fill email if available
      if (profileData.email) {
        setLoginForm({ ...loginForm, email: profileData.email })
      } else {
        // If no email in profile data, try to get from URL or prompt
        const emailFromUrl = searchParams.get('email')
        if (emailFromUrl) {
          setLoginForm({ ...loginForm, email: emailFromUrl })
          // Try to load profile to get email
          try {
            await loadProviderProfile(emailFromUrl)
          } catch (e) {
            console.error('Failed to load profile:', e)
          }
        }
      }
      
      // Check if came from email verification (from=verify param)
      const fromVerify = searchParams.get('from') === 'verify'
      
      if (fromVerify) {
        // Came from email verification → show claim mode
        setIsClaiming(true)
      } else {
        // Direct access or other links → show login mode
        setIsClaiming(false)
      }
      
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
      showToast(error.message || 'Failed to upload banner image', 'error')
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
      showToast(error.message || 'Failed to upload logo image', 'error')
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
      showToast('Please log in to save your profile', 'error')
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
      showToast('Profile updated successfully!', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile. Please try again.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenShareModal = () => {
    // Close sidebar on mobile when opening modal
    setIsSidebarOpen(false)
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
      showToast('Failed to download badge. Please try again.', 'error')
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
              showToast('Badge image copied to clipboard! You can now paste it in Instagram.', 'success')
            } else {
              // Fallback: download the image
              const link = document.createElement('a')
              link.download = 'Peepeep-Badge.png'
              link.href = dataUrl
              link.click()
              showToast('Badge downloaded! You can now upload it to Instagram.', 'success')
            }
          }
        } catch (error) {
          console.error('Failed to copy image:', error)
          showToast('Please download the badge first, then upload it to Instagram.', 'error')
        }
        break
        
      case 'Copy Link':
        // Copy profile URL to clipboard
        try {
          await navigator.clipboard.writeText(profileUrl)
          showToast(t('link_copied'), 'success')
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
            showToast('Profile link copied to clipboard!', 'success')
          } catch (err) {
            showToast('Failed to copy link. Please copy manually: ' + profileUrl, 'error')
          }
          document.body.removeChild(textArea)
        }
        break
        
      default:
        showToast(`Sharing to ${platform}...`, 'info')
    }
  }

  const servicesList = profileData.services.split(',').map(s => s.trim()).filter(Boolean)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="profile-preview-page">
      <button className="mobile-toggle" onClick={toggleSidebar}>
        <span className="material-icons-round">menu</span>
      </button>
      <div className={`overlay ${isSidebarOpen ? 'active' : ''}`} onClick={toggleSidebar}></div>
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
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
            {isLoggedIn ? (
              <>
                <div className="status-indicator live">
                  <div className="pulse-dot"></div>
                  <span>Live & Public</span>
                </div>
                <p style={{ color: 'var(--sidebar-text)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Your shop is visible in the marketplace. Changes update in real-time.
                </p>
              </>
            ) : (
              <>
                <div className="status-indicator draft">
                  <div className="pulse-dot"></div>
                  <span>Unpublished Draft</span>
                </div>
                <p style={{ color: 'var(--sidebar-text)', fontSize: '0.85rem', lineHeight: 1.4 ,marginBottom:0}}>
                  This profile is only visible to you. Claim it to go live in the marketplace.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">Manage Storefront</div>
          <button className="btn btn-sidebar" onClick={handleEdit}>
            <span className="material-icons-round">edit</span>
            <span>Edit Profile</span>
          </button>
          <button className="btn btn-sidebar-outline" style={{ marginTop: '0.75rem' }} onClick={handleOpenShareModal}>
            <span className="material-icons-round">share</span>
            <span>Share Verified Badge</span>
          </button>
        </div>

        <div className="sidebar-footer">
          {isLoggedIn ? (
            <div className="user-profile-card">
              <div className="avatar-base user-avatar">
                {profileData.avatarImage ? (
                  <img src={profileData.avatarImage} alt={profileData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profileData.initials
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{profileData.name}</div>
                <div style={{ marginTop: '2px' }}>
                  <span className="badge founding">Founding Partner</span>
                </div>
              </div>
              <button className="btn-logout-icon" onClick={handleLogout} title="Sign Out">
                <span className="material-icons-round">logout</span>
              </button>
            </div>
          ) : (
            (() => {
              const fromVerify = searchParams.get('from') === 'verify'
              return (
                <button 
                  className="guest-claim-btn"
                  onClick={async () => {
                    // Close sidebar on mobile
                    setIsSidebarOpen(false)
                    
                    // Get email from profile data or URL params
                    let emailToUse = profileData.email
                    if (!emailToUse) {
                      emailToUse = searchParams.get('email') || ''
                      if (emailToUse) {
                        // Try to load profile
                        try {
                          await loadProviderProfile(emailToUse)
                        } catch (e) {
                          console.error('Failed to load profile:', e)
                        }
                      }
                    }
                    
                    if (emailToUse) {
                      setLoginForm({ ...loginForm, email: emailToUse })
                    }
                    
                    // Check if came from email verification (from=verify param)
                    if (fromVerify) {
                      // Came from email verification → show claim mode
                      setIsClaiming(true)
                    } else {
                      // Direct access or other links → show login mode
                      setIsClaiming(false)
                    }
                    
                    setIsLoginModalOpen(true)
                  }}
                >
                  {fromVerify ? (
                    <>
                      <span className="material-icons-round" style={{ fontSize: '24px' }}>rocket_launch</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Claim Account</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Go Live for Free</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="material-icons-round" style={{ fontSize: '24px' }}>login</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Login</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Access Your Profile</div>
                      </div>
                    </>
                  )}
                </button>
              )
            })()
          )}
        </div>
      </aside>

      <main className="main">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Build Your Digital Storefront
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            {t('page_subtitle')}
          </p>
        </div>

        <div className={`profile-canvas ${isLoggedIn ? 'is-founding' : ''}`}>
          <div className="provider-hero" style={{ backgroundImage: profileData.bannerImage ? `url(${profileData.bannerImage})` : undefined }}>
            <div className="provider-avatar-large">
              {profileData.avatarImage ? (
                <img src={profileData.avatarImage} alt={profileData.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <div>{profileData.initials}</div>
              )}
              <div className="verified-tick">
                <span className="material-icons-round" style={{ fontSize: '14px' }}>check</span>
              </div>
            </div>
          </div>
          
          <div className="profile-body">
            <h2 className="shop-title">{profileData.name}</h2>
            
            <div className="shop-meta">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icons-round" style={{ color: '#F59E0B', fontSize: '16px' }}>star</span> 5.0
              </span>
              <span>{profileData.location}</span>
              {isLoggedIn && (
                <span className="badge founding">
                  <span className="material-icons-round" style={{ fontSize: '10px' }}>verified</span> Founding Partner
                </span>
              )}
            </div>
            
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '0.25rem' }}>
              {profileData.rate}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2rem' }}>
              Base Labor Rate
            </div>

            <div className="provider-stats-grid">
              <div className="p-stat-box">
                <div className="p-stat-val" style={{ color: '#F59E0B' }}>5.0</div>
                <div className="p-stat-lbl">Rating</div>
              </div>
              <div className="p-stat-box">
                <div className="p-stat-val">142</div>
                <div className="p-stat-lbl">Jobs Done</div>
              </div>
            </div>

            <div className="services-list">
              {servicesList.map((service, idx) => (
                <span key={idx} className="service-pill">{service}</span>
              ))}
            </div>

            <div className="verified-status-box">
              <span className="material-icons-round">verified_user</span>
              <div>
                <strong>PeePeep Verified</strong>
                <p>This provider has passed identity, insurance, and certification checks.</p>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => showToast("This is a preview of the booking flow. Sign up to start receiving real customer requests!", 'info')}>
              Request Appointment (Preview)
            </button>
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <dialog ref={loginDialogRef} className="modal" onClose={() => {
        setIsLoginModalOpen(false)
        setLoginError('')
        setIsClaiming(false)
      }}>
          <div className="modal-header">
            <h3 className="modal-title">{isClaiming ? 'Save Your Shop Profile' : 'Welcome Back'}</h3>
            <span className="material-icons-round" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => {
              setIsLoginModalOpen(false)
              setLoginError('')
              setIsClaiming(false)
            }}>close</span>
          </div>
          <form onSubmit={handleLogin}>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                {isClaiming 
                  ? <>You've customized your storefront. <strong>Create a free account</strong> to save these changes and go live in the marketplace.</>
                  : 'Enter your password to access your shop dashboard.'}
              </p>
              
              <div className="social-grid">
                <button
                  type="button"
                  className="btn-social"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  style={{
                    opacity: (isGoogleLoading || isLoading) ? 0.6 : 1,
                    cursor: (isGoogleLoading || isLoading) ? 'wait' : 'pointer',
                    width: '100%'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {isGoogleLoading ? 'Loading...' : 'Google'}
                </button>
              </div>
              
              <div className="auth-divider">Or use email</div>
              
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
                value={loginForm.email || profileData.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="partner@shop.com"
                required
                disabled={isLoading}
              />
              
              <label className="form-label">{isClaiming ? 'Create Password' : 'Password'}</label>
              <input
                type="password"
                className="form-control"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                id="auth-password"
                required
                disabled={isLoading}
                minLength={isClaiming ? 8 : undefined}
              />
              
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                id="login-btn"
                disabled={isLoading}
              >
                {isLoading ? (isClaiming ? 'Creating Account...' : 'Logging in...') : (isClaiming ? 'Save & Publish' : 'Login')}
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

