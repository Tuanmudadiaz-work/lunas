import { useEffect, useId, useRef, type ReactNode } from 'react'

type SheetProps = {
  title: ReactNode
  onClose: () => void
  children: ReactNode
}

/**
 * Lembar dari bawah. Memakai <dialog> bawaan supaya fokus terkunci di dalam, Esc menutup,
 * dan pembaca layar tahu ini dialog. Dipasang hanya saat terbuka, jadi isian form selalu mulai bersih.
 */
export function Sheet({ title, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // Saat lembar diganti lembar lain, dialog ditutup karena dilepas; itu bukan permintaan pengguna untuk menutup.
  const unmounting = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    unmounting.current = false
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      unmounting.current = true
      dialog?.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        // Event 'close' datang belakangan; jika dialog sudah dibuka ulang (StrictMode), abaikan.
        if (!unmounting.current && !ref.current?.open) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="sheet"
    >
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] border border-card-border bg-card px-page pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div aria-hidden className="mx-auto mb-3 h-[5px] w-10 rounded-full bg-track" />
        <h2 id={titleId} className="mb-4 text-[20px] font-bold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
