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
    return this.request(`/provider-signups/${email}`)
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
}

export const apiService = new ApiService()

