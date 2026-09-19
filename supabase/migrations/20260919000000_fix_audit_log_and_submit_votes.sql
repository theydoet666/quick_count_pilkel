-- ==============================================================================
-- MIGRATION: 20260919000000_fix_audit_log_and_submit_votes.sql
-- PERBAIKAN: Mengatasi error `column "tps_id" of relation "audit_logs" does not exist`
--            pada RPC submit_tps_votes, verify_tps, dan log_audit_event
-- ==============================================================================

-- 1. Bersihkan versi lama log_audit_event
DROP FUNCTION IF EXISTS public.log_audit_event(TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB);

-- 2. Buat ulang log_audit_event sesuai skema kolom tabel audit_logs yang benar
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id UUID,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_log_id UUID;
    v_caller_id UUID := auth.uid();
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        table_name,
        record_id,
        old_value,
        new_value,
        created_at
    )
    VALUES (
        v_caller_id,
        p_action,
        p_table_name,
        p_record_id,
        p_old_value,
        p_new_value,
        NOW()
    )
    RETURNING id INTO v_log_id;
    
    RETURN jsonb_build_object('success', true, 'id', v_log_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB) TO authenticated;

-- 3. Perbarui submit_tps_votes agar memanggil log_audit_event dengan format kolom yang sesuai
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

    -- Validasi Otorisasi Ketat (Operator dengan tps_id NULL atau TPS berbeda DITOLAK)
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

    -- Validasi Batas Maksimal Suara Terhadap Hak Pilih (DPT + DPTb)
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
        evidence_photo_url = CASE
            WHEN p_evidence_photo_url = '' THEN NULL
            WHEN p_evidence_photo_url IS NOT NULL THEN p_evidence_photo_url
            ELSE evidence_photo_url
        END,
        additional_voters = v_additional_voters,
        updated_at = NOW()
    WHERE id = p_tps_id;

    -- 9. Catat Audit Log (Sesuai kolom tabel audit_logs)
    PERFORM public.log_audit_event(
        'SUBMIT_VOTES',
        'polling_stations',
        p_tps_id,
        NULL,
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

-- 4. Perbarui verify_tps
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

    -- Catat Audit Log Khusus untuk Verifikasi / Buka Kunci
    PERFORM public.log_audit_event(
        'UPDATE_TPS_STATUS',
        'polling_stations',
        p_tps_id,
        jsonb_build_object('previous_status', v_prev_status),
        jsonb_build_object('new_status', p_status)
    );

    RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.verify_tps(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_tps(UUID, TEXT) TO authenticated;

-- 5. Perbarui admin_reset_operator_session
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
        'profiles',
        p_officer_id,
        NULL,
        jsonb_build_object('reset_officer_id', p_officer_id)
    );

    RETURN jsonb_build_object('success', true, 'reset_officer_id', p_officer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_reset_operator_session(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_operator_session(UUID) TO authenticated;

-- 6. Storage Policy: Izinkan Hapus Foto Bukti untuk Operator & Admin
DROP POLICY IF EXISTS "evidence_photos_auth_delete" ON storage.objects;
CREATE POLICY "evidence_photos_auth_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'evidence-photos' 
        AND public.is_operator()
    );
