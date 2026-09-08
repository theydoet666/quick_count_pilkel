export type ElectionStatus = 'draft' | 'live' | 'closed';
export type TPSStatus = 'pending' | 'submitted' | 'verified' | 'locked' | 'disputed';
export type UserRole = 'admin' | 'operator' | 'viewer';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  tps_id?: string | null;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface OfficerUser {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  phone?: string;
  tps_id: string;
  role: 'operator';
  created_at: string;
}

export interface ElectionSettings {
  title: string;
  subtitle: string;
  organizer: string;
  logo_url: string | null;
  flash_count_text?: string;
  ticker_speed?: number;
}

export interface Election {
  id: string;
  name: string;
  location: string;
  status: ElectionStatus;
  created_at: string;
}


export interface Candidate {
  id: string;
  election_id: string;
  number: number;
  name: string;
  vice_name: string | null;
  photo_url: string | null;
  color_hex: string;
  created_at: string;
}

export interface PollingStation {
  id: string;
  election_id: string;
  code: string;
  banjar_name: string;
  registered_voters: number;
  status: TPSStatus;
  evidence_photo_url: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoteResult {
  id: string;
  polling_station_id: string;
  candidate_id: string;
  votes: number;
  entered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvalidVote {
  id: string;
  polling_station_id: string;
  count: number;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string;
  record_id: string;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  created_at: string;
  actor_profile?: Profile | null;
}

export interface CandidateSummary {
  id: string;
  number: number;
  name: string;
  vice_name: string | null;
  photo_url: string | null;
  color_hex: string;
  total_votes: number;
  percentage: number;
  banjar_leading_count: number;
}

export interface ElectionSummary {
  total_tps: number;
  verified_tps: number;
  total_dpt: number;
  total_valid_votes: number;
  total_invalid_votes: number;
  total_votes_entered: number;
  participation_rate: number;
  candidates: CandidateSummary[];
}

export interface TPSRecapItem {
  polling_station_id: string;
  code: string;
  banjar_name: string;
  registered_voters: number;
  status: TPSStatus;
  evidence_photo_url: string | null;
  total_valid_votes: number;
  invalid_votes_count: number;
  candidate_votes: Record<string, { candidate_id: string; votes: number; percentage: number }>;
  leading_candidate_number: number | null;
  vote_margin: number;
}
