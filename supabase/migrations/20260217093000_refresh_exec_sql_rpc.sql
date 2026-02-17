BEGIN;

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  rows jsonb := '[]'::jsonb;
  statement text := btrim(sql);
BEGIN
  IF statement IS NULL OR statement = '' THEN
    RETURN '[]'::jsonb;
  END IF;

  IF statement ~* '^(insert|update|delete|create|alter|drop|truncate|grant|revoke|comment|refresh|analyze|vacuum)'
     AND statement !~* '\breturning\b' THEN
    EXECUTE statement;
    RETURN '[]'::jsonb;
  END IF;

  FOR rec IN EXECUTE statement LOOP
    rows := rows || jsonb_build_array(to_jsonb(rec));
  END LOOP;

  RETURN rows;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO postgres;
NOTIFY pgrst, 'reload schema';

COMMIT;
