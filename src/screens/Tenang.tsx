import { Card, ScreenHeader } from '../components'

/**
 * Teman Tenang (chat AI) dibangun di Fase 4 bersama jalur krisis dan layar bantuan.
 * Layar ini sengaja tidak menampilkan nomor bantuan: nomornya harus diverifikasi dulu sebelum rilis.
 */
export function Tenang() {
  return (
    <div className="space-y-block">
      <ScreenHeader title="Teman Tenang" />
      <Card className="space-y-2">
        <h2 className="text-base font-semibold">Lagi disiapkan</h2>
        <p className="text-[15px] text-muted">
          Teman Tenang nanti jadi tempat ngobrol soal utang tanpa dihakimi. Fitur ini belum aktif di versi ini.
        </p>
      </Card>
      <Card className="space-y-2">
        <h2 className="text-base font-semibold">Sementara itu</h2>
        <ul className="list-disc space-y-1 pl-5 text-[15px] text-muted">
          <li>Tarik napas pelan beberapa kali sebelum membuka pesan penagih.</li>
          <li>Kalau rasanya terlalu berat, cerita ke satu orang yang lu percaya hari ini.</li>
        </ul>
      </Card>
    </div>
  )
}
