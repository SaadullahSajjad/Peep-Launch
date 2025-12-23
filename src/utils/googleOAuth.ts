/**
 * Google OAuth utility using Google Identity Services
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token: string }) => void
            error_callback?: (error: any) => void
          }) => {
            requestAccessToken: () => void
          }
        }
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: {
              credential: string
            }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          prompt: () => void
          renderButton: (
            element: HTMLElement,
            config: {
              type: string
              theme: string
              size: string
              text: string
              shape: string
              logo_alignment: string
            }
          ) => void
        }
      }
    }
  }
}

export interface GoogleUserInfo {
  email: string
  name: string
  given_name?: string
  family_name?: string
  picture?: string
}

/**
 * Get Google OAuth Client ID from environment variable
 */
export function getGoogleClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error(
      'Google OAuth Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.'
    )
  }
  return clientId
}

/**
 * Initialize Google Identity Services
 */
export function initializeGoogleAuth(
  onSuccess: (userInfo: GoogleUserInfo, credential?: string) => void,
  onError?: (error: any) => void
): () => void {
  let isInitialized = false
  let timeoutId: number | undefined
  
  // Wait for Google script to load (with timeout)
  const checkGoogle = setInterval(() => {
    if (window.google?.accounts?.id && !isInitialized) {
      clearInterval(checkGoogle)
      if (timeoutId) clearTimeout(timeoutId)
      isInitialized = true
      
      try {
        const clientId = getGoogleClientId()
        
        // Validate client ID format
        if (!clientId.includes('.apps.googleusercontent.com')) {
          throw new Error('Invalid Google Client ID format. It should end with .apps.googleusercontent.com')
        }
        
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            try {
              // Decode the JWT token to get user info
              const userInfo = await decodeGoogleToken(response.credential)
              // Pass both userInfo and the raw credential for backend verification
              onSuccess(userInfo, response.credential)
            } catch (error) {
              console.error('Failed to decode Google token:', error)
              onError?.(error)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })
      } catch (error) {
        console.error('Failed to initialize Google OAuth:', error)
        onError?.(error)
      }
    }
  }, 100)

  // Timeout after 10 seconds
  timeoutId = window.setTimeout(() => {
    clearInterval(checkGoogle)
    if (!isInitialized) {
      console.warn('Google Identity Services script did not load in time')
      onError?.(new Error('Google OAuth script failed to load. Make sure the script is loaded and your Client ID is correct.'))
    }
  }, 10000)

  // Return cleanup function
  return () => {
    clearInterval(checkGoogle)
    if (timeoutId) clearTimeout(timeoutId)
  }
}

/**
 * Decode Google JWT token and extract user information
 */
async function decodeGoogleToken(credential: string): Promise<GoogleUserInfo> {
  // Decode JWT token (base64url decode)
  const parts = credential.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  // Decode payload (second part)
  const payload = JSON.parse(
    atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
  )

  return {
    email: payload.email,
    name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
    given_name: payload.given_name,
    family_name: payload.family_name,
    picture: payload.picture,
  }
}

/**
 * Get the raw Google credential (JWT token) from the callback response
 * This is used for backend verification
 */
export function getGoogleCredential(response: { credential: string }): string {
  return response.credential
}

/**
 * Trigger Google Sign-In using a popup window
 * This creates a hidden button and triggers it, which is more reliable
 */
export function triggerGoogleSignIn(): void {
  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services not loaded. Please wait a moment and try again.')
  }

  try {
    // Create a temporary container for the button
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.opacity = '0'
    container.style.pointerEvents = 'none'
    document.body.appendChild(container)
    
    // Render Google sign-in button
    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
    })
    
    // Find and click the button
    const button = container.querySelector('div[role="button"]') as HTMLElement
    if (button) {
      button.click()
    } else {
      // Fallback: use prompt method (no callback parameter)
      try {
        window.google.accounts.id.prompt()
      } catch (promptError) {
        console.warn('Google sign-in prompt failed:', promptError)
        // Clean up
        if (container.parentNode) {
          document.body.removeChild(container)
        }
        throw new Error('Failed to trigger Google sign-in. Please verify your Client ID and authorized origins in Google Cloud Console.')
      }
    }
    
    // Clean up after a delay
    setTimeout(() => {
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    }, 1000)
  } catch (error) {
    console.error('Failed to trigger Google sign-in:', error)
    throw error
  }
}

