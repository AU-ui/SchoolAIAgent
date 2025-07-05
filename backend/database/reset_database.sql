-- EdTech Platform - Reset Database Script
-- Run this in PostgreSQL CLI to drop everything and recreate

-- =====================================================
-- DROP ALL EXISTING TABLES (in correct order)
-- =====================================================

-- Drop tables that depend on other tables first
DROP TABLE IF EXISTS learning_analytics CASCADE;
DROP TABLE IF EXISTS content_recommendations CASCADE;
DROP TABLE IF EXISTS parent_engagement_analytics CASCADE;
DROP TABLE IF EXISTS syllabus_analysis CASCADE;
DROP TABLE IF EXISTS learning_paths CASCADE;
DROP TABLE IF EXISTS safety_reports CASCADE;
DROP TABLE IF EXISTS content_feedback CASCADE;
DROP TABLE IF EXISTS generated_reports CASCADE;
DROP TABLE IF EXISTS report_templates CASCADE;
DROP TABLE IF EXISTS learning_sessions CASCADE;
DROP TABLE IF EXISTS learning_progress CASCADE;
DROP TABLE IF EXISTS learning_requests CASCADE;
DROP TABLE IF EXISTS visual_content CASCADE;
DROP TABLE IF EXISTS learning_topics CASCADE;
DROP TABLE IF EXISTS fee_payments CASCADE;
DROP TABLE IF EXISTS student_fees CASCADE;
DROP TABLE IF EXISTS fee_categories CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS class_enrollments CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS student_id_records CASCADE;
DROP TABLE IF EXISTS school_email_domains CASCADE;
DROP TABLE IF EXISTS school_verification_codes CASCADE;
DROP TABLE IF EXISTS student_verification_requests CASCADE;
DROP TABLE IF EXISTS student_verifications CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- =====================================================
-- DROP ALL CUSTOM TYPES
-- =====================================================

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS message_priority CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS fee_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS report_type CASCADE;
DROP TYPE IF EXISTS language_code CASCADE;

-- =====================================================
-- ENABLE EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- This is needed for gen_salt and crypt functions

-- =====================================================
-- CREATE CUSTOM TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'parent');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE message_type AS ENUM ('text', 'announcement', 'notification', 'system', 'fee_reminder', 'report');
CREATE TYPE message_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE fee_status AS ENUM ('pending', 'paid', 'overdue', 'waived', 'partial');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'online', 'check');
CREATE TYPE report_type AS ENUM ('attendance', 'academic', 'behavior', 'fee', 'comprehensive');
CREATE TYPE language_code AS ENUM ('en', 'es', 'fr', 'de', 'ar', 'zh', 'hi', 'ur');

-- =====================================================
-- CREATE CORE TABLES
-- =====================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language language_code DEFAULT 'en',
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    emergency_contact JSONB,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, tenant_id)
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    risk_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES users(id),
    grade_level INTEGER,
    subject VARCHAR(100),
    schedule JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    UNIQUE(class_id, student_id)
);

CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id),
    session_date DATE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    location VARCHAR(255),
    qr_code VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(50),
    location_data JSONB,
    remarks TEXT,
    marked_by UUID REFERENCES users(id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type message_type DEFAULT 'text',
    priority message_priority DEFAULT 'normal',
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INSERT SAMPLE DATA
-- =====================================================

-- Insert sample tenant
INSERT INTO tenants (name, domain) 
VALUES ('Demo School', 'demoschool.com') 
ON CONFLICT (domain) DO NOTHING;

-- Get tenant ID and insert sample users
DO $$
DECLARE
    tenant_uuid UUID;
BEGIN
    SELECT id INTO tenant_uuid FROM tenants WHERE domain = 'demoschool.com';
    
    -- Insert sample users with hashed passwords
    INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) 
    VALUES 
        (tenant_uuid, 'admin@demoschool.com', crypt('admin123', gen_salt('bf')), 'Admin', 'User', 'admin'),
        (tenant_uuid, 'teacher@demoschool.com', crypt('teacher123', gen_salt('bf')), 'John', 'Smith', 'teacher'),
        (tenant_uuid, 'parent@demoschool.com', crypt('parent123', gen_salt('bf')), 'Jane', 'Doe', 'parent'),
        (tenant_uuid, 'student@demoschool.com', crypt('student123', gen_salt('bf')), 'Alex', 'Johnson', 'student')
    ON CONFLICT (email, tenant_id) DO NOTHING;
    
    -- Insert sample class
    INSERT INTO classes (tenant_id, name, description, grade_level, subject) 
    VALUES (tenant_uuid, 'Class 10', 'Mathematics Class', 10, 'Mathematics')
    ON CONFLICT DO NOTHING;
    
END $$;

-- Insert class enrollment
INSERT INTO class_enrollments (class_id, student_id)
SELECT c.id, u.id
FROM classes c, users u
WHERE c.name = 'Class 10' 
AND u.email = 'student@demoschool.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFY SETUP
-- =====================================================

-- Show created tables
SELECT 'Tables created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Show sample data counts
SELECT 'Sample data counts:' as info;
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Tenants', COUNT(*) FROM tenants
UNION ALL
SELECT 'Classes', COUNT(*) FROM classes
UNION ALL
SELECT 'Class Enrollments', COUNT(*) FROM class_enrollments;

SELECT 'Database reset completed successfully!' as status; 