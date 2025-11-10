-- Add overlay_image column to store canvas visualization
ALTER TABLE inspections ADD COLUMN overlay_image TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at DESC);
