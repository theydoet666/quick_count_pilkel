-- Migration to add additional_voters to polling_stations
ALTER TABLE public.polling_stations 
ADD COLUMN IF NOT EXISTS additional_voters INT NOT NULL DEFAULT 0;

-- Optional: re-create RPC function if using get_tps_recap or get_election_summary
CREATE OR REPLACE FUNCTION public.get_election_summary(p_election_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_tps INT;
    v_verified_tps INT;
    v_total_dpt INT;
    v_total_additional_dpt INT;
    v_total_valid_votes INT;
    v_total_invalid_votes INT;
    v_total_votes_entered INT;
    v_participation_rate NUMERIC;
    v_candidates JSONB;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(registered_voters), 0), COALESCE(SUM(additional_voters), 0)
    INTO v_total_tps, v_total_dpt, v_total_additional_dpt
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

    v_total_votes_entered := v_total_valid_votes + v_total_invalid_votes;

    IF (v_total_dpt + v_total_additional_dpt) > 0 THEN
        v_participation_rate := ROUND((v_total_votes_entered::NUMERIC / (v_total_dpt + v_total_additional_dpt)::NUMERIC) * 100, 1);
    ELSE
        v_participation_rate := 0;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'number', c.number,
            'name', c.name,
            'vice_name', c.vice_name,
            'photo_url', c.photo_url,
            'color_hex', c.color_hex,
            'total_votes', COALESCE(cand_votes.total_votes, 0),
            'percentage', CASE 
                WHEN v_total_valid_votes > 0 THEN ROUND((COALESCE(cand_votes.total_votes, 0)::NUMERIC / v_total_valid_votes::NUMERIC) * 100, 1)
                ELSE 0 
            END,
            'banjar_leading_count', COALESCE(leading_counts.leading_count, 0)
        ) ORDER BY c.number ASC
    ), '[]'::jsonb)
    INTO v_candidates
    FROM public.candidates c
    LEFT JOIN (
        SELECT vr.candidate_id, SUM(vr.votes) as total_votes
        FROM public.vote_results vr
        JOIN public.polling_stations ps ON ps.id = vr.polling_station_id
        WHERE ps.election_id = p_election_id AND ps.status IN ('verified', 'locked')
        GROUP BY vr.candidate_id
    ) cand_votes ON cand_votes.candidate_id = c.id
    LEFT JOIN (
        SELECT winner_id, COUNT(*) as leading_count
        FROM (
            SELECT DISTINCT ON (vr.polling_station_id) vr.candidate_id as winner_id
            FROM public.vote_results vr
            JOIN public.polling_stations ps ON ps.id = vr.polling_station_id
            WHERE ps.election_id = p_election_id AND ps.status IN ('verified', 'locked')
            ORDER BY vr.polling_station_id, vr.votes DESC
        ) ranked_winners
        GROUP BY winner_id
    ) leading_counts ON leading_counts.winner_id = c.id
    WHERE c.election_id = p_election_id;

    RETURN jsonb_build_object(
        'total_tps', v_total_tps,
        'verified_tps', v_verified_tps,
        'total_dpt', v_total_dpt,
        'total_additional_dpt', v_total_additional_dpt,
        'total_valid_votes', v_total_valid_votes,
        'total_invalid_votes', v_total_invalid_votes,
        'total_votes_entered', v_total_votes_entered,
        'participation_rate', v_participation_rate,
        'candidates', v_candidates
    );
END;
$$;

-- 2. Update RPC get_tps_recap to include additional_voters
CREATE OR REPLACE FUNCTION public.get_tps_recap(p_election_id UUID)
RETURNS TABLE (
    polling_station_id UUID,
    code TEXT,
    banjar_name TEXT,
    registered_voters INT,
    additional_voters INT,
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
        COALESCE(ps.additional_voters, 0)::INT as additional_voters,
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
    WHERE ps.election_id = p_election_id;
$$;
