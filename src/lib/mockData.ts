import { ElectionSummary, TPSRecapItem, Candidate, CandidateSummary, ElectionSettings, AuditLog } from '../types/database.types';

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
    status: 'verified',
    evidence_photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    total_valid_votes: 580,
    invalid_votes_count: 12,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 348, percentage: 60.0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 232, percentage: 40.0 }
    },
    leading_candidate_number: 1,
    vote_margin: 116
  },
  {
    polling_station_id: 'a2222222-2222-2222-2222-222222222222',
    code: 'TPS 02',
    banjar_name: 'Balai Banjar Belega Kauh',
    registered_voters: 610,
    status: 'verified',
    evidence_photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    total_valid_votes: 545,
    invalid_votes_count: 10,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 310, percentage: 56.9 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 235, percentage: 43.1 }
    },
    leading_candidate_number: 1,
    vote_margin: 75
  },
  {
    polling_station_id: 'a3333333-3333-3333-3333-333333333333',
    code: 'TPS 03',
    banjar_name: 'Balai Banjar Belega Tengah',
    registered_voters: 680,
    status: 'verified',
    evidence_photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    total_valid_votes: 612,
    invalid_votes_count: 15,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 355, percentage: 58.0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 257, percentage: 42.0 }
    },
    leading_candidate_number: 1,
    vote_margin: 98
  },
  {
    polling_station_id: 'a4444444-4444-4444-4444-444444444444',
    code: 'TPS 04',
    banjar_name: 'Balai Banjar Kebon',
    registered_voters: 590,
    status: 'verified',
    evidence_photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    total_valid_votes: 518,
    invalid_votes_count: 8,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 220, percentage: 42.5 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 298, percentage: 57.5 }
    },
    leading_candidate_number: 2,
    vote_margin: 78
  },
  {
    polling_station_id: 'a5555555-5555-5555-5555-555555555555',
    code: 'TPS 05',
    banjar_name: 'Balai Banjar Jasri',
    registered_voters: 650,
    status: 'verified',
    evidence_photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    total_valid_votes: 576,
    invalid_votes_count: 9,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 334, percentage: 58.0 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 242, percentage: 42.0 }
    },
    leading_candidate_number: 1,
    vote_margin: 92
  },
  {
    polling_station_id: 'a6666666-6666-6666-6666-666666666666',
    code: 'TPS 06',
    banjar_name: 'Balai Banjar Selat',
    registered_voters: 658,
    status: 'verified',
    evidence_photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    total_valid_votes: 530,
    invalid_votes_count: 8,
    candidate_votes: {
      '1': { candidate_id: '11111111-1111-1111-1111-111111111111', votes: 275, percentage: 51.9 },
      '2': { candidate_id: '22222222-2222-2222-2222-222222222222', votes: 255, percentage: 48.1 }
    },
    leading_candidate_number: 1,
    vote_margin: 20
  }
];

export const DEFAULT_ELECTION_SETTINGS: ElectionSettings = {
  title: 'PILKEL DESA BELEGA 2026',
  subtitle: 'Kecamatan Blahbatuh • Gianyar, Bali',
  organizer: 'Panwaslukel Desa Belega',
  logo_url: null
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
