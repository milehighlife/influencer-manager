BEGIN;

ALTER TABLE users
ADD COLUMN password_hash TEXT;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_organization_id_email_key;

CREATE UNIQUE INDEX users_email_key
  ON users (email);

COMMIT;
