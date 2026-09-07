-- Migration for Hitung Cepat Pemilihan Perbekel Desa Belega 2026

-- 1. Create Enums / Types
CREATE TYPE election_status AS ENUM ('draft', 'live', 'closed');
CREATE TYPE tps_status AS ENUM ('pending', 'submitted', 'verified', 'locked', 'disputed');
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');

-- 2. Profiles Table (Extends Supabase Auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Elections Table
CREATE TABLE public.elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status election_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Candidates Table
CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    number INT NOT NULL,
    name TEXT NOT NULL,
    vice_name TEXT,
    photo_url TEXT,
    color_hex TEXT NOT NULL DEFAULT '#9C4A32',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Polling Stations (TPS) Table
CREATE TABLE public.polling_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    banjar_name TEXT NOT NULL,
    registered_voters INT NOT NULL DEFAULT 0,
    status tps_status NOT NULL DEFAULT 'pending',
    evidence_photo_url TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Vote Results Table
CREATE TABLE public.vote_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID NOT NULL REFERENCES public.polling_stations(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    votes INT NOT NULL DEFAULT 0 CHECK (votes >= 0),
    entered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tps_candidate UNIQUE (polling_station_id, candidate_id)
);

-- 7. Invalid Votes Table
CREATE TABLE public.invalid_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID NOT NULL UNIQUE REFERENCES public.polling_stations(id) ON DELETE CASCADE,
    count INT NOT NULL DEFAULT 0 CHECK (count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Trigger Function for Audit Log
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
    current_actor UUID;
BEGIN
    current_actor := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, new_value)
        VALUES (current_actor, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, old_value, new_value)
        VALUES (current_actor, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, old_value)
        VALUES (current_actor, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Triggers
CREATE TRIGGER audit_vote_results_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.vote_results
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

CREATE TRIGGER audit_polling_stations_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.polling_stations
FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invalid_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Elections & Candidates (Public Read)
CREATE POLICY "Public elections read" ON public.elections FOR SELECT USING (true);
CREATE POLICY "Admin elections write" ON public.elections FOR ALL USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Public candidates read" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Admin candidates write" ON public.candidates FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Polling Stations
-- Public can read verified or locked TPS. Authenticated operator/admin can read all.
CREATE POLICY "Public polling_stations read" ON public.polling_stations FOR SELECT USING (
    status IN ('verified', 'locked') OR 
    (auth.role() = 'authenticated' AND get_user_role(auth.uid()) IN ('admin', 'operator'))
);
CREATE POLICY "Operator/Admin polling_stations update" ON public.polling_stations FOR UPDATE USING (
    auth.role() = 'authenticated' AND get_user_role(auth.uid()) IN ('admin', 'operator')
);
CREATE POLICY "Admin polling_stations write" ON public.polling_stations FOR ALL USING (
    auth.role() = 'authenticated' AND get_user_role(auth.uid()) = 'admin'
);

-- Vote Results & Invalid Votes
CREATE POLICY "Public vote_results read" ON public.vote_results FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.polling_stations ps 
        WHERE ps.id = vote_results.polling_station_id 
        AND (ps.status IN ('verified', 'locked') OR (auth.role() = 'authenticated' AND get_user_role(auth.uid()) IN ('admin', 'operator')))
    )
);

CREATE POLICY "Operator/Admin vote_results write" ON public.vote_results FOR ALL USING (
    auth.role() = 'authenticated' AND get_user_role(auth.uid()) IN ('admin', 'operator')
);

CREATE POLICY "Public invalid_votes read" ON public.invalid_votes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.polling_stations ps 
        WHERE ps.id = invalid_votes.polling_station_id 
        AND (ps.status IN ('verified', 'locked') OR (auth.role() = 'authenticated' AND get_user_role(auth.uid()) IN ('admin', 'operator')))
    )
);

CREATE POLICY "Operator/Admin invalid_votes write" ON public.invalid_votes FOR ALL USING (
    auth.role() = 'authenticated' AND get_user_role(auth.uid()) IN ('admin', 'operator')
);

-- Audit Logs
CREATE POLICY "Admin audit_logs read" ON public.audit_logs FOR SELECT USING (
    auth.role() = 'authenticated' AND get_user_role(auth.uid()) = 'admin'
);

-- 11. RPC Function: election_summary
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
    -- Total TPS
    SELECT COUNT(*), COALESCE(SUM(registered_voters), 0)
    INTO v_total_tps, v_total_dpt
    FROM public.polling_stations
    WHERE election_id = p_election_id;

    -- Verified / Locked TPS count
    SELECT COUNT(*)
    INTO v_verified_tps
    FROM public.polling_stations
    WHERE election_id = p_election_id AND status IN ('verified', 'locked');

    -- Total Valid Votes from Verified/Locked TPS
    SELECT COALESCE(SUM(vr.votes), 0)
    INTO v_total_valid_votes
    FROM public.vote_results vr
    JOIN public.polling_stations ps ON ps.id = vr.polling_station_id
    WHERE ps.election_id = p_election_id AND ps.status IN ('verified', 'locked');

    -- Total Invalid Votes from Verified/Locked TPS
    SELECT COALESCE(SUM(iv.count), 0)
    INTO v_total_invalid_votes
    FROM public.invalid_votes iv
    JOIN public.polling_stations ps ON ps.id = iv.polling_station_id
    WHERE ps.election_id = p_election_id AND ps.status IN ('verified', 'locked');

    -- Candidates Tally
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
        -- Count how many TPS each candidate is leading in
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

-- 12. View / Function: tps_recap
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
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id as polling_station_id,
        ps.code,
        ps.banjar_name,
        ps.registered_voters,
        ps.status,
        ps.evidence_photo_url,
        COALESCE(SUM(vr.votes), 0)::INT as total_valid_votes,
        COALESCE(iv.count, 0)::INT as invalid_votes_count,
        COALESCE(
            jsonb_object_agg(
                c.number::TEXT, 
                jsonb_build_object(
                    'candidate_id', c.id,
                    'votes', COALESCE(vr.votes, 0),
                    'percentage', CASE WHEN SUM(vr.votes) OVER (PARTITION BY ps.id) > 0 
                                       THEN ROUND((COALESCE(vr.votes, 0)::NUMERIC / (SUM(vr.votes) OVER (PARTITION BY ps.id))::NUMERIC) * 100, 1) 
                                       ELSE 0 END
                )
            ), 
            '{}'::jsonb
        ) as candidate_votes,
        -- Determine leading candidate number
        (
            SELECT c_sub.number 
            FROM public.vote_results vr_sub 
            JOIN public.candidates c_sub ON c_sub.id = vr_sub.candidate_id 
            WHERE vr_sub.polling_station_id = ps.id 
            ORDER BY vr_sub.votes DESC LIMIT 1
        ) as leading_candidate_number,
        -- Determine margin between 1st and 2nd
        COALESCE(
            (
                SELECT ABS(vr1.votes - COALESCE(vr2.votes, 0))
                FROM (
                    SELECT votes FROM public.vote_results 
                    WHERE polling_station_id = ps.id ORDER BY votes DESC LIMIT 1 OFFSET 0
                ) vr1
                LEFT JOIN (
                    SELECT votes FROM public.vote_results 
                    WHERE polling_station_id = ps.id ORDER BY votes DESC LIMIT 1 OFFSET 1
                ) vr2 ON true
            ), 
            0
        )::INT as vote_margin
    FROM public.polling_stations ps
    LEFT JOIN public.vote_results vr ON vr.polling_station_id = ps.id
    LEFT JOIN public.candidates c ON c.id = vr.candidate_id
    LEFT JOIN public.invalid_votes iv ON iv.polling_station_id = ps.id
    WHERE ps.election_id = p_election_id
    GROUP BY ps.id, ps.code, ps.banjar_name, ps.registered_voters, ps.status, ps.evidence_photo_url, iv.count
    ORDER BY ps.code ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 13. Supabase Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence-photos', 'evidence-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public evidence read" ON storage.objects FOR SELECT USING (bucket_id = 'evidence-photos');
CREATE POLICY "Auth upload evidence" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'evidence-photos' AND auth.role() = 'authenticated'
);

CREATE POLICY "Public candidate photos read" ON storage.objects FOR SELECT USING (bucket_id = 'candidate-photos');
CREATE POLICY "Auth upload candidate photos" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'candidate-photos' AND auth.role() = 'authenticated'
);
