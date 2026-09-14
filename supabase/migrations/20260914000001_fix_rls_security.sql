-- ==============================================================================
-- MIGRATION: FIX RLS SECURITY — Quick Count Pilkel Belega 2026
-- Tanggal: 2026-09-14
-- Deskripsi: Menghapus semua policy "Allow all USING (true)" yang terbuka total
--            dan menggantinya dengan policy berbasis role server-side.
--            Menambahkan RPC SECURITY DEFINER untuk operasi write sensitif.
-- PENTING: Idempotent (aman dijalankan berulang kali).
-- ==============================================================================

-- ==============================================================================
-- BAGIAN 1: HAPUS SEMUA POLICY (LAMA MAUPUN BARU) AGAR IDEMPOTENT
-- ==============================================================================

-- elections
DROP POLICY IF EXISTS "Allow all on elections" ON public.elections;
DROP POLICY IF EXISTS "Public read elections" ON public.elections;
DROP POLICY IF EXISTS "Public elections read" ON public.elections;
DROP POLICY IF EXISTS "Admin elections write" ON public.elections;
DROP POLICY IF EXISTS "elections_select_public" ON public.elections;
DROP POLICY IF EXISTS "elections_write_admin" ON public.elections;
DROP POLICY IF EXISTS "elections_update_admin" ON public.elections;
DROP POLICY IF EXISTS "elections_delete_admin" ON public.elections;

-- election_settings
DROP POLICY IF EXISTS "Allow all on election_settings" ON public.election_settings;
DROP POLICY IF EXISTS "Public read election_settings" ON public.election_settings;
DROP POLICY IF EXISTS "election_settings_select_public" ON public.election_settings;
DROP POLICY IF EXISTS "election_settings_write_admin" ON public.election_settings;
DROP POLICY IF EXISTS "election_settings_update_admin" ON public.election_settings;
DROP POLICY IF EXISTS "election_settings_delete_admin" ON public.election_settings;

-- candidates
DROP POLICY IF EXISTS "Allow all on candidates" ON public.candidates;
DROP POLICY IF EXISTS "Public read candidates" ON public.candidates;
DROP POLICY IF EXISTS "Public candidates read" ON public.candidates;
DROP POLICY IF EXISTS "Admin candidates write" ON public.candidates;
DROP POLICY IF EXISTS "candidates_select_public" ON public.candidates;
DROP POLICY IF EXISTS "candidates_write_admin" ON public.candidates;
DROP POLICY IF EXISTS "candidates_update_admin" ON public.candidates;
DROP POLICY IF EXISTS "candidates_delete_admin" ON public.candidates;

-- polling_stations
DROP POLICY IF EXISTS "Allow all on polling_stations" ON public.polling_stations;
DROP POLICY IF EXISTS "Public read polling_stations" ON public.polling_stations;
DROP POLICY IF EXISTS "Public polling_stations read" ON public.polling_stations;
DROP POLICY IF EXISTS "Operator/Admin polling_stations update" ON public.polling_stations;
DROP POLICY IF EXISTS "Admin polling_stations write" ON public.polling_stations;
DROP POLICY IF EXISTS "polling_stations_select_public" ON public.polling_stations;
DROP POLICY IF EXISTS "polling_stations_insert_admin" ON public.polling_stations;
DROP POLICY IF EXISTS "polling_stations_update_operator_or_admin" ON public.polling_stations;
DROP POLICY IF EXISTS "polling_stations_delete_admin" ON public.polling_stations;

-- vote_results
DROP POLICY IF EXISTS "Allow all on vote_results" ON public.vote_results;
DROP POLICY IF EXISTS "Public read vote_results" ON public.vote_results;
DROP POLICY IF EXISTS "Public vote_results read" ON public.vote_results;
DROP POLICY IF EXISTS "Operator/Admin vote_results write" ON public.vote_results;
DROP POLICY IF EXISTS "vote_results_select_public" ON public.vote_results;
DROP POLICY IF EXISTS "vote_results_insert_operator_or_admin" ON public.vote_results;
DROP POLICY IF EXISTS "vote_results_update_operator_or_admin" ON public.vote_results;
DROP POLICY IF EXISTS "vote_results_delete_admin" ON public.vote_results;

-- invalid_votes
DROP POLICY IF EXISTS "Allow all on invalid_votes" ON public.invalid_votes;
DROP POLICY IF EXISTS "Public read invalid_votes" ON public.invalid_votes;
DROP POLICY IF EXISTS "Public invalid_votes read" ON public.invalid_votes;
DROP POLICY IF EXISTS "Operator/Admin invalid_votes write" ON public.invalid_votes;
DROP POLICY IF EXISTS "invalid_votes_select_public" ON public.invalid_votes;
DROP POLICY IF EXISTS "invalid_votes_insert_operator_or_admin" ON public.invalid_votes;
DROP POLICY IF EXISTS "invalid_votes_update_operator_or_admin" ON public.invalid_votes;
DROP POLICY IF EXISTS "invalid_votes_delete_admin" ON public.invalid_votes;

-- profiles
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_nonrole_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

-- audit_logs
DROP POLICY IF EXISTS "Allow all on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin audit_logs read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;

-- storage.objects
DROP POLICY IF EXISTS "Public evidence read" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public candidate photos read" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload candidate photos" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_insert_operator" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "candidate_photos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "candidate_photos_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "candidate_photos_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "candidate_photos_delete_admin" ON storage.objects;

-- ==============================================================================
-- BAGIAN 2: HELPER FUNCTIONS (SERVER-SIDE ROLE CHECK)
-- Semua function menggunakan SECURITY DEFINER agar berjalan dengan hak superuser,
-- bukan hak pemanggil — sehingga tidak bisa di-bypass dari client.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_operator() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_tps_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_tps_locked(UUID) CASCADE;

-- Cek apakah user yang sedang login adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Cek apakah user yang sedang login adalah operator atau admin
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'operator')
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Dapatkan tps_id dari profil user yang sedang login
CREATE OR REPLACE FUNCTION public.get_my_tps_id()
RETURNS UUID AS $$
    SELECT tps_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Cek apakah TPS yang dimaksud sedang dalam status locked
CREATE OR REPLACE FUNCTION public.is_tps_locked(p_tps_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.polling_stations
        WHERE id = p_tps_id AND status = 'locked'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================================================
-- BAGIAN 3: POLICY RLS BARU — BERBASIS ROLE SERVER-SIDE
-- ==============================================================================

-- ---- elections ----
CREATE POLICY "elections_select_public"
    ON public.elections FOR SELECT USING (true);

CREATE POLICY "elections_write_admin"
    ON public.elections FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "elections_update_admin"
    ON public.elections FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "elections_delete_admin"
    ON public.elections FOR DELETE
    USING (public.is_admin());

-- ---- election_settings ----
CREATE POLICY "election_settings_select_public"
    ON public.election_settings FOR SELECT USING (true);

CREATE POLICY "election_settings_write_admin"
    ON public.election_settings FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "election_settings_update_admin"
    ON public.election_settings FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "election_settings_delete_admin"
    ON public.election_settings FOR DELETE
    USING (public.is_admin());

-- ---- candidates ----
CREATE POLICY "candidates_select_public"
    ON public.candidates FOR SELECT USING (true);

CREATE POLICY "candidates_write_admin"
    ON public.candidates FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "candidates_update_admin"
    ON public.candidates FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "candidates_delete_admin"
    ON public.candidates FOR DELETE
    USING (public.is_admin());

-- ---- polling_stations ----
-- SELECT: publik semua status (untuk dashboard)
-- INSERT: admin only
-- UPDATE: operator (hanya TPS miliknya sendiri, hanya jika belum locked) ATAU admin
-- DELETE: admin only
CREATE POLICY "polling_stations_select_public"
    ON public.polling_stations FOR SELECT USING (true);

CREATE POLICY "polling_stations_insert_admin"
    ON public.polling_stations FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "polling_stations_update_operator_or_admin"
    ON public.polling_stations FOR UPDATE
    USING (
        public.is_admin()
        OR (
            public.is_operator()
            AND public.get_my_tps_id() = id
            AND status != 'locked'
        )
    );

CREATE POLICY "polling_stations_delete_admin"
    ON public.polling_stations FOR DELETE
    USING (public.is_admin());

-- ---- vote_results ----
-- SELECT: publik (untuk hasil live)
-- INSERT/UPDATE: operator (hanya TPS miliknya, jika TPS belum locked) ATAU admin
-- DELETE: admin only
CREATE POLICY "vote_results_select_public"
    ON public.vote_results FOR SELECT USING (true);

CREATE POLICY "vote_results_insert_operator_or_admin"
    ON public.vote_results FOR INSERT
    WITH CHECK (
        public.is_admin()
        OR (
            public.is_operator()
            AND public.get_my_tps_id() = polling_station_id
            AND NOT public.is_tps_locked(polling_station_id)
        )
    );

CREATE POLICY "vote_results_update_operator_or_admin"
    ON public.vote_results FOR UPDATE
    USING (
        public.is_admin()
        OR (
            public.is_operator()
            AND public.get_my_tps_id() = polling_station_id
            AND NOT public.is_tps_locked(polling_station_id)
        )
    );

CREATE POLICY "vote_results_delete_admin"
    ON public.vote_results FOR DELETE
    USING (public.is_admin());

-- ---- invalid_votes ----
CREATE POLICY "invalid_votes_select_public"
    ON public.invalid_votes FOR SELECT USING (true);

CREATE POLICY "invalid_votes_insert_operator_or_admin"
    ON public.invalid_votes FOR INSERT
    WITH CHECK (
        public.is_admin()
        OR (
            public.is_operator()
            AND public.get_my_tps_id() = polling_station_id
            AND NOT public.is_tps_locked(polling_station_id)
        )
    );

CREATE POLICY "invalid_votes_update_operator_or_admin"
    ON public.invalid_votes FOR UPDATE
    USING (
        public.is_admin()
        OR (
            public.is_operator()
            AND public.get_my_tps_id() = polling_station_id
            AND NOT public.is_tps_locked(polling_station_id)
        )
    );

CREATE POLICY "invalid_votes_delete_admin"
    ON public.invalid_votes FOR DELETE
    USING (public.is_admin());

-- ---- profiles ----
-- SELECT: user hanya bisa lihat profilnya sendiri, atau admin bisa lihat semua
-- INSERT: hanya via trigger on_auth_user_created atau admin
-- UPDATE: user bisa update non-role field miliknya sendiri, admin bisa update semua
-- DELETE: admin only
CREATE POLICY "profiles_select_own_or_admin"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id
        OR public.is_admin()
    );

CREATE POLICY "profiles_insert_admin_only"
    ON public.profiles FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "profiles_update_own_nonrole_or_admin"
    ON public.profiles FOR UPDATE
    USING (
        auth.uid() = id
        OR public.is_admin()
    )
    WITH CHECK (
        -- Jika bukan admin, tidak boleh mengubah field role
        public.is_admin()
        OR (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "profiles_delete_admin"
    ON public.profiles FOR DELETE
    USING (public.is_admin());

-- ---- audit_logs ----
-- SELECT: admin only
-- INSERT: hanya via SECURITY DEFINER trigger — tidak ada INSERT policy dari client
-- UPDATE/DELETE: tidak ada (immutable)
CREATE POLICY "audit_logs_select_admin"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

-- ==============================================================================
-- BAGIAN 4: RPC SECURITY DEFINER UNTUK OPERASI WRITE SENSITIF
-- ==============================================================================

-- 4A. submit_tps_votes() — Operator submit atau update suara TPS
DROP FUNCTION IF EXISTS public.submit_tps_votes(UUID, INT, INT, INT, TEXT);
CREATE OR REPLACE FUNCTION public.submit_tps_votes(
    p_tps_id          UUID,
    p_votes_cand1     INT,
    p_votes_cand2     INT,
    p_invalid_votes   INT,
    p_photo_url       TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id       UUID := auth.uid();
    v_caller_role     user_role;
    v_caller_tps_id   UUID;
    v_tps_status      tps_status;
    v_cand1_id        UUID;
    v_cand2_id        UUID;
    v_election_id     UUID;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    SELECT role, tps_id
    INTO v_caller_role, v_caller_tps_id
    FROM public.profiles WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'operator') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tidak punya akses: hanya admin atau operator');
    END IF;

    IF v_caller_role = 'operator' AND v_caller_tps_id != p_tps_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tidak punya akses: bukan TPS Anda');
    END IF;

    SELECT status, election_id INTO v_tps_status, v_election_id
    FROM public.polling_stations WHERE id = p_tps_id;

    IF v_tps_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'TPS tidak ditemukan');
    END IF;

    IF v_tps_status = 'locked' AND v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'TPS sudah dikunci, tidak dapat diubah');
    END IF;

    IF p_votes_cand1 < 0 OR p_votes_cand2 < 0 OR p_invalid_votes < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Jumlah suara tidak boleh negatif');
    END IF;

    SELECT id INTO v_cand1_id FROM public.candidates
    WHERE election_id = v_election_id AND number = 1;

    SELECT id INTO v_cand2_id FROM public.candidates
    WHERE election_id = v_election_id AND number = 2;

    IF v_cand1_id IS NULL OR v_cand2_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Data kandidat tidak ditemukan');
    END IF;

    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes, entered_by, updated_at)
    VALUES (p_tps_id, v_cand1_id, p_votes_cand1, v_caller_id, NOW())
    ON CONFLICT (polling_station_id, candidate_id)
    DO UPDATE SET votes = EXCLUDED.votes, entered_by = EXCLUDED.entered_by, updated_at = NOW();

    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes, entered_by, updated_at)
    VALUES (p_tps_id, v_cand2_id, p_votes_cand2, v_caller_id, NOW())
    ON CONFLICT (polling_station_id, candidate_id)
    DO UPDATE SET votes = EXCLUDED.votes, entered_by = EXCLUDED.entered_by, updated_at = NOW();

    INSERT INTO public.invalid_votes (polling_station_id, count, updated_at)
    VALUES (p_tps_id, p_invalid_votes, NOW())
    ON CONFLICT (polling_station_id)
    DO UPDATE SET count = EXCLUDED.count, updated_at = NOW();

    UPDATE public.polling_stations
    SET
        status = CASE WHEN v_tps_status = 'pending' THEN 'submitted'::tps_status ELSE v_tps_status END,
        evidence_photo_url = COALESCE(p_photo_url, evidence_photo_url),
        updated_at = NOW()
    WHERE id = p_tps_id;

    RETURN jsonb_build_object('success', true, 'tps_id', p_tps_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4B. verify_tps() — Admin verifikasi atau kunci TPS
DROP FUNCTION IF EXISTS public.verify_tps(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.verify_tps(
    p_tps_id  UUID,
    p_status  TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id    UUID := auth.uid();
    v_caller_role  user_role;
    v_valid_statuses TEXT[] := ARRAY['verified', 'locked', 'disputed', 'submitted', 'pending'];
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya admin yang dapat memverifikasi/mengunci TPS');
    END IF;

    IF NOT (p_status = ANY(v_valid_statuses)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Status tidak valid');
    END IF;

    UPDATE public.polling_stations
    SET
        status = p_status::tps_status,
        verified_by = CASE WHEN p_status IN ('verified', 'locked') THEN v_caller_id ELSE verified_by END,
        verified_at = CASE WHEN p_status IN ('verified', 'locked') THEN NOW() ELSE verified_at END,
        updated_at = NOW()
    WHERE id = p_tps_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TPS tidak ditemukan');
    END IF;

    RETURN jsonb_build_object('success', true, 'tps_id', p_tps_id, 'new_status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4C. delete_officer() — Admin hapus profil petugas
DROP FUNCTION IF EXISTS public.delete_officer(UUID);
CREATE OR REPLACE FUNCTION public.delete_officer(
    p_officer_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id   UUID := auth.uid();
    v_caller_role user_role;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya admin yang dapat menghapus petugas');
    END IF;

    IF p_officer_id = v_caller_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tidak dapat menghapus akun sendiri');
    END IF;

    DELETE FROM public.profiles WHERE id = p_officer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Petugas tidak ditemukan');
    END IF;

    RETURN jsonb_build_object('success', true, 'deleted_id', p_officer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4D. update_officer_role() — Admin ubah role petugas (satu-satunya cara ubah role)
DROP FUNCTION IF EXISTS public.update_officer_role(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.update_officer_role(
    p_officer_id UUID,
    p_new_role   TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id   UUID := auth.uid();
    v_caller_role user_role;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya admin yang dapat mengubah role');
    END IF;

    IF p_new_role NOT IN ('admin', 'operator', 'viewer') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Role tidak valid');
    END IF;

    UPDATE public.profiles
    SET role = p_new_role::user_role
    WHERE id = p_officer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Petugas tidak ditemukan');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- BAGIAN 5: STORAGE POLICIES YANG KETAT
-- ==============================================================================

-- evidence-photos: baca publik, upload hanya operator/admin terautentikasi
CREATE POLICY "evidence_photos_select_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_insert_operator"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'evidence-photos'
        AND auth.role() = 'authenticated'
        AND public.is_operator()
    );

CREATE POLICY "evidence_photos_update_admin"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'evidence-photos'
        AND public.is_admin()
    );

CREATE POLICY "evidence_photos_delete_admin"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'evidence-photos'
        AND public.is_admin()
    );

-- candidate-photos: baca publik, upload/replace/delete hanya admin
CREATE POLICY "candidate_photos_select_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'candidate-photos');

CREATE POLICY "candidate_photos_insert_admin"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'candidate-photos'
        AND public.is_admin()
    );

CREATE POLICY "candidate_photos_update_admin"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'candidate-photos'
        AND public.is_admin()
    );

-- candidate_photos_delete_admin
CREATE POLICY "candidate_photos_delete_admin"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'candidate-photos'
        AND public.is_admin()
    );

-- ==============================================================================
-- BAGIAN 6: TRIGGER AUTO-CREATE PROFILE SAAT USER SUPABASE AUTH BARU DIBUAT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Buat entri profiles dengan role default 'operator' saat user baru terdaftar
    -- Admin harus secara manual mengubah role via update_officer_role() RPC
    INSERT INTO public.profiles (id, full_name, role, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'operator',
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
