import React, { useState, useEffect, useRef } from 'react';
import { ElectionSettings } from '../../types/database.types';
import { showAlert } from '../../lib/alerts';

interface ElectionSettingsTabProps {
  settings: ElectionSettings;
  onSaveSettings: (settings: Partial<ElectionSettings>) => void;
}

export const ElectionSettingsTab: React.FC<ElectionSettingsTabProps> = ({
  settings,
  onSaveSettings
}) => {
  const [title, setTitle] = useState(settings.title);
  const [subtitle, setSubtitle] = useState(settings.subtitle);
  const [organizer, setOrganizer] = useState(settings.organizer);
  const [flashCountText, setFlashCountText] = useState(settings.flash_count_text || 'FLASH COUNT');
  const [tickerSpeed, setTickerSpeed] = useState<number>(settings.ticker_speed || 30);
  const generateNoticeText = (startTimeStr: string): string => {
    if (!startTimeStr) {
      return 'Perhitungan suara TPS resmi dibuka oleh Panitia Pemilihan pada pukul 13.00 WITA.';
    }
    try {
      const d = new Date(startTimeStr);
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
      const fullDate = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const timeStr = d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      }).replace(':', '.');
      return `Perhitungan suara TPS resmi dibuka oleh Panitia Pemilihan pada Hari ${dayName}, ${fullDate} pukul ${timeStr} WITA.`;
    } catch {
      return 'Perhitungan suara TPS resmi dibuka oleh Panitia Pemilihan pada pukul 13.00 WITA.';
    }
  };

  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logo_url);
  const [countingStartTime, setCountingStartTime] = useState<string>(settings.counting_start_time || '2026-09-14T13:00');
  const [isCountingStarted, setIsCountingStarted] = useState<boolean>(Boolean(settings.is_counting_started));
  const [countingNotice, setCountingNotice] = useState<string>(
    settings.counting_notice || generateNoticeText(settings.counting_start_time || '2026-09-14T13:00')
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(settings.title);
    setSubtitle(settings.subtitle);
    setOrganizer(settings.organizer);
    setFlashCountText(settings.flash_count_text || 'FLASH COUNT');
    setTickerSpeed(settings.ticker_speed || 30);
    setLogoUrl(settings.logo_url);
    const sTime = settings.counting_start_time || '2026-09-14T13:00';
    setCountingStartTime(sTime);
    setIsCountingStarted(Boolean(settings.is_counting_started));
    setCountingNotice(
      settings.counting_notice || generateNoticeText(sTime)
    );
  }, [settings]);

  const isPastSchedule = countingStartTime ? new Date() >= new Date(countingStartTime) : false;
  const isCurrentlyActive = isCountingStarted || isPastSchedule;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showAlert.warning('Ukuran File Terlalu Besar', 'Ukuran file logo maksimal adalah 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showAlert.toast('Logo direset ke logo bawaan.', 'info');
  };

  const handleToggleCountingNow = async () => {
    const nextState = !isCountingStarted;
    const confirmed = await showAlert.confirm({
      title: nextState ? 'Buka Perhitungan Suara Sekarang?' : 'Kunci / Tunda Perhitungan Suara?',
      text: nextState
        ? 'Membuka perhitungan suara akan mengizinkan seluruh Petugas Operator TPS untuk login dan mulai menginput rekapitulasi suara.'
        : 'Mengunci perhitungan suara akan menolak login operator TPS dan menampilkan tampilan hitung mundur / terkunci pada halaman login.',
      confirmButtonText: nextState ? 'Ya, Buka Sekarang' : 'Ya, Kunci Perhitungan',
      icon: nextState ? 'question' : 'warning',
      confirmButtonClass: nextState
        ? 'px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all mx-1 cursor-pointer'
        : 'px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all mx-1 cursor-pointer'
    });

    if (!confirmed) return;

    setIsCountingStarted(nextState);
    onSaveSettings({
      title,
      subtitle,
      organizer,
      logo_url: logoUrl,
      flash_count_text: flashCountText,
      ticker_speed: tickerSpeed,
      counting_start_time: countingStartTime,
      is_counting_started: nextState,
      counting_notice: countingNotice
    });
    showAlert.toast(nextState ? 'Perhitungan suara berhasil dibuka!' : 'Perhitungan suara berhasil dikunci.', 'info');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      title,
      subtitle,
      organizer,
      logo_url: logoUrl,
      flash_count_text: flashCountText,
      ticker_speed: tickerSpeed,
      counting_start_time: countingStartTime,
      is_counting_started: isCountingStarted,
      counting_notice: countingNotice
    });
    setSaveSuccess(true);
    showAlert.success('Pengaturan Disimpan!', 'Jadwal perhitungan suara, logo, dan pengaturan siaran berhasil diperbarui.');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-6 max-w-3xl">
      <div className="flex items-center gap-3 pb-4 border-b border-surface-container mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-2xl">settings</span>
        </div>
        <div>
          <h2 className="font-headline-sm text-lg font-bold text-primary">
            Pengaturan Judul, Ticker & Tampilan Siaran
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Ubah judul acara, instansi penyelenggara, logo, label flash count, dan kecepatan tulisan berjalan.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION: JADWAL & KONTROL PEMBUKAAN PERHITUNGAN SUARA */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isCurrentlyActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                <span className="material-symbols-outlined text-xl">
                  {isCurrentlyActive ? 'lock_open' : 'lock_clock'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Jadwal & Pembukaan Perhitungan Suara</span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black ${
                    isCurrentlyActive 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  }`}>
                    {isCurrentlyActive ? 'Aktif / Dibuka' : 'Belum Mulai (Terkunci)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Atur jam resmi pembukaan perhitungan suara atau buka/kunci secara langsung.
                </p>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={handleToggleCountingNow}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                isCountingStarted
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isCountingStarted ? 'lock' : 'key'}
              </span>
              <span>{isCountingStarted ? 'Kunci / Tunda Perhitungan' : 'Buka Perhitungan Sekarang'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Start Datetime Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-emerald-400">schedule</span>
                <span>Waktu Resmi Mulai Perhitungan (WITA)</span>
              </label>
              <input
                type="datetime-local"
                value={countingStartTime}
                onChange={(e) => {
                  const newTime = e.target.value;
                  setCountingStartTime(newTime);
                  // Update kalimat jika masih format standar
                  if (!countingNotice || countingNotice.startsWith('Perhitungan suara TPS resmi dibuka oleh Panitia Pemilihan pada')) {
                    setCountingNotice(generateNoticeText(newTime));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {isPastSchedule 
                  ? '✓ Jadwal waktu telah terlewati, perhitungan aktif otomatis.' 
                  : '⏳ Perhitungan akan terbuka otomatis saat waktu ini tercapai.'}
              </p>
            </div>

            {/* Manual Override Status Display */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-700/60 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status Override Admin</span>
              <div className="my-1 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isCountingStarted ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-500'}`} />
                <span className="text-xs font-bold text-white">
                  {isCountingStarted ? 'Dibuka Langsung secara Manual oleh Admin' : 'Mengikuti Jadwal Otomatis'}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-tight">
                Jika dibuka manual, operator TPS dapat langsung login tanpa menunggu jadwal waktu tercapai.
              </p>
            </div>
          </div>

          {/* Counting Notice Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-amber-400">announcement</span>
                <span>Pesan Pengumuman untuk Layar Siaran Publik & Login</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setCountingNotice(generateNoticeText(countingStartTime));
                  showAlert.toast('Kalimat pengumuman disesuaikan otomatis dengan jadwal.', 'info');
                }}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
              >
                🔄 Buat Otomatis Sesuai Tanggal
              </button>
            </div>
            <textarea
              rows={2}
              value={countingNotice}
              onChange={(e) => setCountingNotice(e.target.value)}
              placeholder="Perhitungan suara TPS resmi dibuka oleh Panitia Pemilihan pada Hari ... pukul 13.00 WITA."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pesan ini otomatis tampil di banner siaran layar publik saat perhitungan suara belum dimulai.
            </p>
          </div>
        </div>

        {/* Logo Upload Section */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
          <label className="block font-bold text-sm text-on-surface mb-2">
            Logo Pemilihan / Desa
          </label>
          <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
            {/* Logo Preview */}
            <div className="w-20 h-20 rounded-xl bg-surface border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <svg viewBox="0 0 100 100" className="w-12 h-12 text-primary" fill="currentColor">
                  <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="#2F4030" strokeWidth="6" />
                  <circle cx="50" cy="50" r="22" fill="#9C4A32" />
                  <path d="M50 20 L55 35 L70 35 L58 45 L62 60 L50 50 L38 60 L42 45 L30 35 L45 35 Z" fill="#B8933F" />
                </svg>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">upload</span>
                  Upload File Logo
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-error rounded-lg text-xs font-bold transition-colors"
                  >
                    Reset ke Logo Bawaan
                  </button>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Format yang didukung: PNG, JPG, SVG, WebP (Maks. 2MB).
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1.5">
            Judul Utama Acara / Pemilihan
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="contoh: PILKEL DESA BELEGA 2026"
            className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Subtitle Input */}
        <div>
          <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1.5">
            Sub-Judul / Lokasi Kecamatan & Kabupaten
          </label>
          <input
            type="text"
            required
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="contoh: Kecamatan Blahbatuh • Gianyar, Bali"
            className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Organizer Name */}
        <div>
          <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1.5">
            Nama Panitia / Penyelenggara (Tampil di Footer & Tabel)
          </label>
          <input
            type="text"
            required
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            placeholder="contoh: Panwaslukel Desa Belega"
            className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Ticker & Flash Count Settings Section */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm pb-2 border-b border-outline-variant/30">
            <span className="material-symbols-outlined text-lg">campaign</span>
            <span>Pengaturan Running Text (Tulisan Berjalan) & Flash Count</span>
          </div>

          {/* Flash Count Label Input */}
          <div>
            <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1.5">
              Teks Label Flash Count (Kotak Merah Berjalan)
            </label>
            <input
              type="text"
              required
              value={flashCountText}
              onChange={(e) => setFlashCountText(e.target.value)}
              placeholder="contoh: FLASH COUNT / UPDATE CEPAT"
              className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-on-surface-variant mt-1">
              Teks ini tampil di badge merah pojok kiri bawah pada pita siaran berjalan.
            </p>
          </div>

          {/* Marquee Speed Slider & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-xs uppercase tracking-wider text-on-surface">
                Kecepatan Tulisan Berjalan (Marquee Speed)
              </label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                {tickerSpeed} detik / siklus {tickerSpeed <= 15 ? '(Sangat Cepat)' : tickerSpeed <= 22 ? '(Cepat)' : tickerSpeed <= 35 ? '(Sedang)' : '(Lambat)'}
              </span>
            </div>
            
            <input
              type="range"
              min="10"
              max="60"
              step="2"
              value={tickerSpeed}
              onChange={(e) => setTickerSpeed(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium mt-1">
              <span>Cepat (10s)</span>
              <span>Sedang (30s)</span>
              <span>Lambat (60s)</span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-xs font-semibold text-on-surface-variant">Pilihan Cepat:</span>
              {[
                { label: 'Cepat (15s)', val: 15 },
                { label: 'Sedang (25s)', val: 25 },
                { label: 'Standar (35s)', val: 35 },
                { label: 'Tenang (50s)', val: 50 }
              ].map(preset => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setTickerSpeed(preset.val)}
                  className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                    tickerSpeed === preset.val
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface hover:bg-surface-container border-outline-variant/50 text-on-surface'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button & Feedback */}
        <div className="flex items-center gap-4 pt-4 border-t border-surface-container">
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            Simpan Perubahan
          </button>
          {saveSuccess && (
            <span className="text-emerald-700 bg-emerald-100 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 animate-fadeIn">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Pengaturan berhasil disimpan dan diperbarui!
            </span>
          )}
        </div>

      </form>
    </div>
  );
};
