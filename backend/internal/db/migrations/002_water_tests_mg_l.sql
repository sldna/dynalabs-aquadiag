-- Sprechende Spaltennamen: Messwerte in mg/l (früher *_ppm, Werte unverändert).

ALTER TABLE water_tests RENAME COLUMN nitrite_ppm TO nitrite_mg_l;
ALTER TABLE water_tests RENAME COLUMN nitrate_ppm TO nitrate_mg_l;
ALTER TABLE water_tests RENAME COLUMN ammonia_ppm TO ammonium_mg_l;
ALTER TABLE water_tests RENAME COLUMN co2_ppm TO co2_mg_l;
