-- Migration 010: get_writer_info

CREATE OR REPLACE FUNCTION get_writer_info_by_email(p_email text)
RETURNS TABLE (
    full_name text,
    pen_name text,
    whatsapp text,
    bio text,
    social_media_link text
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.full_name,
        w.pen_name,
        w.whatsapp,
        w.bio,
        w.social_media_link
    FROM writers w
    WHERE lower(w.email) = lower(p_email)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant access to anonymous users (public submission form)
GRANT EXECUTE ON FUNCTION get_writer_info_by_email(text) TO anon;
