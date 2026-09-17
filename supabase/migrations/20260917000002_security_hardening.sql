-- ==============================================================================
-- SECURITY HARDENING MIGRATION (Single Source of Truth)
-- Tanggal: 2026-09-17
-- Mengatasi Temuan Audit: K-1, K-2, K-3, T-1, T-2, T-3, T-4, S-2, S-3, R-2, R-3
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Pastikan Ekstensi & Enum Siap
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. Pastikan Kolom Session Tracking & Schema Terkini
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_info TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. K-3: Trigger handle_new_auth_user - Default Role Wajib 'viewer' (Bukan operator)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, tps_id, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        'viewer'::public.user_role,
        NULL,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- 4. K-1: Pastikan RLS Aktif dan Bersihkan Seluruh Policy Longgar
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invalid_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop all old/legacy policies to eliminate any permissive USING (true) write policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Helper Functions untuk RLS & Otorisasi
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'::public.user_role
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin'::public.user_role, 'operator'::public.user_role)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_my_tps_id()
RETURNS UUID AS $$
    SELECT tps_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_tps_locked(p_tps_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.polling_stations
        WHERE id = p_tps_id AND status = 'locked'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 6. Kebijakan RLS yang Ketat (Strict RLS Policies)
-- ------------------------------------------------------------------------------

-- [PROFILES]
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_self_non_role" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
        AND (tps_id IS NOT DISTINCT FROM (SELECT tps_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- [ELECTIONS]
CREATE POLICY "elections_select_public" ON public.elections
    FOR SELECT TO public USING (true);

CREATE POLICY "elections_admin_write" ON public.elections
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- [CANDIDATES]
CREATE POLICY "candidates_select_public" ON public.candidates
    FOR SELECT TO public USING (true);

CREATE POLICY "candidates_admin_write" ON public.candidates
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- [POLLING_STATIONS]
CREATE POLICY "polling_stations_select_public" ON public.polling_stations
    FOR SELECT TO public USING (true);

CREATE POLICY "polling_stations_admin_write" ON public.polling_stations
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- [VOTE_RESULTS]
CREATE POLICY "vote_results_select_public" ON public.vote_results
    FOR SELECT TO public USING (true);

CREATE POLICY "vote_results_admin_write" ON public.vote_results
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- [INVALID_VOTES]
CREATE POLICY "invalid_votes_select_public" ON public.invalid_votes
    FOR SELECT TO public USING (true);

CREATE POLICY "invalid_votes_admin_write" ON public.invalid_votes
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- [ELECTION_SETTINGS]
CREATE POLICY "settings_select_public" ON public.election_settings
    FOR SELECT TO public USING (true);

CREATE POLICY "settings_admin_write" ON public.election_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- [AUDIT_LOGS] - Read-only untuk authenticated, penulisan HANYA via RPC SECURITY DEFINER
CREATE POLICY "audit_logs_select_auth" ON public.audit_logs
    FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 7. Hardened RPC: log_audit_event
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_tps_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_caller_id UUID := auth.uid();
BEGIN
    INSERT INTO public.audit_logs (actor_id, action, tps_id, details, created_at)
    VALUES (v_caller_id, p_action, p_tps_id, p_details, NOW())
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(TEXT, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, UUID, JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. K-2, T-4: Hardened RPC submit_tps_votes (NULL Bypass & Max Voters Validation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_tps_votes(
    p_tps_id UUID,
    p_votes_cand1 INT,
    p_votes_cand2 INT,
    p_invalid_votes INT,
    p_evidence_photo_url TEXT DEFAULT NULL,
    p_new_status TEXT DEFAULT 'submitted',
    p_additional_voters INT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role public.user_role;
    v_caller_tps_id UUID;
    v_cand1_id UUID;
    v_cand2_id UUID;
    v_max_voters INT;
    v_total_votes INT;
    v_current_status public.tps_status;
    v_registered_voters INT;
    v_additional_voters INT;
BEGIN
    -- 1. Wajib Authenticated
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated: Silakan login terlebih dahulu');
    END IF;

    -- 2. Ambil Profil Pemanggil
    SELECT role, tps_id INTO v_caller_role, v_caller_tps_id
    FROM public.profiles WHERE id = v_caller_id;

    IF v_caller_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profil pengguna tidak ditemukan');
    END IF;

    -- K-2: Validasi Otorisasi Ketat (Operator dengan tps_id NULL atau TPS berbeda DITOLAK)
    IF v_caller_role = 'operator' AND (v_caller_tps_id IS NULL OR v_caller_tps_id IS DISTINCT FROM p_tps_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Akses Ditolak: Anda tidak memiliki wewenang untuk TPS ini');
    END IF;

    IF v_caller_role NOT IN ('admin', 'operator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Akses Ditolak: Role Anda tidak memiliki izin input suara');
    END IF;

    -- 3. Ambil Info TPS & Cek Status Penguncian
    SELECT status, registered_voters, additional_voters
    INTO v_current_status, v_registered_voters, v_additional_voters
    FROM public.polling_stations WHERE id = p_tps_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Data TPS tidak ditemukan');
    END IF;

    IF v_current_status = 'locked' AND v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'TPS ini telah dikunci oleh Admin dan tidak dapat diubah lagi');
    END IF;

    -- 4. Validasi Angka Suara (Tidak Boleh Negatif)
    IF p_votes_cand1 < 0 OR p_votes_cand2 < 0 OR p_invalid_votes < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Jumlah suara tidak boleh bernilai negatif');
    END IF;

    -- T-4: Validasi Batas Maksimal Suara Terhadap Hak Pilih (DPT + DPTb)
    v_additional_voters := COALESCE(p_additional_voters, v_additional_voters, 0);
    v_max_voters := COALESCE(v_registered_voters, 0) + v_additional_voters;
    v_total_votes := p_votes_cand1 + p_votes_cand2 + p_invalid_votes;

    IF v_total_votes > v_max_voters THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Total suara masuk (%s) melebihi batas total hak pilih (%s)', v_total_votes, v_max_voters)
        );
    END IF;

    -- 5. Ambil ID Paslon 1 & 2
    SELECT id INTO v_cand1_id FROM public.candidates WHERE number = 1 LIMIT 1;
    SELECT id INTO v_cand2_id FROM public.candidates WHERE number = 2 LIMIT 1;

    -- 6. Upsert Hasil Suara Calon
    IF v_cand1_id IS NOT NULL THEN
        INSERT INTO public.vote_results (polling_station_id, candidate_id, votes, entered_by, updated_at)
        VALUES (p_tps_id, v_cand1_id, p_votes_cand1, v_caller_id, NOW())
        ON CONFLICT (polling_station_id, candidate_id) DO UPDATE
        SET votes = EXCLUDED.votes, entered_by = EXCLUDED.entered_by, updated_at = NOW();
    END IF;

    IF v_cand2_id IS NOT NULL THEN
        INSERT INTO public.vote_results (polling_station_id, candidate_id, votes, entered_by, updated_at)
        VALUES (p_tps_id, v_cand2_id, p_votes_cand2, v_caller_id, NOW())
        ON CONFLICT (polling_station_id, candidate_id) DO UPDATE
        SET votes = EXCLUDED.votes, entered_by = EXCLUDED.entered_by, updated_at = NOW();
    END IF;

    -- 7. Upsert Suara Tidak Sah
    INSERT INTO public.invalid_votes (polling_station_id, count, updated_at)
    VALUES (p_tps_id, p_invalid_votes, NOW())
    ON CONFLICT (polling_station_id) DO UPDATE
    SET count = EXCLUDED.count, updated_at = NOW();

    -- 8. Update Status TPS & Foto Bukti
    UPDATE public.polling_stations
    SET status = COALESCE(p_new_status::public.tps_status, status),
        evidence_photo_url = COALESCE(p_evidence_photo_url, evidence_photo_url),
        additional_voters = v_additional_voters,
        updated_at = NOW()
    WHERE id = p_tps_id;

    -- 9. Catat Audit Log
    PERFORM public.log_audit_event(
        'SUBMIT_VOTES',
        p_tps_id,
        jsonb_build_object(
            'cand1', p_votes_cand1,
            'cand2', p_votes_cand2,
            'invalid', p_invalid_votes,
            'status', p_new_status,
            'total_votes', v_total_votes,
            'max_voters', v_max_voters
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'tps_id', p_tps_id,
        'total_valid', p_votes_cand1 + p_votes_cand2,
        'total_invalid', p_invalid_votes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.submit_tps_votes(UUID, INT, INT, INT, TEXT, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_tps_votes(UUID, INT, INT, INT, TEXT, TEXT, INT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 9. Hardened RPC: verify_tps (Admin Only)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_tps(
    p_tps_id UUID,
    p_status TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role public.user_role;
    v_prev_status public.tps_status;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya Ketua Admin yang dapat memverifikasi atau mengunci TPS');
    END IF;

    SELECT status INTO v_prev_status FROM public.polling_stations WHERE id = p_tps_id;

    UPDATE public.polling_stations
    SET status = p_status::public.tps_status,
        verified_by = v_caller_id,
        verified_at = NOW(),
        updated_at = NOW()
    WHERE id = p_tps_id;

    -- R-3: Catat Audit Log Khusus untuk Verifikasi / Buka Kunci
    PERFORM public.log_audit_event(
        'UPDATE_TPS_STATUS',
        p_tps_id,
        jsonb_build_object(
            'previous_status', v_prev_status,
            'new_status', p_status
        )
    );

    RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.verify_tps(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_tps(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 10. T-1: Hardened RPC Session Management (Terkunci ke auth.uid())
-- ------------------------------------------------------------------------------

-- [claim_operator_session] - Wajib login via auth.signInWithPassword terlebih dahulu!
DROP FUNCTION IF EXISTS public.claim_operator_session(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.claim_operator_session(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.claim_operator_session(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.claim_operator_session(
    p_session_token TEXT,
    p_device_info TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_profile RECORD;
    v_is_expired BOOLEAN;
    v_timeout_seconds INT := 120;
BEGIN
    -- T-1: Validasi Autentikasi Ketat (Mencegah serangan kunci sesi anonim)
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated: Silakan login terlebih dahulu');
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profil tidak ditemukan');
    END IF;

    -- Akun Admin dikecualikan (Boleh multi-perangkat)
    IF v_profile.role = 'admin' THEN
        UPDATE public.profiles
        SET last_active_at = NOW(),
            device_info = COALESCE(p_device_info, device_info)
        WHERE id = v_caller_id;
        
        RETURN jsonb_build_object('success', true, 'is_admin', true);
    END IF;

    -- Cek sesi aktif
    IF v_profile.active_session_token IS NOT NULL AND v_profile.last_active_at IS NOT NULL THEN
        v_is_expired := (NOW() - v_profile.last_active_at) > (v_timeout_seconds || ' seconds')::INTERVAL;
        
        -- Tolak jika sesi belum expired dan token berbeda
        IF NOT v_is_expired AND v_profile.active_session_token != p_session_token THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'SESSION_LOCKED',
                'message', 'Akun Operator ini sedang aktif digunakan di perangkat lain.'
            );
        END IF;
    END IF;

    -- Klaim sesi berhasil
    UPDATE public.profiles
    SET active_session_token = p_session_token,
        last_active_at = NOW(),
        device_info = COALESCE(p_device_info, 'Browser Web')
    WHERE id = v_caller_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_token', p_session_token,
        'last_active_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.claim_operator_session(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_operator_session(TEXT, TEXT) TO authenticated;

-- [heartbeat_operator_session]
DROP FUNCTION IF EXISTS public.heartbeat_operator_session(TEXT);

CREATE OR REPLACE FUNCTION public.heartbeat_operator_session(
    p_session_token TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    UPDATE public.profiles
    SET last_active_at = NOW()
    WHERE id = v_caller_id AND (active_session_token = p_session_token OR role = 'admin');

    RETURN jsonb_build_object('success', true, 'updated_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.heartbeat_operator_session(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.heartbeat_operator_session(TEXT) TO authenticated;

-- [release_operator_session]
DROP FUNCTION IF EXISTS public.release_operator_session(UUID, TEXT);
DROP FUNCTION IF EXISTS public.release_operator_session(TEXT);

CREATE OR REPLACE FUNCTION public.release_operator_session(
    p_session_token TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    UPDATE public.profiles
    SET active_session_token = NULL,
        last_active_at = NULL,
        device_info = NULL
    WHERE id = v_caller_id AND (active_session_token = p_session_token OR p_session_token IS NULL);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.release_operator_session(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_operator_session(TEXT) TO authenticated;

-- [admin_reset_operator_session] - R-2: Pemeriksaan Otorisasi Admin Eksplisit
DROP FUNCTION IF EXISTS public.admin_reset_operator_session(UUID);

CREATE OR REPLACE FUNCTION public.admin_reset_operator_session(
    p_officer_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role public.user_role;
    v_target_exists BOOLEAN;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya Admin yang dapat mereset sesi');
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_officer_id) INTO v_target_exists;
    IF NOT v_target_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Petugas tidak ditemukan');
    END IF;

    UPDATE public.profiles
    SET active_session_token = NULL,
        last_active_at = NULL,
        device_info = NULL
    WHERE id = p_officer_id;

    PERFORM public.log_audit_event(
        'ADMIN_RESET_SESSION',
        (SELECT tps_id FROM public.profiles WHERE id = p_officer_id),
        jsonb_build_object('reset_officer_id', p_officer_id)
    );

    RETURN jsonb_build_object('success', true, 'reset_officer_id', p_officer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_reset_operator_session(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_operator_session(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 11. RPC: delete_officer & update_officer_role
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_officer(p_officer_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role public.user_role;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya Admin yang dapat menghapus akun petugas');
    END IF;

    DELETE FROM public.profiles WHERE id = p_officer_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.delete_officer(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_officer(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 12. Storage Bucket 'evidence-photos' Hardening
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'evidence-photos', 
    'evidence-photos', 
    true, 
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Storage Policies
DROP POLICY IF EXISTS "evidence_photos_public_read" ON storage.objects;
CREATE POLICY "evidence_photos_public_read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'evidence-photos');

DROP POLICY IF EXISTS "evidence_photos_auth_insert" ON storage.objects;
CREATE POLICY "evidence_photos_auth_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'evidence-photos' 
        AND public.is_operator()
    );

DROP POLICY IF EXISTS "evidence_photos_admin_all" ON storage.objects;
CREATE POLICY "evidence_photos_admin_all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'evidence-photos' AND public.is_admin())
    WITH CHECK (bucket_id = 'evidence-photos' AND public.is_admin());
