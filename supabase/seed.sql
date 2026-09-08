-- Seed data for Pemilihan Perbekel Desa Belega 2026

DO $$
DECLARE
    v_election_id UUID := '00000000-0000-0000-0000-000000000001';
    v_cand1_id UUID := '11111111-1111-1111-1111-111111111111';
    v_cand2_id UUID := '22222222-2222-2222-2222-222222222222';
    
    v_tps1_id UUID := 'a1111111-1111-1111-1111-111111111111';
    v_tps2_id UUID := 'a2222222-2222-2222-2222-222222222222';
    v_tps3_id UUID := 'a3333333-3333-3333-3333-333333333333';
    v_tps4_id UUID := 'a4444444-4444-4444-4444-444444444444';
    v_tps5_id UUID := 'a5555555-5555-5555-5555-555555555555';
    v_tps6_id UUID := 'a6666666-6666-6666-6666-666666666666';
BEGIN
    -- Insert Election
    INSERT INTO public.elections (id, name, location, status)
    VALUES (
        v_election_id, 
        'Pemilihan Perbekel Desa Belega 2026', 
        'Kecamatan Blahbatuh, Kabupaten Gianyar', 
        'live'
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert Candidates
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
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert Polling Stations (6 TPS) in clean pending state
    INSERT INTO public.polling_stations (id, election_id, code, banjar_name, registered_voters, status)
    VALUES 
    (v_tps1_id, v_election_id, 'TPS 01', 'Balai Banjar Belega Kangin', 640, 'pending'),
    (v_tps2_id, v_election_id, 'TPS 02', 'Balai Banjar Belega Kauh', 610, 'pending'),
    (v_tps3_id, v_election_id, 'TPS 03', 'Balai Banjar Belega Tengah', 680, 'pending'),
    (v_tps4_id, v_election_id, 'TPS 04', 'Balai Banjar Kebon', 590, 'pending'),
    (v_tps5_id, v_election_id, 'TPS 05', 'Balai Banjar Jasri', 650, 'pending'),
    (v_tps6_id, v_election_id, 'TPS 06', 'Balai Banjar Selat', 658, 'pending')
    ON CONFLICT (id) DO NOTHING;

    -- Initial 0 vote counts per TPS
    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes) VALUES
    (v_tps1_id, v_cand1_id, 0), (v_tps1_id, v_cand2_id, 0),
    (v_tps2_id, v_cand1_id, 0), (v_tps2_id, v_cand2_id, 0),
    (v_tps3_id, v_cand1_id, 0), (v_tps3_id, v_cand2_id, 0),
    (v_tps4_id, v_cand1_id, 0), (v_tps4_id, v_cand2_id, 0),
    (v_tps5_id, v_cand1_id, 0), (v_tps5_id, v_cand2_id, 0),
    (v_tps6_id, v_cand1_id, 0), (v_tps6_id, v_cand2_id, 0)
    ON CONFLICT (polling_station_id, candidate_id) DO NOTHING;

    -- Initial 0 invalid votes
    INSERT INTO public.invalid_votes (polling_station_id, count) VALUES
    (v_tps1_id, 0),
    (v_tps2_id, 0),
    (v_tps3_id, 0),
    (v_tps4_id, 0),
    (v_tps5_id, 0),
    (v_tps6_id, 0)
    ON CONFLICT (polling_station_id) DO NOTHING;

    -- Initial Officers
    INSERT INTO public.profiles (full_name, email, phone, role, tps_id) VALUES
    ('Ni Wayan Sari (Petugas TPS 01)', 'tps01@pilkel.belega.id', '081234567801', 'operator', v_tps1_id),
    ('I Made Sukerta (Petugas TPS 02)', 'tps02@pilkel.belega.id', '081234567802', 'operator', v_tps2_id),
    ('I Ketut Suweta (Petugas TPS 03)', 'tps03@pilkel.belega.id', '081234567803', 'operator', v_tps3_id),
    ('Ni Nyoman Rai (Petugas TPS 04)', 'tps04@pilkel.belega.id', '081234567804', 'operator', v_tps4_id),
    ('I Wayan Budiana (Petugas TPS 05)', 'tps05@pilkel.belega.id', '081234567805', 'operator', v_tps5_id),
    ('Ni Ketut Yanti (Petugas TPS 06)', 'tps06@pilkel.belega.id', '081234567806', 'operator', v_tps6_id)
    ON CONFLICT (email) DO NOTHING;

END $$;
