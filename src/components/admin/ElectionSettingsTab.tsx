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
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logo_url);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(settings.title);
    setSubtitle(settings.subtitle);
    setOrganizer(settings.organizer);
    setFlashCountText(settings.flash_count_text || 'FLASH COUNT');
    setTickerSpeed(settings.ticker_speed || 30);
    setLogoUrl(settings.logo_url);
  }, [settings]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      title,
      subtitle,
      organizer,
      logo_url: logoUrl,
      flash_count_text: flashCountText,
      ticker_speed: tickerSpeed
    });
    setSaveSuccess(true);
    showAlert.success('Pengaturan Disimpan!', 'Judul siaran, logo, dan teks berjalan berhasil diperbarui.');
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
