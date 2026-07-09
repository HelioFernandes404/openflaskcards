-- Normalize existing emails to lowercase and enforce case-insensitive
-- uniqueness at the database layer, matching the app-level normalization in
-- auth.Register/Login. If two existing rows already differ only by case
-- (a pre-existing duplicate mailbox), this migration fails on the unique
-- index creation below instead of silently merging or dropping either
-- account — that needs a manual resolution, not an automatic one.
UPDATE users SET email = LOWER(TRIM(email)) WHERE email <> LOWER(TRIM(email));

DROP INDEX ix_users_email;
CREATE UNIQUE INDEX ix_users_email ON users (LOWER(email));
