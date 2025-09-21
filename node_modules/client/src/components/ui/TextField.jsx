import { useId } from 'react'

export default function TextField({
  label,
  value,
  onChange,
  onBlur,
  name,
  type = 'text',
  placeholder,
  autoComplete,
  required,
  error,
  Icon,
  inputClassName = '',
}) {
  const id = useId()
  const hasError = Boolean(error)
  return (
    <div className="field">
      {label && (
        <label htmlFor={id} className="field-label">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
      )}
      <div className={`field-input ${Icon ? 'with-icon' : ''} ${hasError ? 'is-invalid' : ''}`}>
        {Icon ? (
          <span className="icon-left" aria-hidden>
            <Icon size={16} />
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`input ${inputClassName}`}
        />
      </div>
      {hasError && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}
