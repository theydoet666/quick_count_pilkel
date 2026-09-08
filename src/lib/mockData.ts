import { ElectionSummary, TPSRecapItem, Candidate, CandidateSummary, ElectionSettings, AuditLog, OfficerUser } from '../types/database.types';

export const MOCK_ELECTION = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Pemilihan Perbekel Desa Belega 2026',
  location: 'Kecamatan Blahbatuh, Kabupaten Gianyar',
  status: 'live' as const,
  created_at: new Date().toISOString()
};

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    election_id: '00000000-0000-0000-0000-000000000001',
    number: 1,
    name: 'I Wayan Suardika, S.E.',
    vice_name: 'I Made Karjana',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    color_hex: '#9C4A32',
    created_at: new Date().toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    election_id: '00000000-0000-0000-0000-000000000001',
    number: 2,
    name: 'Dr. I Nyoman Putra Astawa, M.Si.',
    vice_name: 'I Ketut Widana',
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300',
    color_hex: '#B8933F',
    created_at: new Date().toISOString()
  }
];

export const MOCK_TPS_RECAP: TPSRecapItem[] = [
  {
    polling_station_id: 'a1111111-1111-1111-1111-111111111111',
    code: 'TPS 01',
    banjar_name: 'Balai Banjar Belega Kangin',
    registered_voters: 640,
    status: 'pending',
    evidence_photo_url: null,
    total_valid_votes: 0,
    invalid_votes_count: 0,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 0, percentage: 0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 0, percentage: 0 }
    },
    leading_candidate_number: null,
    vote_margin: 0
  },
  {
    polling_station_id: 'a2222222-2222-2222-2222-222222222222',
    code: 'TPS 02',
    banjar_name: 'Balai Banjar Belega Kauh',
    registered_voters: 610,
    status: 'pending',
    evidence_photo_url: null,
    total_valid_votes: 0,
    invalid_votes_count: 0,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 0, percentage: 0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 0, percentage: 0 }
    },
    leading_candidate_number: null,
    vote_margin: 0
  },
  {
    polling_station_id: 'a3333333-3333-3333-3333-333333333333',
    code: 'TPS 03',
    banjar_name: 'Balai Banjar Belega Tengah',
    registered_voters: 680,
    status: 'pending',
    evidence_photo_url: null,
    total_valid_votes: 0,
    invalid_votes_count: 0,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 0, percentage: 0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 0, percentage: 0 }
    },
    leading_candidate_number: null,
    vote_margin: 0
  },
  {
    polling_station_id: 'a4444444-4444-4444-4444-444444444444',
    code: 'TPS 04',
    banjar_name: 'Balai Banjar Kebon',
    registered_voters: 590,
    status: 'pending',
    evidence_photo_url: null,
    total_valid_votes: 0,
    invalid_votes_count: 0,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 0, percentage: 0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 0, percentage: 0 }
    },
    leading_candidate_number: null,
    vote_margin: 0
  },
  {
    polling_station_id: 'a5555555-5555-5555-5555-555555555555',
    code: 'TPS 05',
    banjar_name: 'Balai Banjar Jasri',
    registered_voters: 650,
    status: 'pending',
    evidence_photo_url: null,
    total_valid_votes: 0,
    invalid_votes_count: 0,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 0, percentage: 0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 0, percentage: 0 }
    },
    leading_candidate_number: null,
    vote_margin: 0
  },
  {
    polling_station_id: 'a6666666-6666-6666-6666-666666666666',
    code: 'TPS 06',
    banjar_name: 'Balai Banjar Selat',
    registered_voters: 658,
    status: 'pending',
    evidence_photo_url: null,
    total_valid_votes: 0,
    invalid_votes_count: 0,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 0, percentage: 0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 0, percentage: 0 }
    },
    leading_candidate_number: null,
    vote_margin: 0
  }
];

export const DEFAULT_ELECTION_SETTINGS: ElectionSettings = {
  title: 'PILKEL DESA BELEGA 2026',
  subtitle: 'Kecamatan Blahbatuh • Gianyar, Bali',
  organizer: 'Panwaslukel Desa Belega',
  logo_url: null,
  flash_count_text: 'FLASH COUNT',
  ticker_speed: 30
};

export const calculateSummary = (
  tpsList: TPSRecapItem[],
  candidatesList: Candidate[] = MOCK_CANDIDATES
): ElectionSummary => {
  const verifiedList = tpsList.filter(t => t.status === 'verified' || t.status === 'locked');
  const total_tps = tpsList.length;
  const verified_tps = verifiedList.length;
  const total_dpt = tpsList.reduce((sum, t) => sum + t.registered_voters, 0);
  
  // Track votes & leading count per candidate number
  const candidateVotesMap: Record<number, number> = {};
  const candidateLeadingMap: Record<number, number> = {};
  let total_invalid_votes = 0;

  candidatesList.forEach(c => {
    candidateVotesMap[c.number] = 0;
    candidateLeadingMap[c.number] = 0;
  });

  verifiedList.forEach(t => {
    candidatesList.forEach(c => {
      const votes = t.candidate_votes[String(c.number)]?.votes || 0;
      candidateVotesMap[c.number] = (candidateVotesMap[c.number] || 0) + votes;
    });

    total_invalid_votes += t.invalid_votes_count;

    if (t.leading_candidate_number && candidateLeadingMap[t.leading_candidate_number] !== undefined) {
      candidateLeadingMap[t.leading_candidate_number] = (candidateLeadingMap[t.leading_candidate_number] || 0) + 1;
    }
  });

  const total_valid_votes = Object.values(candidateVotesMap).reduce((sum, v) => sum + v, 0);
  const total_votes_entered = total_valid_votes + total_invalid_votes;
  const participation_rate = total_dpt > 0 ? parseFloat(((total_votes_entered / total_dpt) * 100).toFixed(1)) : 0;

  const candidateSummaries: CandidateSummary[] = candidatesList.map(c => {
    const total_votes = candidateVotesMap[c.number] || 0;
    const percentage = total_valid_votes > 0 ? parseFloat(((total_votes / total_valid_votes) * 100).toFixed(1)) : 0;

    return {
      id: c.id,
      number: c.number,
      name: c.name,
      vice_name: c.vice_name,
      photo_url: c.photo_url,
      color_hex: c.color_hex,
      total_votes,
      percentage,
      banjar_leading_count: candidateLeadingMap[c.number] || 0
    };
  });

  return {
    total_tps,
    verified_tps,
    total_dpt,
    total_valid_votes,
    total_invalid_votes,
    total_votes_entered,
    participation_rate,
    candidates: candidateSummaries
  };
};

export const MOCK_OFFICERS: OfficerUser[] = [
  {
    id: 'off-1',
    full_name: 'Ni Wayan Sari (Petugas TPS 01)',
    email: 'tps01@pilkel.belega.id',
    password: 'password123',
    phone: '081234567801',
    tps_id: 'a1111111-1111-1111-1111-111111111111',
    role: 'operator',
    created_at: new Date().toISOString()
  },
  {
    id: 'off-2',
    full_name: 'I Made Sukerta (Petugas TPS 02)',
    email: 'tps02@pilkel.belega.id',
    password: 'password123',
    phone: '081234567802',
    tps_id: 'a2222222-2222-2222-2222-222222222222',
    role: 'operator',
    created_at: new Date().toISOString()
  },
  {
    id: 'off-3',
    full_name: 'I Ketut Suweta (Petugas TPS 03)',
    email: 'tps03@pilkel.belega.id',
    password: 'password123',
    phone: '081234567803',
    tps_id: 'a3333333-3333-3333-3333-333333333333',
    role: 'operator',
    created_at: new Date().toISOString()
  },
  {
    id: 'off-4',
    full_name: 'Ni Nyoman Rai (Petugas TPS 04)',
    email: 'tps04@pilkel.belega.id',
    password: 'password123',
    phone: '081234567804',
    tps_id: 'a4444444-4444-4444-4444-444444444444',
    role: 'operator',
    created_at: new Date().toISOString()
  },
  {
    id: 'off-5',
    full_name: 'I Wayan Budiana (Petugas TPS 05)',
    email: 'tps05@pilkel.belega.id',
    password: 'password123',
    phone: '081234567805',
    tps_id: 'a5555555-5555-5555-5555-555555555555',
    role: 'operator',
    created_at: new Date().toISOString()
  },
  {
    id: 'off-6',
    full_name: 'Ni Ketut Yanti (Petugas TPS 06)',
    email: 'tps06@pilkel.belega.id',
    password: 'password123',
    phone: '081234567806',
    tps_id: 'a6666666-6666-6666-6666-666666666666',
    role: 'operator',
    created_at: new Date().toISOString()
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    actor_id: 'usr-admin-1',
    action: 'VERIFY_TPS',
    table_name: 'polling_stations',
    record_id: 'a1111111-1111-1111-1111-111111111111',
    old_value: { status: 'submitted' },
    new_value: { status: 'verified' },
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    actor_profile: { id: 'usr-admin-1', full_name: 'I Gede Ketut (Ketua Panitia)', role: 'admin', created_at: '' }
  },
  {
    id: 'log-2',
    actor_id: 'usr-op-1',
    action: 'UPDATE_VOTES',
    table_name: 'vote_results',
    record_id: 'a1111111-1111-1111-1111-111111111111',
    old_value: { votes_paslon_1: 0, votes_paslon_2: 0 },
    new_value: { votes_paslon_1: 348, votes_paslon_2: 232, invalid: 12 },
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    actor_profile: { id: 'usr-op-1', full_name: 'Ni Wayan Sari (Operator TPS 01)', role: 'operator', created_at: '' }
  }
];
