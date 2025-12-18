import { useState, useRef, useEffect } from 'react'

interface SearchableSelectProps {
  id: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
  disabled?: boolean
  required?: boolean
  className?: string
  style?: React.CSSProperties
  showOtherOption?: boolean
  onOtherSelect?: () => void
}

export default function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  style,
  showOtherOption = false,
  onOtherSelect,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Get selected label
  const selectedOption = options.find((opt) => opt.value === value)
  const displayValue = selectedOption ? selectedOption.label : placeholder

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 0)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    if (optionValue === 'Other' && onOtherSelect) {
      onOtherSelect()
    }
    onChange(optionValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setSearchQuery('')
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`searchable-select ${className}`}
      style={{ position: 'relative', ...style }}
    >
      <div
        className="vehicle-input"
        onClick={handleToggle}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            color: value ? 'var(--text-main)' : 'var(--text-muted)',
          }}
        >
          {displayValue}
        </span>
        <span
          className="material-icons-round"
          style={{
            fontSize: '20px',
            color: 'var(--text-muted)',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          expand_more
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1000,
            maxHeight: '220px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            
          }}
        >
          {/* Search Input */}
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-body)',
                color: 'var(--text-main)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Options List */}
          <div
            className="searchable-select-options"
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {filteredOptions.length === 0 && searchQuery ? (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                }}
              >
                No results found
              </div>
            ) : (
              <>
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      backgroundColor:
                        value === option.value
                          ? 'var(--primary)'
                          : 'transparent',
                      color:
                        value === option.value
                          ? '#ffffff'
                          : 'var(--text-main)',
                      transition: 'background-color 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (value !== option.value) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (value !== option.value) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    {option.label}
                  </div>
                ))}
                {showOtherOption && (
                  <div
                    onClick={() => {
                      if (onOtherSelect) {
                        onOtherSelect()
                      }
                      handleSelect('Other')
                    }}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      backgroundColor:
                        value === 'Other' ? 'var(--primary)' : 'transparent',
                      color: value === 'Other' ? '#ffffff' : 'var(--primary)',
                      fontWeight: value === 'Other' ? 600 : 500,
                      borderTop: '1px solid var(--border)',
                      transition: 'background-color 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (value !== 'Other') {
                        e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (value !== 'Other') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Other / Not Listed
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {required && !value && (
        <input
          type="text"
          tabIndex={-1}
          required
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: 0,
            height: 0,
          }}
          value=""
          onChange={() => {}}
        />
      )}
    </div>
  )
}

