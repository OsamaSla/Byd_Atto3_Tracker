/*
  # Add Battery Calibration Fields

  Add new fields to user_settings table for precise battery tracking:
  - `battery_size_kwh` - User-entered actual battery size from calibration
  - `obd_soh_reference` - OBD scanner SOH reading for hardware alignment

  These fields enable accurate State of Health calculations that match 
  the vehicle's hardware diagnostics.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'battery_size_kwh'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN battery_size_kwh numeric(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'obd_soh_reference'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN obd_soh_reference numeric(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'last_calibration_date'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN last_calibration_date timestamptz;
  END IF;
END $$;