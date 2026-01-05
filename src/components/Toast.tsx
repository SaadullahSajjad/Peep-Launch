import { useEffect } from 'react'
import './Toast.css'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  const icon = type === 'error' ? 'error' : type === 'info' ? 'info' : 'check_circle'

  return (
    <div className={`toast toast-${type} ${isVisible ? 'toast-show' : ''}`}>
      <span className="material-icons-round">{icon}</span>
      <span>{message}</span>
    </div>
  )
}

