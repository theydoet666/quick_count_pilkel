import React, { useState, useRef } from 'react';
import { Candidate } from '../../types/database.types';

interface CandidateManagementTabProps {
  candidates: Candidate[];
  onAddCandidate: (candidate: Omit<Candidate, 'id' | 'election_id' | 'created_at'>) => void;
  onUpdateCandidate: (id: string, updates: Partial<Candidate>) => void;
  onDeleteCandidate: (id: string) => void;
}

const COLOR_PRESETS = [
  { name: 'Terakota / Rose', hex: '#9C4A32' },
  { name: 'Emas / Gold', hex: '#B8933F' },
  { name: 'Zamrud / Emerald', hex: '#2F4030' },
  { name: 'Biru Samudera', hex: '#2563eb' },
  { name: 'Ungu Bangsawan', hex: '#7c3aed' },
  { name: 'Merah Berani', hex: '#dc2626' }
];

export const CandidateManagementTab: React.FC<CandidateManagementTabProps> = ({
  candidates,
  onAddCandidate,
  onUpdateCandidate,
  onDeleteCandidate
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [number, setNumber] = useState<number>(1);
  const [name, setName] = useState('');
  const [viceName, setViceName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [colorHex, setColorHex] = useState('#9C4A32');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAddModal = () => {
    setEditingCandidate(null);
    setNumber(candidates.length + 1);
    setName('');
    setViceName('');
    setPhotoUrl(null);
    setColorHex(COLOR_PRESETS[candidates.length % COLOR_PRESETS.length].hex);
    setIsModalOpen(true);
  };

  const openEditModal = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setNumber(candidate.number);
    setName(candidate.name);
    setViceName(candidate.vice_name || '');
    setPhotoUrl(candidate.photo_url);
    setColorHex(candidate.color_hex);
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCandidate) {
      onUpdateCandidate(editingCandidate.id, {
        number,
        name,
        vice_name: viceName || null,
        photo_url: photoUrl,
        color_hex: colorHex
      });
    } else {
      onAddCandidate({
        number,
        name,
        vice_name: viceName || null,
        photo_url: photoUrl,
        color_hex: colorHex
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (candidate: Candidate) => {
    if (confirm(`Apakah Anda yakin ingin menghapus Paslon 0${candidate.number} (${candidate.name})?`)) {
      onDeleteCandidate(candidate.id);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-6 space-y-6">
      
      {/* Header & Add Button */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">badge</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-lg font-bold text-primary">
              Manajemen Calon & Foto Paslon
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Kelola daftar nama pasangan calon, nomor urut, foto resmi, dan warna identitas kartu.
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs md:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          Tambah Paslon Baru
        </button>
      </div>

      {/* Candidates Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low shadow-sm relative overflow-hidden flex items-center gap-4"
          >
            {/* Top Accent Strip */}
            <div
              className="absolute top-0 left-0 w-full h-1.5"
              style={{ backgroundColor: candidate.color_hex }}
            />

            {/* Photo & Number Badge */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-outline-variant/60 shadow-sm bg-surface">
                <img
                  src={candidate.photo_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300'}
                  alt={candidate.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-black text-xs text-white shadow-md border-2 border-white"
                style={{ backgroundColor: candidate.color_hex }}
              >
                {candidate.number}
              </span>
            </div>

            {/* Candidate Details */}
            <div className="flex-1 min-w-0">
              <span className="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider bg-surface-container text-on-surface-variant inline-block mb-1">
                PASLON 0{candidate.number}
              </span>
              <h3 className="font-bold text-sm text-on-surface truncate">
                {candidate.name}
              </h3>
              {candidate.vice_name && (
                <p className="text-xs text-on-surface-variant truncate">
                  Wakil: <span className="font-semibold text-on-surface">{candidate.vice_name}</span>
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-outline-variant"
                  style={{ backgroundColor: candidate.color_hex }}
                  title={`Warna Tema: ${candidate.color_hex}`}
                />
                <span className="text-[11px] text-on-surface-variant font-mono">
                  {candidate.color_hex}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => openEditModal(candidate)}
                className="p-2 rounded-lg bg-surface hover:bg-surface-container-high text-primary border border-outline-variant/40 shadow-xs transition-colors"
                title="Edit Paslon"
              >
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
              <button
                onClick={() => handleDelete(candidate)}
                className="p-2 rounded-lg bg-surface hover:bg-error-container text-error border border-outline-variant/40 shadow-xs transition-colors"
                title="Hapus Paslon"
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit Candidate */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-base font-bold text-primary">
                {editingCandidate ? 'Edit Data Pasangan Calon' : 'Tambah Paslon Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Photo Upload & Preview */}
              <div className="flex items-center gap-4 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-outline-variant bg-surface shrink-0 shadow-inner flex items-center justify-center">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-outline">person</span>
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors inline-flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Upload Foto Calon
                  </button>
                  <p className="text-[10px] text-on-surface-variant">
                    PNG, JPG, atau WebP (Maks. 2MB).
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Number and Theme Color in Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1">
                    Nomor Urut
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={number}
                    onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1">
                    Warna Tema Paslon
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-10 h-9 p-0.5 rounded-lg border border-outline-variant bg-surface cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-on-surface font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Color Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-on-surface-variant">Pilihan Warna:</span>
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setColorHex(preset.hex)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: preset.hex,
                      borderColor: colorHex === preset.hex ? '#000' : 'transparent'
                    }}
                    title={preset.name}
                  />
                ))}
              </div>

              {/* Candidate Name */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1">
                  Nama Calon Utama / Perbekel
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="contoh: I Wayan Suardika, S.E."
                  className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Vice Candidate Name */}
              <div>
                <label className="block font-bold text-xs uppercase tracking-wider text-on-surface mb-1">
                  Nama Wakil Calon (Opsional)
                </label>
                <input
                  type="text"
                  value={viceName}
                  onChange={(e) => setViceName(e.target.value)}
                  placeholder="contoh: I Made Karjana"
                  className="w-full px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-lg shadow-md"
                >
                  {editingCandidate ? 'Simpan Perubahan' : 'Tambah Paslon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
