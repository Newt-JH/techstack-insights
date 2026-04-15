-- ============================================================
-- 채용공고 분석 프로젝트 - Supabase 초기 설정
-- Supabase SQL Editor에서 실행
-- ============================================================


-- ============================================================
-- 1. raw_job_postings (원본 채용공고)
-- ============================================================

CREATE TABLE IF NOT EXISTS raw_job_postings (
    id               BIGSERIAL PRIMARY KEY,
    source           VARCHAR(50)  NOT NULL,                        -- 수집 출처 (wanted, programmers 등)
    source_id        VARCHAR(100),                                  -- 원본 사이트 공고 ID
    title            VARCHAR(500) NOT NULL,                        -- 공고 제목
    company          VARCHAR(200),                                  -- 회사명
    position         VARCHAR(200),                                  -- 직군 (프론트엔드, 백엔드 등)
    experience_level VARCHAR(100),                                  -- 경력 요건 (신입, 1~3년 등)
    requirements     TEXT,                                         -- 자격요건 원문
    preferred        TEXT,                                         -- 우대사항 원문
    tech_stack       TEXT,                                         -- 기술스택 원문
    location         VARCHAR(200),                                  -- 근무지
    salary_info      VARCHAR(200),                                  -- 급여 정보
    raw_data         JSONB,                                        -- 원본 JSON 데이터
    crawled_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),          -- 수집 시각
    UNIQUE (source, source_id)
);

-- RLS 비활성화
ALTER TABLE raw_job_postings DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_raw_job_postings_source          ON raw_job_postings (source);
CREATE INDEX IF NOT EXISTS idx_raw_job_postings_position        ON raw_job_postings (position);
CREATE INDEX IF NOT EXISTS idx_raw_job_postings_experience_level ON raw_job_postings (experience_level);
CREATE INDEX IF NOT EXISTS idx_raw_job_postings_crawled_at      ON raw_job_postings (crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_job_postings_raw_data        ON raw_job_postings USING GIN (raw_data);


-- ============================================================
-- 2. keyword_mappings (동의어 매핑)
-- ============================================================

CREATE TABLE IF NOT EXISTS keyword_mappings (
    id         BIGSERIAL    PRIMARY KEY,
    canonical  VARCHAR(100) NOT NULL UNIQUE,                       -- 대표어
    variants   JSONB        NOT NULL DEFAULT '[]',                 -- 변형어 배열 (예: ["JS", "javascript"])
    category   VARCHAR(50),                                        -- 분류 (skill, cert, tool, framework)
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- RLS 비활성화
ALTER TABLE keyword_mappings DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_keyword_mappings_category ON keyword_mappings (category);
CREATE INDEX IF NOT EXISTS idx_keyword_mappings_variants ON keyword_mappings USING GIN (variants);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_keyword_mappings_updated_at
    BEFORE UPDATE ON keyword_mappings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 3. skill_analysis (분석 결과)
-- ============================================================

CREATE TABLE IF NOT EXISTS skill_analysis (
    id             BIGSERIAL     PRIMARY KEY,
    position_type  VARCHAR(100),                                   -- 직군 (프론트엔드, 백엔드 등)
    keyword        VARCHAR(100)  NOT NULL,                         -- 분석 키워드
    total_count    INTEGER       NOT NULL DEFAULT 0,               -- 전체 언급 수
    required_count INTEGER       NOT NULL DEFAULT 0,               -- 자격요건 내 언급 수
    preferred_count INTEGER      NOT NULL DEFAULT 0,               -- 우대사항 내 언급 수
    percentage     DECIMAL(5, 2),                                  -- 전체 공고 대비 비율 (%)
    target         VARCHAR(20),                                    -- 대상 경력 (junior, senior, all)
    analyzed_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()            -- 분석 시각
);

-- RLS 비활성화
ALTER TABLE skill_analysis DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_skill_analysis_position_type ON skill_analysis (position_type);
CREATE INDEX IF NOT EXISTS idx_skill_analysis_keyword       ON skill_analysis (keyword);
CREATE INDEX IF NOT EXISTS idx_skill_analysis_target        ON skill_analysis (target);
CREATE INDEX IF NOT EXISTS idx_skill_analysis_analyzed_at   ON skill_analysis (analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_analysis_percentage    ON skill_analysis (percentage DESC NULLS LAST);
