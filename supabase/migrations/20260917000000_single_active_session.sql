-- ==============================================================================
-- MIGRATION: SINGLE ACTIVE SESSION & OPERATOR LOCKING
-- Tanggal: 2026-09-17
-- Deskripsi: Menambahkan kolom session tracking pada tabel public.profiles dan
--            RPC functions untuk mencegah multiple concurrent login per operator TPS.
-- ==============================================================================

-- 1. Tambah kolom session tracking pada public.profiles jika belum ada
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_info TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. RPC: claim_operator_session (Klaim sesi baru, tolak jika sedang aktif di perangkat lain)
DROP FUNCTION IF EXISTS public.claim_operator_session(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.claim_operator_session(
    p_officer_id UUID,
    p_session_token TEXT,
    p_device_info TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_is_expired BOOLEAN;
    v_timeout_seconds INT := 120; -- 2 menit timeout toleransi heartbeat
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_officer_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profil tidak ditemukan');
    END IF;

    -- Akun Admin dikecualikan (boleh multi-login untuk kebutuhan banyak layar panitia)
    IF v_profile.role = 'admin' THEN
        UPDATE public.profiles
        SET last_active_at = NOW(),
            device_info = COALESCE(p_device_info, device_info)
        WHERE id = p_officer_id;
        
        RETURN jsonb_build_object('success', true, 'is_admin', true);
    END IF;

    -- Cek apakah sesi aktif masih berlaku
    IF v_profile.active_session_token IS NOT NULL AND v_profile.last_active_at IS NOT NULL THEN
        v_is_expired := (NOW() - v_profile.last_active_at) > (v_timeout_seconds || ' seconds')::INTERVAL;
        
        -- Jika sesi belum expired dan token berbeda -> Tolak Login
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

    -- Klaim sesi berhasil
    UPDATE public.profiles
    SET active_session_token = p_session_token,
        last_active_at = NOW(),
        device_info = COALESCE(p_device_info, 'Browser Web')
    WHERE id = p_officer_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_token', p_session_token,
        'last_active_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: heartbeat_operator_session (Update timestamp aktivitas perangkat aktif)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: release_operator_session (Lepaskan sesi saat logout resmi)
DROP FUNCTION IF EXISTS public.release_operator_session(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.release_operator_session(
    p_officer_id UUID,
    p_session_token TEXT
)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.profiles
    SET active_session_token = NULL,
        last_active_at = NULL,
        device_info = NULL
    WHERE id = p_officer_id AND (active_session_token = p_session_token OR p_session_token IS NULL);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: admin_reset_operator_session (Admin paksa reset sesi operator)
DROP FUNCTION IF EXISTS public.admin_reset_operator_session(UUID);
CREATE OR REPLACE FUNCTION public.admin_reset_operator_session(
    p_officer_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hanya Admin yang dapat mereset sesi');
    END IF;

    UPDATE public.profiles
    SET active_session_token = NULL,
        last_active_at = NULL,
        device_info = NULL
    WHERE id = p_officer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Petugas tidak ditemukan');
    END IF;

    RETURN jsonb_build_object('success', true, 'reset_officer_id', p_officer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
