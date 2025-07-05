-- EdTech Platform Database Schema
-- Multi-tenant educational platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'parent');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE message_type AS ENUM ('text', 'announcement', 'notification', 'system');
CREATE TYPE message_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Tenants table (schools/organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
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
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, tenant_id)
);

-- User sessions for refresh tokens
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset'
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student verification requests
CREATE TABLE student_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    verification_status verification_status DEFAULT 'pending',
    request_notes TEXT,
    approval_notes TEXT,
    rejection_reason TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES users(id)
);

-- Classes table
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

-- Class enrollments
CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    UNIQUE(class_id, student_id)
);

-- Attendance sessions
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

-- Attendance records
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(50), -- 'qr', 'manual', 'gps'
    location_data JSONB,
    remarks TEXT,
    marked_by UUID REFERENCES users(id)
);

-- Messages table
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

-- Notifications table
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

-- Learning content table
CREATE TABLE learning_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    grade_level INTEGER,
    content_type VARCHAR(50), -- 'video', 'image', 'text', 'interactive'
    content_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning progress table
CREATE TABLE learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES learning_content(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, content_id)
);

-- Content feedback table
CREATE TABLE content_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES learning_content(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '[]',
    rate_limit_per_minute INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security logs table
CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_student_verifications_student_id ON student_verifications(student_id);
CREATE INDEX idx_student_verifications_status ON student_verifications(verification_status);
CREATE INDEX idx_classes_tenant_id ON classes(tenant_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_learning_content_subject ON learning_content(subject);
CREATE INDEX idx_learning_content_grade_level ON learning_content(grade_level);
CREATE INDEX idx_learning_progress_student_id ON learning_progress(student_id);
CREATE INDEX idx_learning_progress_content_id ON learning_progress(content_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_content_updated_at BEFORE UPDATE ON learning_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON learning_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default tenant
INSERT INTO tenants (id, name, domain, email) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Default School',
    'default.school.com',
    'admin@default.school.com'
);

-- Insert default admin user
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@default.school.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge', -- password: AdminPass123!
    'System',
    'Administrator',
    'admin',
    true,
    true
);

-- Add missing column
ALTER TABLE tenants ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Update existing records
UPDATE tenants SET is_active = true WHERE is_active IS NULL;

-- Verify it worked
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'tenants' AND column_name = 'is_active';
