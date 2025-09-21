import { useId, useState } from 'react'
import { Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-react'

export default function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  name,
  placeholder,
  autoComplete = 'new-password',
  required,
  error,
}) {
  const id = useId()
  const [show, setShow] = useState(false)
  const hasError = Boolean(error)

  return (
    <div className="field">
      {label && (
        <label htmlFor={id} className="field-label">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
      )}
      <div className={`field-input with-icon-right ${hasError ? 'is-invalid' : ''}`}>
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="input"
        />
        <button
          type="button"
          className="icon-right"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow(s => !s)}
        >
          {show ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      </div>
      {hasError && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}
