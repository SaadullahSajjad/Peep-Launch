const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface WaitlistSignupData {
  email: string
  name?: string
  vehicle_year?: number
  vehicle_model?: string
  referral_code?: string
  language?: 'en' | 'fr'
}

export interface ContactFormData {
  subject: string
  email: string
  message: string
}

export interface ProviderSignupData {
  email: string
  business_name: string
  full_name: string
  password?: string // Optional - can be set later in ProfilePreview
  language?: 'en' | 'fr'
}

export interface ProviderWizardData {
  email: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  business_type?: 'shop' | 'mobile' | 'garage' | 'dealership' | 'specialty'
  hourly_rate?: number
  business_license_url?: string
  business_license_file_name?: string
  services?: string
  turnaround?: string
  banner_url?: string
  logo_url?: string
  password?: string
}

export interface ProviderSignup {
  id: string
  email: string
  business_name: string
  full_name?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  business_type?: string
  hourly_rate?: number
  business_license_url?: string
  business_license_file_name?: string
  services?: string
  turnaround?: string
  banner_url?: string
  logo_url?: string
  status: string
  language?: string
  email_verified?: boolean
  created_at: string
  updated_at: string
}

export interface WaitlistStatus {
  queue_position: number
  referral_code: string
  name?: string
  vehicle_model?: string
  total_signups: number
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'An error occurred' },
      }))
      throw new Error(error.error?.message || 'Request failed')
    }

    const data = await response.json()
    return data.data || data
  }

  async signupWaitlist(data: WaitlistSignupData) {
    return this.request<{
      queue_position: number
      referral_code: string
      status_url: string
      already_exists?: boolean
    }>('/waitlist/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getWaitlistStatus(referralCode: string) {
    return this.request<WaitlistStatus>(`/waitlist/status/${referralCode}`)
  }

  async submitContact(data: ContactFormData) {
    return this.request('/contact/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async trackReferralClick(data: { referral_code: string; email?: string }) {
    return this.request('/waitlist/referral/track', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Provider signup endpoints
  async createProviderSignup(data: ProviderSignupData) {
    return this.request('/provider-signups', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProviderSignup(data: ProviderWizardData) {
    return this.request('/provider-signups', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getProviderSignup(email: string) {
    return this.request<ProviderSignup>(`/provider-signups/${email}`)
  }

  async verifyProviderEmail(email: string, token: string) {
    return this.request<{
      verified: boolean
      message: string
      signup: any
    }>(`/provider-signups/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
  }

  async loginProvider(email: string, password: string) {
    return this.request<{
      provider: any
      token: string
    }>('/provider-signups/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async loginProviderWithGoogle(credential: string) {
    return this.request<{
      provider: any
      token: string
    }>('/provider-signups/login/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    })
  }

  async updateProviderProfile(email: string, profileData: {
    name?: string
    location?: string
    rate?: string
    turnaround?: string
    services?: string
  }) {
    return this.request('/provider-signups', {
      method: 'PUT',
      body: JSON.stringify({
        email,
        ...profileData,
      }),
    })
  }

  /**
   * Upload business license file
   * @param file - File object to upload
   * @returns Promise with file URL and metadata
   */
  async uploadBusinessLicense(file: File): Promise<{
    url: string
    fileName: string
    size: number
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/provider-signups/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'An error occurred' },
      }))
      throw new Error(error.error?.message || 'File upload failed')
    }

    const result = await response.json()
    return result.data
  }

  async uploadImage(file: File): Promise<{
    url: string
    fileName: string
    size: number
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/provider-signups/upload-image`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'An error occurred' },
      }))
      throw new Error(error.error?.message || 'Image upload failed')
    }

    const result = await response.json()
    return result.data
  }
}

export const apiService = new ApiService()

