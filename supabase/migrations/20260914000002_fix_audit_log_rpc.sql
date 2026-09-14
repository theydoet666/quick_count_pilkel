-- ============================================================================
-- MIGRATION: 20260914000002_fix_audit_log_rpc.sql
-- PURPOSE: Provide secure server-side RPC for inserting audit log records
--          with actor_id enforced from auth.uid()
-- ============================================================================

-- 1. Create log_audit_event function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id UUID,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_log_id UUID;
BEGIN
    -- Enforce authentication: Never trust actor_id from client, use server auth.uid()
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Pengguna harus login untuk mencatat jejak audit (audit log)';
    END IF;

    -- Insert audit log record
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        table_name,
        record_id,
        old_value,
        new_value,
        created_at
    ) VALUES (
        v_actor_id,
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
$$;

-- 2. Grant execution permission to authenticated users
REVOKE EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB) TO authenticated;
