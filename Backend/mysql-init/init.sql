-- Tạo các database riêng cho từng service
CREATE DATABASE IF NOT EXISTS db_identity;
CREATE DATABASE IF NOT EXISTS db_patient;
CREATE DATABASE IF NOT EXISTS db_doctor;
CREATE DATABASE IF NOT EXISTS db_pharmacist;
CREATE DATABASE IF NOT EXISTS db_nurse;
CREATE DATABASE IF NOT EXISTS db_lab;
CREATE DATABASE IF NOT EXISTS db_medical_records;
CREATE DATABASE IF NOT EXISTS db_prescription;
CREATE DATABASE IF NOT EXISTS db_admin;

-- Cấp quyền cho user healthcare trên tất cả database
GRANT ALL PRIVILEGES ON db_identity.* TO 'healthcare'@'%';
GRANT ALL PRIVILEGES ON db_patient.* TO 'healthcare'@'%';
GRANT ALL PRIVILEGES ON db_doctor.* TO 'healthcare'@'%';
GRANT ALL PRIVILEGES ON db_pharmacist.* TO 'healthcare'@'%';
GRANT ALL PRIVILEGES ON db_nurse.* TO 'healthcare'@'%';
GRANT ALL PRIVILEGES ON db_lab.* TO 'healthcare'@'%';
GRANT ALL PRIVILEGES ON db_medical_records.* TO 'healthcare'@'%';
GRANT ALL PRIVILEGES ON db_prescription.* TO 'healthcare'@'%';
GRANT ALL PRIVILEGES ON db_admin.* TO 'healthcare'@'%';

FLUSH PRIVILEGES;