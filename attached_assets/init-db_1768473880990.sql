-- ================================
-- YouthSchool MVP - Database Initialization
-- PostgreSQL 16
-- ================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    school_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'teacher',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 템플릿 테이블
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 생성된 문서 테이블
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    template_id UUID REFERENCES templates(id),
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    input_data JSONB,
    generated_content TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    api_tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_documents_user_id ON generated_documents(user_id);
CREATE INDEX idx_documents_created_at ON generated_documents(created_at DESC);

-- 기본 템플릿 삽입
INSERT INTO templates (name, description, category, file_path, is_default) VALUES
('가정통신문', '초중고 가정통신문 기본 양식', 'communication', '/templates/가정통신문.hwp', true),
('외부 교육 용역 계획서', '비즈쿨 외부 교육 용역 계획서', 'business', '/templates/외부교육용역계획서.hwp', true)
ON CONFLICT DO NOTHING;

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS '사용자 정보';
COMMENT ON TABLE templates IS 'HWP 템플릿 정보';
COMMENT ON TABLE generated_documents IS '생성된 문서 이력';
