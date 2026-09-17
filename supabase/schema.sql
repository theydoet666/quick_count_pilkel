-- ==============================================================================
-- SCHEMA HITUNG CEPAT (QUICK COUNT) PILKEL DESA BELEGA 2026
-- Database: Supabase PostgreSQL
-- ==============================================================================

-- 1. ENUMS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE election_status AS ENUM ('draft', 'live', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tps_status AS ENUM ('pending', 'submitted', 'verified', 'locked', 'disputed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ELECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status election_status NOT NULL DEFAULT 'live',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ELECTION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.election_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'PILKEL DESA BELEGA 2026',
    subtitle TEXT NOT NULL DEFAULT 'Kecamatan Blahbatuh • Gianyar, Bali',
    organizer TEXT NOT NULL DEFAULT 'Panwaslukel Desa Belega',
    logo_url TEXT,
    flash_count_text TEXT NOT NULL DEFAULT 'FLASH COUNT',
    ticker_speed INT NOT NULL DEFAULT 30,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. POLLING STATIONS (TPS) TABLE
CREATE TABLE IF NOT EXISTS public.polling_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    banjar_name TEXT NOT NULL,
    registered_voters INT NOT NULL DEFAULT 0,
    status tps_status NOT NULL DEFAULT 'pending',
    evidence_photo_url TEXT,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PROFILES / USERS TABLE (Linked to Supabase Auth or Standalone)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'operator',
    tps_id UUID REFERENCES public.polling_stations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    number INT NOT NULL,
    name TEXT NOT NULL,
    vice_name TEXT,
    photo_url TEXT,
    color_hex TEXT NOT NULL DEFAULT '#9C4A32',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. VOTE RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.vote_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID NOT NULL REFERENCES public.polling_stations(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    votes INT NOT NULL DEFAULT 0 CHECK (votes >= 0),
    entered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tps_candidate UNIQUE (polling_station_id, candidate_id)
);

-- 8. INVALID VOTES TABLE
CREATE TABLE IF NOT EXISTS public.invalid_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID NOT NULL UNIQUE REFERENCES public.polling_stations(id) ON DELETE CASCADE,
    count INT NOT NULL DEFAULT 0 CHECK (count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. RPC: GET ELECTION SUMMARY
CREATE OR REPLACE FUNCTION get_election_summary(p_election_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_tps INT;
    v_verified_tps INT;
    v_total_dpt INT;
    v_total_valid_votes INT;
    v_total_invalid_votes INT;
    v_candidates JSONB;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(registered_voters), 0)
    INTO v_total_tps, v_total_dpt
    FROM public.polling_stations
    WHERE election_id = p_election_id;

    SELECT COUNT(*)
    INTO v_verified_tps
    FROM public.polling_stations
    WHERE election_id = p_election_id AND status IN ('verified', 'locked');

    SELECT COALESCE(SUM(vr.votes), 0)
    INTO v_total_valid_votes
    FROM public.vote_results vr
    JOIN public.polling_stations ps ON ps.id = vr.polling_station_id
    WHERE ps.election_id = p_election_id AND ps.status IN ('verified', 'locked');

    SELECT COALESCE(SUM(iv.count), 0)
    INTO v_total_invalid_votes
    FROM public.invalid_votes iv
    JOIN public.polling_stations ps ON ps.id = iv.polling_station_id
    WHERE ps.election_id = p_election_id AND ps.status IN ('verified', 'locked');

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'number', c.number,
            'name', c.name,
            'vice_name', c.vice_name,
            'photo_url', c.photo_url,
            'color_hex', c.color_hex,
            'total_votes', COALESCE(cand_votes.total, 0),
            'percentage', CASE WHEN v_total_valid_votes > 0 
                               THEN ROUND((COALESCE(cand_votes.total, 0)::NUMERIC / v_total_valid_votes::NUMERIC) * 100, 1) 
                               ELSE 0 END,
            'banjar_leading_count', COALESCE(leading_tps.cnt, 0)
        ) ORDER BY c.number ASC
    )
    INTO v_candidates
    FROM public.candidates c
    LEFT JOIN (
        SELECT vr.candidate_id, SUM(vr.votes) as total
        FROM public.vote_results vr
        JOIN public.polling_stations ps ON ps.id = vr.polling_station_id
        WHERE ps.election_id = p_election_id AND ps.status IN ('verified', 'locked')
        GROUP BY vr.candidate_id
    ) cand_votes ON cand_votes.candidate_id = c.id
    LEFT JOIN (
        SELECT candidate_id, COUNT(*) as cnt
        FROM (
            SELECT vr.polling_station_id, vr.candidate_id,
                   RANK() OVER (PARTITION BY vr.polling_station_id ORDER BY vr.votes DESC) as rk
            FROM public.vote_results vr
            JOIN public.polling_stations ps ON ps.id = vr.polling_station_id
            WHERE ps.election_id = p_election_id AND ps.status IN ('verified', 'locked')
        ) ranked
        WHERE rk = 1
        GROUP BY candidate_id
    ) leading_tps ON leading_tps.candidate_id = c.id
    WHERE c.election_id = p_election_id;

    RETURN jsonb_build_object(
        'total_tps', v_total_tps,
        'verified_tps', v_verified_tps,
        'total_dpt', v_total_dpt,
        'total_valid_votes', v_total_valid_votes,
        'total_invalid_votes', v_total_invalid_votes,
        'total_votes_entered', (v_total_valid_votes + v_total_invalid_votes),
        'participation_rate', CASE WHEN v_total_dpt > 0 
                                   THEN ROUND(((v_total_valid_votes + v_total_invalid_votes)::NUMERIC / v_total_dpt::NUMERIC) * 100, 1) 
                                   ELSE 0 END,
        'candidates', COALESCE(v_candidates, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 11. RPC: GET TPS RECAP
CREATE OR REPLACE FUNCTION get_tps_recap(p_election_id UUID)
RETURNS TABLE (
    polling_station_id UUID,
    code TEXT,
    banjar_name TEXT,
    registered_voters INT,
    status tps_status,
    evidence_photo_url TEXT,
    total_valid_votes INT,
    invalid_votes_count INT,
    candidate_votes JSONB,
    leading_candidate_number INT,
    vote_margin INT
) LANGUAGE sql STABLE AS $$
    WITH tps_valid_totals AS (
        SELECT 
            vr.polling_station_id as ps_id,
            COALESCE(SUM(vr.votes), 0)::INT as tps_valid_sum
        FROM public.vote_results vr
        JOIN public.polling_stations ps ON ps.id = vr.polling_station_id
        WHERE ps.election_id = p_election_id
        GROUP BY vr.polling_station_id
    ),
    tps_candidate_votes AS (
        SELECT 
            ps.id as ps_id,
            c.number as cand_num,
            c.id as cand_id,
            COALESCE(vr.votes, 0)::INT as cand_votes,
            CASE 
                WHEN COALESCE(tot.tps_valid_sum, 0) > 0 
                THEN ROUND((COALESCE(vr.votes, 0)::NUMERIC / tot.tps_valid_sum::NUMERIC) * 100, 1)
                ELSE 0 
            END as cand_pct
        FROM public.polling_stations ps
        CROSS JOIN public.candidates c
        LEFT JOIN public.vote_results vr ON vr.polling_station_id = ps.id AND vr.candidate_id = c.id
        LEFT JOIN tps_valid_totals tot ON tot.ps_id = ps.id
        WHERE ps.election_id = p_election_id AND c.election_id = p_election_id
    ),
    tps_cand_json AS (
        SELECT 
            tcv.ps_id,
            jsonb_object_agg(
                tcv.cand_num::TEXT,
                jsonb_build_object(
                    'candidate_id', tcv.cand_id,
                    'votes', tcv.cand_votes,
                    'percentage', tcv.cand_pct
                )
            ) as cand_json
        FROM tps_candidate_votes tcv
        GROUP BY tcv.ps_id
    ),
    tps_ranks AS (
        SELECT 
            vr_rank.polling_station_id as ps_id,
            c_rank.number as lead_num,
            vr_rank.votes as lead_votes,
            ROW_NUMBER() OVER (PARTITION BY vr_rank.polling_station_id ORDER BY vr_rank.votes DESC) as rk
        FROM public.vote_results vr_rank
        JOIN public.candidates c_rank ON c_rank.id = vr_rank.candidate_id
        JOIN public.polling_stations ps_rank ON ps_rank.id = vr_rank.polling_station_id
        WHERE ps_rank.election_id = p_election_id
    )
    SELECT 
        ps.id as polling_station_id,
        ps.code,
        ps.banjar_name,
        ps.registered_voters,
        ps.status,
        ps.evidence_photo_url,
        COALESCE(tot.tps_valid_sum, 0)::INT as total_valid_votes,
        COALESCE(iv.count, 0)::INT as invalid_votes_count,
        COALESCE(tcj.cand_json, '{}'::jsonb) as candidate_votes,
        rk1.lead_num as leading_candidate_number,
        COALESCE(
            CASE 
                WHEN rk2.lead_votes IS NOT NULL THEN (rk1.lead_votes - rk2.lead_votes)
                ELSE rk1.lead_votes
            END,
            0
        )::INT as vote_margin
    FROM public.polling_stations ps
    LEFT JOIN tps_valid_totals tot ON tot.ps_id = ps.id
    LEFT JOIN tps_cand_json tcj ON tcj.ps_id = ps.id
    LEFT JOIN public.invalid_votes iv ON iv.polling_station_id = ps.id
    LEFT JOIN tps_ranks rk1 ON rk1.ps_id = ps.id AND rk1.rk = 1
    LEFT JOIN tps_ranks rk2 ON rk2.ps_id = ps.id AND rk2.rk = 2
    WHERE ps.election_id = p_election_id
    ORDER BY ps.code ASC;
$$;

-- 12. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.elections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.election_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polling_stations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invalid_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- CATATAN KEAMANAN: Seluruh RLS, RPC, dan Security Policy resmi dikelola
-- secara ketat melalui file migrasi:
-- supabase/migrations/20260917000002_security_hardening.sql
-- JANGAN MENAMBAHKAN POLICY PERMISIF "USING (true)" UNTUK OPERASI TULIS (INSERT/UPDATE/DELETE).
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invalid_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 14. DEFAULT INITIAL DATA (Clean Real Setup)
INSERT INTO public.elections (id, name, location, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Pemilihan Perbekel Desa Belega 2026',
    'Kecamatan Blahbatuh, Kabupaten Gianyar',
    'live'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.election_settings (election_id, title, subtitle, organizer, flash_count_text, ticker_speed)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'PILKEL DESA BELEGA 2026',
    'Kecamatan Blahbatuh • Gianyar, Bali',
    'Panwaslukel Desa Belega',
    'FLASH COUNT',
    30
) ON CONFLICT DO NOTHING;

-- Initial Admin Account in profiles table
INSERT INTO public.profiles (full_name, email, role, phone)
VALUES ('I Gede Ketut (Ketua Panitia)', 'admin@pilkel.belega.id', 'admin', '081234567890')
ON CONFLICT (email) DO NOTHING;

-- Storage Buckets for Evidence and Photos
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-photos', 'evidence-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-photos', 'candidate-photos', true) ON CONFLICT (id) DO NOTHING;
