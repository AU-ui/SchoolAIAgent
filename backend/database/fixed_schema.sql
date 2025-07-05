-- EdTech Platform - Fixed Database Schema
-- Run this to create the correct tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'parent', 'student');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE fee_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'online');
CREATE TYPE report_type AS ENUM ('academic', 'behavioral', 'attendance', 'financial');
CREATE TYPE language_code AS ENUM ('en', 'es', 'fr', 'de', 'ar', 'hi', 'zh');

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(email, tenant_id)
);

-- Create verification_tokens table
CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create classes table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    grade_level VARCHAR(20),
    academic_year VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create attendance_sessions table
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id),
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create attendance_records table
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES attendance_sessions(id),
    student_id UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL, -- present, absent, late, excused
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    due_date TIMESTAMP,
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    sender_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default tenant
INSERT INTO tenants (id, name, domain, is_active) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Default School', 'default.school.com', true);

-- Insert default admin user
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified) 
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'admin@demoschool.com', crypt('admin123', gen_salt('bf')), 'Admin', 'User', 'admin', true, true);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token);
CREATE INDEX idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_notifications_user ON notifications(user_id); 