-- Optional PO4/Fe quick-test values for standalone water-test logging.
ALTER TABLE water_tests ADD COLUMN phosphate_po4 REAL;
ALTER TABLE water_tests ADD COLUMN iron_fe REAL;
