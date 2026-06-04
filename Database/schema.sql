CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(500) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ReadOnly',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    description TEXT,
    date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS IX_tags_created_by ON tags(created_by);
CREATE INDEX IF NOT EXISTS IX_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS IX_refresh_tokens_token ON refresh_tokens(token);

-- Seed users (password: Password123!)
INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin',  'admin@tagsapp.com',  '$2b$11$tNtR.pgXLIeHIJ28yKb/we2FsThqDGAbzrwtCc2P4Dprmz6g4lV9S', 'FullAccess', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'reader', 'reader@tagsapp.com', '$2b$11$tNtR.pgXLIeHIJ28yKb/we2FsThqDGAbzrwtCc2P4Dprmz6g4lV9S', 'ReadOnly',   NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Seed sample tags
INSERT INTO tags (name, color, description, date_created, updated_at, is_deleted) VALUES
    ('Bug',           '#FF5733', 'Bug tracking tag',     NOW(), NOW(), FALSE),
    ('Feature',       '#33A1FF', 'New feature requests', NOW(), NOW(), FALSE),
    ('Urgent',        '#FF0000', 'Urgent tasks',         NOW(), NOW(), FALSE),
    ('Documentation', '#28A745', 'Documentation tasks',  NOW(), NOW(), FALSE)
ON CONFLICT DO NOTHING;

-- Pre-register the EF Core migration so it does not try to re-run it
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" VARCHAR(150) NOT NULL,
    "ProductVersion" VARCHAR(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20240101000000_InitialCreate', '8.0.11')
ON CONFLICT DO NOTHING;
