-- ==============================================================================
-- FIX & CLEAN: RESET PROFIL & SINKRONISASI TOTAL AUTH.USERS KE POLLING_STATIONS
-- Tanggal: 2026-09-17
-- Solusi: Membersihkan tabel public.profiles dan meregenerasi dari auth.users
--         agar tidak terjadi konflik unique constraint profiles_email_key.
-- ==============================================================================

-- 1. Pastikan kolom session tracking ada
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_info TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Bersihkan tabel profiles lama untuk mencegah duplikasi/konflik ID vs Email
--    (Aman: data TPS & Hasil Suara tidak hilang karena foreign key ON DELETE SET NULL)
DELETE FROM public.profiles;

-- 3. Masukkan profil yang sah langsung dari akun auth.users yang terdaftar
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    u.id, 
    u.email, 
    'Petugas ' || u.email,
    CASE WHEN LOWER(u.email) LIKE 'admin%' THEN 'admin'::user_role ELSE 'operator'::user_role END
FROM auth.users u;

-- 4. Hubungkan tps_id dan nama banjar secara akurat berdasarkan kode TPS (TPS 01 s/d TPS 09)
DO $$
DECLARE
    r_tps RECORD;
    v_tps_num INT;
    v_formatted_num TEXT;
    v_email TEXT;
BEGIN
    FOR r_tps IN (
        SELECT id, code, banjar_name 
        FROM public.polling_stations 
        ORDER BY code ASC
    ) LOOP
        v_tps_num := SUBSTRING(r_tps.code FROM '([0-9]+)')::INT;
        
        IF v_tps_num IS NOT NULL THEN
            IF v_tps_num < 10 THEN
                v_formatted_num := '0' || v_tps_num::TEXT;
            ELSE
                v_formatted_num := v_tps_num::TEXT;
            END IF;
            
            v_email := 'tps' || v_formatted_num || '@pilkel.belega.id';

            UPDATE public.profiles
            SET tps_id = r_tps.id,
                full_name = 'Petugas ' || r_tps.code || ' (' || r_tps.banjar_name || ')',
                role = 'operator',
                active_session_token = NULL,
                last_active_at = NULL,
                device_info = NULL
            WHERE LOWER(email) = LOWER(v_email)
               OR LOWER(email) = 'tps' || v_tps_num::TEXT || '@pilkel.belega.id';

            RAISE NOTICE 'Tautkan % (%) -> %', r_tps.code, r_tps.id, v_email;
        END IF;
    END LOOP;

    -- Atur akun Ketua Admin
    UPDATE public.profiles
    SET tps_id = NULL,
        role = 'admin',
        full_name = 'I Gede Ketut (Ketua Panitia)',
        active_session_token = NULL,
        last_active_at = NULL,
        device_info = NULL
    WHERE LOWER(email) LIKE 'admin%';
END $$;

-- 5. Perbarui fungsi claim_operator_session
DROP FUNCTION IF EXISTS public.claim_operator_session(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.claim_operator_session(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.claim_operator_session(
    p_officer_id UUID,
    p_session_token TEXT,
    p_device_info TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_is_expired BOOLEAN;
    v_timeout_seconds INT := 120;
    v_target_id UUID;
BEGIN
    SELECT * INTO v_profile FROM public.profiles 
    WHERE id = p_officer_id 
       OR (p_email IS NOT NULL AND LOWER(email) = LOWER(p_email))
    ORDER BY CASE WHEN id = p_officer_id THEN 0 ELSE 1 END
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profil tidak ditemukan');
    END IF;

    v_target_id := v_profile.id;

    -- Akun Admin dikecualikan
    IF v_profile.role = 'admin' THEN
        UPDATE public.profiles
        SET last_active_at = NOW(),
            device_info = COALESCE(p_device_info, device_info)
        WHERE id = v_target_id;
        
        RETURN jsonb_build_object('success', true, 'is_admin', true);
    END IF;

    -- Cek apakah sesi aktif masih berlaku di perangkat lain
    IF v_profile.active_session_token IS NOT NULL AND v_profile.last_active_at IS NOT NULL THEN
        v_is_expired := (NOW() - v_profile.last_active_at) > (v_timeout_seconds || ' seconds')::INTERVAL;
        
        IF NOT v_is_expired AND v_profile.active_session_token != p_session_token THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'SESSION_LOCKED',
                'message', 'Akun Operator ini sedang aktif digunakan di perangkat lain.',
                'last_active_at', v_profile.last_active_at,
                'device_info', v_profile.device_info
            );
        END IF;
    END IF;

    -- Klaim sesi sukses
    UPDATE public.profiles
    SET active_session_token = p_session_token,
        last_active_at = NOW(),
        device_info = COALESCE(p_device_info, 'Browser Web')
    WHERE id = v_target_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_token', p_session_token,
        'last_active_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
