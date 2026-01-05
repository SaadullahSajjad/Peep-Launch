import { createContext, useContext, useState, ReactNode } from 'react'
import Toast, { ToastType } from '../components/Toast'

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{
    message: string
    type: ToastType
    isVisible: boolean
  }>({
    message: '',
    type: 'success',
    isVisible: false,
  })

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({
      message,
      type,
      isVisible: true,
    })
  }

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  )
}

