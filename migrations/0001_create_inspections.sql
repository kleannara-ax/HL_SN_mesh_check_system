-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  total_holes INTEGER NOT NULL DEFAULT 0,
  cleaned_holes INTEGER NOT NULL DEFAULT 0,
  blocked_holes INTEGER NOT NULL DEFAULT 0,
  total_area INTEGER NOT NULL DEFAULT 0,
  cleaned_area INTEGER NOT NULL DEFAULT 0,
  blocked_area INTEGER NOT NULL DEFAULT 0,
  missed_area INTEGER NOT NULL DEFAULT 0,
  cleaning_rate_area REAL NOT NULL DEFAULT 0.0,
  cleaning_rate_count REAL NOT NULL DEFAULT 0.0,
  threshold_dark INTEGER,
  threshold_gray INTEGER,
  threshold_area INTEGER,
  manual_edits_count INTEGER DEFAULT 0,
  roi_x INTEGER,
  roi_y INTEGER,
  roi_width INTEGER,
  roi_height INTEGER,
  virtual_holes_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at DESC);

-- Create index on title for search
CREATE INDEX IF NOT EXISTS idx_inspections_title ON inspections(title);
