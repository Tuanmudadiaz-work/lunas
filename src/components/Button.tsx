import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'accent' | 'ghost'

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary',
  accent: 'bg-accent text-on-accent',
  ghost: 'bg-transparent text-link border border-card-border',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }

export function Button({ variant = 'primary', block, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-touch items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-opacity active:opacity-80 disabled:opacity-50 ${styles[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  )
}

export function IconButton({ className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex size-touch items-center justify-center rounded-full border border-card-border bg-card text-text active:opacity-80 ${className}`}
      {...rest}
    />
  )
}
