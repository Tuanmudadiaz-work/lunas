import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { formatRupiah, parseRupiah } from '../domain'

const inputCls =
  'min-h-touch w-full rounded-box border border-card-border bg-bg px-4 text-[16px] text-text placeholder:text-muted/80 focus:border-link focus:outline-none'

type FieldProps = {
  label: string
  hint?: ReactNode
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/** Label, isian, dan keterangan. Ukuran huruf isian 16px supaya Safari iOS tidak memperbesar layar. */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[14px] font-semibold">
        {label}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string
  hint?: ReactNode
  value: string
  onChange: (value: string) => void
}

export function TextField({ label, hint, value, onChange, className = '', ...rest }: TextFieldProps) {
  return (
    <Field label={label} hint={hint}>
      {(id, describedBy) => (
        <input
          id={id}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} ${className}`}
          {...rest}
        />
      )}
    </Field>
  )
}

/** Isian rupiah: menerima '2.400.000', '2,4jt', '500rb'; dirapikan saat keluar dari isian. */
export function MoneyField({ label, hint, value, onChange, ...rest }: TextFieldProps) {
  const tidy = () => {
    const n = parseRupiah(value)
    if (n !== null) onChange(formatRupiah(n).replace('Rp', ''))
  }
  return (
    <Field label={label} hint={hint}>
      {(id, describedBy) => (
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[16px] text-muted">
            Rp
          </span>
          <input
            id={id}
            aria-describedby={describedBy}
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={tidy}
            className={`${inputCls} pl-11 tabular-nums`}
            {...rest}
          />
        </div>
      )}
    </Field>
  )
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  label: string
  hint?: ReactNode
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

export function SelectField({ label, hint, value, onChange, options, ...rest }: SelectFieldProps) {
  return (
    <Field label={label} hint={hint}>
      {(id, describedBy) => (
        <select
          id={id}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} appearance-none bg-[length:20px] bg-[right_14px_center] bg-no-repeat pr-10`}
          style={{ backgroundImage: 'var(--select-arrow)' }}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function FormErrors({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return (
    <div role="alert" className="rounded-box border border-warn/40 px-4 py-3 text-[14px] text-warn">
      <p className="font-semibold">Ada yang perlu dibenerin dulu:</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  )
}
