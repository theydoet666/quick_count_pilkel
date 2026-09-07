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

    -- Insert Polling Stations (6 TPS)
    INSERT INTO public.polling_stations (id, election_id, code, banjar_name, registered_voters, status)
    VALUES 
    (v_tps1_id, v_election_id, 'TPS 01', 'Balai Banjar Belega Kangin', 640, 'verified'),
    (v_tps2_id, v_election_id, 'TPS 02', 'Balai Banjar Belega Kauh', 610, 'verified'),
    (v_tps3_id, v_election_id, 'TPS 03', 'Balai Banjar Belega Tengah', 680, 'verified'),
    (v_tps4_id, v_election_id, 'TPS 04', 'Balai Banjar Kebon', 590, 'verified'),
    (v_tps5_id, v_election_id, 'TPS 05', 'Balai Banjar Jasri', 650, 'verified'),
    (v_tps6_id, v_election_id, 'TPS 06', 'Balai Banjar Selat', 658, 'verified')
    ON CONFLICT (id) DO NOTHING;

    -- Insert Sample Vote Results per TPS
    -- TPS 01 (580 Suara Sah: 348 vs 232)
    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes) VALUES
    (v_tps1_id, v_cand1_id, 348),
    (v_tps1_id, v_cand2_id, 232)
    ON CONFLICT (polling_station_id, candidate_id) DO UPDATE SET votes = EXCLUDED.votes;

    -- TPS 02 (545 Suara Sah: 310 vs 235)
    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes) VALUES
    (v_tps2_id, v_cand1_id, 310),
    (v_tps2_id, v_cand2_id, 235)
    ON CONFLICT (polling_station_id, candidate_id) DO UPDATE SET votes = EXCLUDED.votes;

    -- TPS 03 (612 Suara Sah: 355 vs 257)
    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes) VALUES
    (v_tps3_id, v_cand1_id, 355),
    (v_tps3_id, v_cand2_id, 257)
    ON CONFLICT (polling_station_id, candidate_id) DO UPDATE SET votes = EXCLUDED.votes;

    -- TPS 04 (518 Suara Sah: 220 vs 298)
    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes) VALUES
    (v_tps4_id, v_cand1_id, 220),
    (v_tps4_id, v_cand2_id, 298)
    ON CONFLICT (polling_station_id, candidate_id) DO UPDATE SET votes = EXCLUDED.votes;

    -- TPS 05 (576 Suara Sah: 334 vs 242)
    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes) VALUES
    (v_tps5_id, v_cand1_id, 334),
    (v_tps5_id, v_cand2_id, 242)
    ON CONFLICT (polling_station_id, candidate_id) DO UPDATE SET votes = EXCLUDED.votes;

    -- TPS 06 (530 Suara Sah: 275 vs 255)
    INSERT INTO public.vote_results (polling_station_id, candidate_id, votes) VALUES
    (v_tps6_id, v_cand1_id, 275),
    (v_tps6_id, v_cand2_id, 255)
    ON CONFLICT (polling_station_id, candidate_id) DO UPDATE SET votes = EXCLUDED.votes;

    -- Insert Invalid Votes per TPS
    INSERT INTO public.invalid_votes (polling_station_id, count) VALUES
    (v_tps1_id, 12),
    (v_tps2_id, 10),
    (v_tps3_id, 15),
    (v_tps4_id, 8),
    (v_tps5_id, 9),
    (v_tps6_id, 8)
    ON CONFLICT (polling_station_id) DO UPDATE SET count = EXCLUDED.count;

END $$;
