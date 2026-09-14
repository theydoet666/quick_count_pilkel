-- ============================================================================
-- SEED / SYNC: 9 TPS & AKUN PETUGAS DESA BELEGA 2026
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================================

DO $$
DECLARE
    v_election_id UUID := '00000000-0000-0000-0000-000000000001';
    v_cand1_id    UUID := '11111111-1111-1111-1111-111111111111';
    v_cand2_id    UUID := '22222222-2222-2222-2222-222222222222';
    
    v_tps1_id UUID := 'a1111111-1111-1111-1111-111111111111';
    v_tps2_id UUID := 'a2222222-2222-2222-2222-222222222222';
    v_tps3_id UUID := 'a3333333-3333-3333-3333-333333333333';
    v_tps4_id UUID := 'a4444444-4444-4444-4444-444444444444';
    v_tps5_id UUID := 'a5555555-5555-5555-5555-555555555555';
    v_tps6_id UUID := 'a6666666-6666-6666-6666-666666666666';
    v_tps7_id UUID := 'a7777777-7777-7777-7777-777777777777';
    v_tps8_id UUID := 'a8888888-8888-8888-8888-888888888888';
    v_tps9_id UUID := 'a9999999-9999-9999-9999-999999999999';
BEGIN
    -- 1. Pastikan Data Pemilihan Ada
    INSERT INTO public.elections (id, name, location, status)
    VALUES (
        v_election_id, 
        'Pemilihan Perbekel Desa Belega 2026', 
        'Kecamatan Blahbatuh, Kabupaten Gianyar', 
        'live'
    )
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name, location = EXCLUDED.location, status = EXCLUDED.status;

    -- 2. Pastikan Pasangan Calon Ada
    INSERT INTO public.candidates (id, election_id, number, name, vice_name, color_hex, photo_url)
    VALUES 
    (
        v_cand1_id, v_election_id, 1, 
        'I Wayan Suardika, S.E.', 'I Made Karjana', 
        '#9C4A32', 
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300'
    ),
    (
        v_cand2_id, v_election_id, 2, 
        'Dr. I Nyoman Putra Astawa, M.Si.', 'I Ketut Widana', 
        '#B8933F', 
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300'
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, vice_name = EXCLUDED.vice_name, color_hex = EXCLUDED.color_hex;

    -- 3. Upsert 9 Polling Stations (TPS)
    INSERT INTO public.polling_stations (id, election_id, code, banjar_name, registered_voters, additional_voters, status)
    VALUES 
    (v_tps1_id, v_election_id, 'TPS 01', 'Banjar Pasdalem', 640, 12, 'pending'),
    (v_tps2_id, v_election_id, 'TPS 02', 'Gedung Serba Guna', 610, 8, 'pending'),
    (v_tps3_id, v_election_id, 'TPS 03', 'Gedung Serba Guna', 680, 15, 'pending'),
    (v_tps4_id, v_election_id, 'TPS 04', 'Banjar Kebon Kelod', 590, 6, 'pending'),
    (v_tps5_id, v_election_id, 'TPS 05', 'Banjar Kebon Kaja', 650, 10, 'pending'),
    (v_tps6_id, v_election_id, 'TPS 06', 'Banjar Belega Kanginan', 658, 9, 'pending'),
    (v_tps7_id, v_election_id, 'TPS 07', 'Banjar Jasri', 620, 7, 'pending'),
    (v_tps8_id, v_election_id, 'TPS 08', 'SD N 3 Belega', 635, 11, 'pending'),
    (v_tps9_id, v_election_id, 'TPS 09', 'SD N 3 Belega', 615, 8, 'pending')
    ON CONFLICT (id) DO UPDATE 
    SET code = EXCLUDED.code, 
        banjar_name = EXCLUDED.banjar_name, 
        registered_voters = EXCLUDED.registered_voters,
        additional_voters = EXCLUDED.additional_voters;

    -- 4. Inisialisasi Suara (0) untuk seluruh 9 TPS
    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes) VALUES
    (v_tps1_id, v_cand1_id, 0), (v_tps1_id, v_cand2_id, 0),
    (v_tps2_id, v_cand1_id, 0), (v_tps2_id, v_cand2_id, 0),
    (v_tps3_id, v_cand1_id, 0), (v_tps3_id, v_cand2_id, 0),
    (v_tps4_id, v_cand1_id, 0), (v_tps4_id, v_cand2_id, 0),
    (v_tps5_id, v_cand1_id, 0), (v_tps5_id, v_cand2_id, 0),
    (v_tps6_id, v_cand1_id, 0), (v_tps6_id, v_cand2_id, 0),
    (v_tps7_id, v_cand1_id, 0), (v_tps7_id, v_cand2_id, 0),
    (v_tps8_id, v_cand1_id, 0), (v_tps8_id, v_cand2_id, 0),
    (v_tps9_id, v_cand1_id, 0), (v_tps9_id, v_cand2_id, 0)
    ON CONFLICT (polling_station_id, candidate_id) DO NOTHING;

    -- 5. Inisialisasi Suara Tidak Sah (0)
    INSERT INTO public.invalid_votes (polling_station_id, count) VALUES
    (v_tps1_id, 0),
    (v_tps2_id, 0),
    (v_tps3_id, 0),
    (v_tps4_id, 0),
    (v_tps5_id, 0),
    (v_tps6_id, 0),
    (v_tps7_id, 0),
    (v_tps8_id, 0),
    (v_tps9_id, 0)
    ON CONFLICT (polling_station_id) DO NOTHING;

    -- 6. Hubungkan profil pengguna yang sudah terdaftar di auth.users
    -- Admin (Ketua Panitia)
    UPDATE public.profiles
    SET full_name = 'I Gede Ketut (Ketua Panitia)',
        role = 'admin',
        tps_id = NULL
    WHERE email = 'admin@pilkel.belega.id';

    -- Operator TPS 01 s/d 09
    UPDATE public.profiles SET full_name = 'Petugas Banjar Pasdalem', role = 'operator', tps_id = v_tps1_id WHERE email = 'tps01@pilkel.belega.id';
    UPDATE public.profiles SET full_name = 'Petugas Gedung Serba Guna', role = 'operator', tps_id = v_tps2_id WHERE email = 'tps02@pilkel.belega.id';
    UPDATE public.profiles SET full_name = 'Petugas Gedung Serba Guna', role = 'operator', tps_id = v_tps3_id WHERE email = 'tps03@pilkel.belega.id';
    UPDATE public.profiles SET full_name = 'Petugas Banjar Kebon Kelod', role = 'operator', tps_id = v_tps4_id WHERE email = 'tps04@pilkel.belega.id';
    UPDATE public.profiles SET full_name = 'Petugas Banjar Kebon Kaja', role = 'operator', tps_id = v_tps5_id WHERE email = 'tps05@pilkel.belega.id';
    UPDATE public.profiles SET full_name = 'Petugas Banjar Belega Kanginan', role = 'operator', tps_id = v_tps6_id WHERE email = 'tps06@pilkel.belega.id';
    UPDATE public.profiles SET full_name = 'Petugas Banjar Jasri', role = 'operator', tps_id = v_tps7_id WHERE email = 'tps07@pilkel.belega.id';
    UPDATE public.profiles SET full_name = 'Petugas SD N 3 Belega (TPS 08)', role = 'operator', tps_id = v_tps8_id WHERE email = 'tps08@pilkel.belega.id';
    UPDATE public.profiles SET full_name = 'Petugas SD N 3 Belega (TPS 09)', role = 'operator', tps_id = v_tps9_id WHERE email = 'tps09@pilkel.belega.id';

END $$;
