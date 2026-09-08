import React, { useState, useRef } from 'react';
import { ElectionSettings } from '../../types/database.types';

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
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logo_url);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo maksimal 2MB.');
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      title,
      subtitle,
      organizer,
      logo_url: logoUrl
    });
    setSaveSuccess(true);
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
            Pengaturan Judul & Logo Kegiatan
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Ubah judul acara, instansi penyelenggara, dan logo yang tampil di halaman publik dan admin.
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
            Nama Panitia / Penyelenggara
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
