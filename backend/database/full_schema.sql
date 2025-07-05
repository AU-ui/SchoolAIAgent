-- =====================================================
-- EdTech Platform - Complete Database Schema
-- Multi-tenant educational platform with comprehensive features
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For GIN indexes

-- =====================================================
-- CUSTOM TYPES
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
-- CORE TENANT AND USER MANAGEMENT
-- =====================================================

-- Tenants table (schools/organizations)
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
    type VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset', 'phone_verification'
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys for external integrations
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

-- Security logs for audit trail
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

-- =====================================================
-- STUDENT VERIFICATION SYSTEM
-- =====================================================

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

-- Student verification requests (detailed)
CREATE TABLE student_verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_email VARCHAR(255) NOT NULL,
    student_first_name VARCHAR(100) NOT NULL,
    student_last_name VARCHAR(100) NOT NULL,
    tenant_id UUID NOT NULL,
    phone VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    verification_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    rejected_by UUID,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- School verification codes
CREATE TABLE school_verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    used_by UUID,
    used_at TIMESTAMP WITH TIME ZONE
);

-- School email domains
CREATE TABLE school_email_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, domain)
);

-- Student ID records
CREATE TABLE student_id_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    grade_level INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, student_id)
);

-- =====================================================
-- CLASS AND COURSE MANAGEMENT
-- =====================================================

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
    max_students INTEGER,
    current_students INTEGER DEFAULT 0,
    academic_year VARCHAR(20),
    semester VARCHAR(20),
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
    grade VARCHAR(10),
    notes TEXT,
    UNIQUE(class_id, student_id)
);

-- =====================================================
-- ATTENDANCE SYSTEM
-- =====================================================

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
    method VARCHAR(50), -- 'qr', 'manual', 'gps', 'facial'
    location_data JSONB,
    remarks TEXT,
    marked_by UUID REFERENCES users(id)
);

-- =====================================================
-- COMMUNICATION SYSTEM
-- =====================================================

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
    translated_content JSONB, -- For multi-language support
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
    action_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message templates for automated communications
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type message_type NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Template variables
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TASK MANAGEMENT SYSTEM
-- =====================================================

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    class_id UUID REFERENCES classes(id),
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    completion_notes TEXT,
    attachments JSONB DEFAULT '[]',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task comments
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FEE MANAGEMENT SYSTEM
-- =====================================================

-- Fee categories
CREATE TABLE fee_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, yearly, one_time
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student fees
CREATE TABLE student_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES fee_categories(id),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status fee_status DEFAULT 'pending',
    paid_amount DECIMAL(10,2) DEFAULT 0,
    paid_date TIMESTAMP,
    payment_method payment_method,
    transaction_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fee payments
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    transaction_id VARCHAR(255),
    receipt_url TEXT,
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- LEARNING AND CONTENT SYSTEM
-- =====================================================

-- Learning topics
CREATE TABLE learning_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_name VARCHAR(100) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
    difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    description TEXT,
    learning_objectives TEXT[],
    prerequisites TEXT[],
    estimated_duration INTEGER DEFAULT 30, -- minutes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(topic_name, subject, grade_level, tenant_id)
);

-- Visual content
CREATE TABLE visual_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES learning_topics(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('image', 'video', 'interactive', 'diagram', 'animation')),
    content_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration INTEGER, -- seconds for videos
    file_size BIGINT, -- bytes
    format VARCHAR(20), -- jpg, png, mp4, etc.
    resolution VARCHAR(20), -- 1920x1080, etc.
    is_safe BOOLEAN DEFAULT true,
    safety_score DECIMAL(3,2) DEFAULT 1.0,
    curriculum_aligned BOOLEAN DEFAULT true,
    accessibility_features TEXT[], -- alt-text, captions, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Learning requests
CREATE TABLE learning_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_name VARCHAR(100) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    grade_level INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    content_id UUID REFERENCES visual_content(id),
    error_message TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Learning progress
CREATE TABLE learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES visual_content(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0 CHECK (progress_percentage >= 0.0 AND progress_percentage <= 100.0),
    time_spent INTEGER DEFAULT 0, -- seconds
    completion_status VARCHAR(20) DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed', 'paused')),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(student_id, content_id)
);

-- Learning sessions
CREATE TABLE learning_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES visual_content(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- seconds
    interaction_count INTEGER DEFAULT 0,
    engagement_score DECIMAL(3,2), -- 0.0 to 1.0
    device_info JSONB,
    location_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- =====================================================
-- REPORT GENERATION SYSTEM
-- =====================================================

-- Report templates
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type report_type NOT NULL,
    template_content JSONB NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated reports
CREATE TABLE generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES report_templates(id),
    student_id UUID REFERENCES users(id),
    teacher_id UUID REFERENCES users(id),
    report_data JSONB NOT NULL,
    report_url TEXT,
    status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    error_message TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- =====================================================
-- FEEDBACK AND RATINGS
-- =====================================================

-- Content feedback
CREATE TABLE content_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES visual_content(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('student', 'teacher', 'parent')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    feedback_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(content_id, user_id)
);

-- Safety reports
CREATE TABLE safety_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES visual_content(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('inappropriate', 'inaccurate', 'too_difficult', 'too_easy', 'technical_issue', 'other')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- =====================================================
-- ANALYTICS AND RECOMMENDATIONS
-- =====================================================

-- Learning analytics
CREATE TABLE learning_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_time_spent INTEGER DEFAULT 0, -- seconds
    topics_accessed INTEGER DEFAULT 0,
    content_completed INTEGER DEFAULT 0,
    average_engagement_score DECIMAL(3,2),
    preferred_subjects TEXT[],
    preferred_content_types TEXT[],
    learning_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(student_id, date)
);

-- Content recommendations
CREATE TABLE content_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES visual_content(id) ON DELETE CASCADE,
    recommendation_score DECIMAL(3,2) NOT NULL CHECK (recommendation_score >= 0.0 AND recommendation_score <= 1.0),
    reason TEXT,
    algorithm_version VARCHAR(20) DEFAULT 'v1.0',
    is_viewed BOOLEAN DEFAULT false,
    is_clicked BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Parent engagement analytics
CREATE TABLE parent_engagement_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    notifications_received INTEGER DEFAULT 0,
    notifications_read INTEGER DEFAULT 0,
    reports_viewed INTEGER DEFAULT 0,
    fee_payments_made INTEGER DEFAULT 0,
    total_engagement_time INTEGER DEFAULT 0, -- seconds
    engagement_score DECIMAL(3,2),
    preferred_communication_method VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(parent_id, date)
);

-- =====================================================
-- SYLLABUS AND CURRICULUM
-- =====================================================

-- Syllabus analysis
CREATE TABLE syllabus_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    syllabus_text TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    subject VARCHAR(50) NOT NULL,
    analyzed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_result JSONB NOT NULL,
    extracted_topics TEXT[],
    suggested_content_ids UUID[],
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Learning paths
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    grade_level INTEGER NOT NULL,
    subject VARCHAR(50) NOT NULL,
    topic_sequence UUID[] NOT NULL, -- Array of topic IDs in order
    estimated_duration INTEGER, -- total minutes
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core tables
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_tenants_domain ON tenants(domain);

-- Authentication
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_api_key ON api_keys(api_key);

-- Security
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at);

-- Student verification
CREATE INDEX idx_student_verifications_student_id ON student_verifications(student_id);
CREATE INDEX idx_student_verifications_status ON student_verifications(verification_status);
CREATE INDEX idx_verification_requests_tenant ON student_verification_requests(tenant_id);
CREATE INDEX idx_verification_requests_status ON student_verification_requests(status);
CREATE INDEX idx_verification_requests_email ON student_verification_requests(student_email);
CREATE INDEX idx_school_codes_tenant ON school_verification_codes(tenant_id);
CREATE INDEX idx_school_codes_code ON school_verification_codes(code);
CREATE INDEX idx_email_domains_tenant ON school_email_domains(tenant_id);
CREATE INDEX idx_student_records_tenant ON student_id_records(tenant_id);

-- Classes and attendance
CREATE INDEX idx_classes_tenant_id ON classes(tenant_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);

-- Communication
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_message_templates_tenant ON message_templates(tenant_id);

-- Tasks
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

-- Fees
CREATE INDEX idx_fee_categories_tenant ON fee_categories(tenant_id);
CREATE INDEX idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX idx_student_fees_status ON student_fees(status);
CREATE INDEX idx_student_fees_due_date ON student_fees(due_date);
CREATE INDEX idx_fee_payments_student_fee_id ON fee_payments(student_fee_id);

-- Learning
CREATE INDEX idx_learning_topics_subject_grade ON learning_topics(subject, grade_level);
CREATE INDEX idx_learning_topics_tenant ON learning_topics(tenant_id);
CREATE INDEX idx_learning_topics_active ON learning_topics(is_active);
CREATE INDEX idx_visual_content_topic ON visual_content(topic_id);
CREATE INDEX idx_visual_content_type ON visual_content(content_type);
CREATE INDEX idx_visual_content_safe ON visual_content(is_safe);
CREATE INDEX idx_visual_content_tenant ON visual_content(tenant_id);
CREATE INDEX idx_learning_progress_student ON learning_progress(student_id);
CREATE INDEX idx_learning_progress_content ON learning_progress(content_id);
CREATE INDEX idx_learning_progress_status ON learning_progress(completion_status);
CREATE INDEX idx_learning_progress_tenant ON learning_progress(tenant_id);
CREATE INDEX idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX idx_learning_sessions_content ON learning_sessions(content_id);
CREATE INDEX idx_learning_sessions_date ON learning_sessions(session_start);

-- Reports
CREATE INDEX idx_report_templates_tenant ON report_templates(tenant_id);
CREATE INDEX idx_generated_reports_student_id ON generated_reports(student_id);
CREATE INDEX idx_generated_reports_status ON generated_reports(status);

-- Feedback and analytics
CREATE INDEX idx_content_feedback_content ON content_feedback(content_id);
CREATE INDEX idx_content_feedback_user ON content_feedback(user_id);
CREATE INDEX idx_content_feedback_rating ON content_feedback(rating);
CREATE INDEX idx_learning_analytics_student_date ON learning_analytics(student_id, date);
CREATE INDEX idx_learning_analytics_tenant ON learning_analytics(tenant_id);
CREATE INDEX idx_content_recommendations_student ON content_recommendations(student_id);
CREATE INDEX idx_content_recommendations_score ON content_recommendations(recommendation_score);
CREATE INDEX idx_parent_engagement_parent_id ON parent_engagement_analytics(parent_id);
CREATE INDEX idx_parent_engagement_date ON parent_engagement_analytics(date);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_fees_updated_at BEFORE UPDATE ON student_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_topics_updated_at BEFORE UPDATE ON learning_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visual_content_updated_at BEFORE UPDATE ON visual_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON learning_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update class student count
CREATE OR REPLACE FUNCTION update_class_student_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE classes SET current_students = current_students + 1 WHERE id = NEW.class_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE classes SET current_students = current_students - 1 WHERE id = OLD.class_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_class_student_count_trigger
    AFTER INSERT OR DELETE ON class_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_class_student_count();

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert a sample tenant
INSERT INTO tenants (name, domain, email, phone) VALUES 
('Sample School', 'sampleschool.edu', 'admin@sampleschool.edu', '+1234567890');

-- Insert sample user roles
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) VALUES 
((SELECT id FROM tenants LIMIT 1), 'admin@sampleschool.edu', '$2b$10$dummyhash', 'Admin', 'User', 'admin'),
((SELECT id FROM tenants LIMIT 1), 'teacher@sampleschool.edu', '$2b$10$dummyhash', 'John', 'Teacher', 'teacher'),
((SELECT id FROM tenants LIMIT 1), 'student@sampleschool.edu', '$2b$10$dummyhash', 'Jane', 'Student', 'student'),
((SELECT id FROM tenants LIMIT 1), 'parent@sampleschool.edu', '$2b$10$dummyhash', 'Bob', 'Parent', 'parent');

-- Insert sample fee categories
INSERT INTO fee_categories (tenant_id, name, description, amount, frequency) VALUES 
((SELECT id FROM tenants LIMIT 1), 'Tuition Fee', 'Monthly tuition fee', 500.00, 'monthly'),
((SELECT id FROM tenants LIMIT 1), 'Library Fee', 'Annual library membership', 50.00, 'yearly'),
((SELECT id FROM tenants LIMIT 1), 'Sports Fee', 'Sports equipment and facilities', 100.00, 'yearly');

-- Insert sample message templates
INSERT INTO message_templates (tenant_id, name, type, subject, content, variables) VALUES 
((SELECT id FROM tenants LIMIT 1), 'Fee Reminder', 'fee_reminder', 'Fee Payment Reminder', 'Dear {parent_name}, This is a reminder that the {fee_type} of ${amount} is due on {due_date}.', '["parent_name", "fee_type", "amount", "due_date"]'),
((SELECT id FROM tenants LIMIT 1), 'Attendance Report', 'report', 'Weekly Attendance Report', 'Dear {parent_name}, Here is the attendance report for {student_name} for the week of {week_start}.', '["parent_name", "student_name", "week_start"]');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tenants IS 'Schools or educational organizations using the platform';
COMMENT ON TABLE users IS 'All users including admins, teachers, students, and parents';
COMMENT ON TABLE classes IS 'Academic classes with teachers and students';
COMMENT ON TABLE attendance_sessions IS 'Attendance tracking sessions for classes';
COMMENT ON TABLE messages IS 'Communication messages between users';
COMMENT ON TABLE tasks IS 'Task management for teachers and students';
COMMENT ON TABLE student_fees IS 'Fee records for students';
COMMENT ON TABLE learning_topics IS 'Educational topics for visual learning';
COMMENT ON TABLE visual_content IS 'Visual learning content (images, videos, etc.)';
COMMENT ON TABLE generated_reports IS 'AI-generated reports for students';
COMMENT ON TABLE parent_engagement_analytics IS 'Analytics for parent engagement tracking';

-- =====================================================
-- END OF SCHEMA
-- ===================================================== 