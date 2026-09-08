-- Fiktiv testdata. Lösenordet för samtliga användare är "password123"
-- (samma bcrypt-hash, 10 rounds, som tidigare användes i server/src/data/users.js).

INSERT INTO patients (name) VALUES
  ('Anna Andersson'),
  ('Bertil Berg');

INSERT INTO users (username, name, password_hash, role, patient_id) VALUES
  ('doctor1', 'Test Doctor', '$2b$10$6GSgG6MeWIHQ6e2o8RQLBe9E0G9ewMHD0SLbdjbEPEc4r/Q9HM4rO', 'DOCTOR', NULL),
  ('nurse1', 'Test Nurse', '$2b$10$6GSgG6MeWIHQ6e2o8RQLBe9E0G9ewMHD0SLbdjbEPEc4r/Q9HM4rO', 'NURSE', NULL),
  ('carecenter1', 'Test Care Center', '$2b$10$6GSgG6MeWIHQ6e2o8RQLBe9E0G9ewMHD0SLbdjbEPEc4r/Q9HM4rO', 'CARE_CENTER', NULL),
  ('patient1', 'Anna Andersson', '$2b$10$6GSgG6MeWIHQ6e2o8RQLBe9E0G9ewMHD0SLbdjbEPEc4r/Q9HM4rO', 'PATIENT', 1);
