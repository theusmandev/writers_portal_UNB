CREATE TABLE site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  submissions_paused boolean NOT NULL DEFAULT false,
  pause_message text,
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the settings
CREATE POLICY "Anyone can read site settings" ON site_settings
  FOR SELECT USING (true);

-- Allow authenticated admins to update
CREATE POLICY "Admins can update site settings" ON site_settings
  FOR UPDATE USING (auth.role() = 'authenticated');
  
-- Allow authenticated admins to insert (for initial setup)
CREATE POLICY "Admins can insert site settings" ON site_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default row
INSERT INTO site_settings (id, submissions_paused, pause_message) 
VALUES (1, false, 'We are temporarily not accepting new submissions while we clear our backlog. Please check back soon.');
