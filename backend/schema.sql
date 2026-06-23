-- Survey Platform Schema
-- Run once against Supabase PostgreSQL

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Organizations ───────────────────────────────────────────────
create table if not exists organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  logo_url    text,
  created_at  timestamptz default now()
);

-- ─── Profiles (extends Supabase auth.users) ──────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid references organizations(id) on delete set null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at  timestamptz default now()
);

-- ─── Surveys ─────────────────────────────────────────────────────
create table if not exists surveys (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references organizations(id) on delete cascade,
  created_by      uuid references profiles(id) on delete set null,
  title           text not null,
  description     text,
  status          text not null default 'draft' check (status in ('draft','active','paused','closed')),
  mode            text not null default 'classic' check (mode in ('classic','conversational')),
  close_date      timestamptz,
  response_limit  int,
  is_ai_generated boolean default false,
  settings        jsonb default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── Questions ───────────────────────────────────────────────────
create table if not exists questions (
  id            uuid primary key default uuid_generate_v4(),
  survey_id     uuid not null references surveys(id) on delete cascade,
  parent_id     uuid references questions(id) on delete set null,
  type          text not null check (type in (
                  'single_choice','multi_select','dropdown','short_text','long_text',
                  'rating','nps','likert_matrix','yes_no','ranking','date_time',
                  'contact','demographic','slider','image_choice','file_upload',
                  'statement','constant_sum'
                )),
  title         text not null,
  description   text,
  required      boolean default false,
  position      int not null default 0,
  settings      jsonb default '{}',
  created_at    timestamptz default now()
);

-- ─── Question Options ─────────────────────────────────────────────
create table if not exists question_options (
  id          uuid primary key default uuid_generate_v4(),
  question_id uuid not null references questions(id) on delete cascade,
  label       text not null,
  value       text,
  position    int not null default 0,
  image_url   text
);

-- ─── Survey Logic (skip/branch/piping) ───────────────────────────
create table if not exists survey_logic (
  id              uuid primary key default uuid_generate_v4(),
  survey_id       uuid not null references surveys(id) on delete cascade,
  source_question uuid not null references questions(id) on delete cascade,
  target_question uuid references questions(id) on delete cascade,
  condition       jsonb not null default '{}',
  action          text not null check (action in ('skip','show','hide','end_survey','redirect')),
  position        int default 0
);

-- ─── Distributions ───────────────────────────────────────────────
create table if not exists distributions (
  id          uuid primary key default uuid_generate_v4(),
  survey_id   uuid not null references surveys(id) on delete cascade,
  channel     text not null check (channel in ('link','embed','email','qr')),
  slug        text unique,
  settings    jsonb default '{}',
  created_at  timestamptz default now()
);

-- ─── Responses ───────────────────────────────────────────────────
create table if not exists responses (
  id              uuid primary key default uuid_generate_v4(),
  survey_id       uuid not null references surveys(id) on delete cascade,
  distribution_id uuid references distributions(id) on delete set null,
  respondent_id   text,
  status          text not null default 'partial' check (status in ('partial','complete','disqualified')),
  started_at      timestamptz default now(),
  completed_at    timestamptz,
  metadata        jsonb default '{}'
);

-- ─── Answers ─────────────────────────────────────────────────────
create table if not exists answers (
  id          uuid primary key default uuid_generate_v4(),
  response_id uuid not null references responses(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  value       jsonb not null default '{}',
  created_at  timestamptz default now()
);

-- ─── AI Analysis Results ─────────────────────────────────────────
create table if not exists ai_analysis (
  id          uuid primary key default uuid_generate_v4(),
  survey_id   uuid not null references surveys(id) on delete cascade,
  type        text not null check (type in ('sentiment','themes','verdict','summary')),
  result      jsonb not null default '{}',
  created_at  timestamptz default now()
);

-- ─── Templates ───────────────────────────────────────────────────
create table if not exists templates (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  category    text not null,
  description text,
  structure   jsonb not null default '{}',
  is_public   boolean default true,
  created_at  timestamptz default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────
create index if not exists idx_surveys_org       on surveys(org_id);
create index if not exists idx_questions_survey  on questions(survey_id);
create index if not exists idx_responses_survey  on responses(survey_id);
create index if not exists idx_answers_response  on answers(response_id);
create index if not exists idx_answers_question  on answers(question_id);

-- ─── Updated_at trigger ──────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_surveys_updated_at on surveys;
create trigger trg_surveys_updated_at
  before update on surveys
  for each row execute function update_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────
alter table organizations  enable row level security;
alter table profiles        enable row level security;
alter table surveys         enable row level security;
alter table questions       enable row level security;
alter table question_options enable row level security;
alter table survey_logic    enable row level security;
alter table distributions   enable row level security;
alter table responses       enable row level security;
alter table answers         enable row level security;
alter table ai_analysis     enable row level security;
alter table templates       enable row level security;
