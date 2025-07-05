-- EdTech Platform - Student Verification Schema
-- Run this in PostgreSQL to create tables for student verification

-- 1. Student Verification Requests Table
CREATE TABLE IF NOT EXISTS student_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 2. School Verification Codes Table
CREATE TABLE IF NOT EXISTS school_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 3. Verification Approval Logs Table
CREATE TABLE IF NOT EXISTS verification_approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. School Email Domains Table
CREATE TABLE IF NOT EXISTS school_email_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, domain)
);

-- 5. Student ID Records Table
CREATE TABLE IF NOT EXISTS student_id_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 6. Phone Verification Attempts Table
CREATE TABLE IF NOT EXISTS phone_verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    student_data JSONB,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 7. Suspicious Activity Logs Table
CREATE TABLE IF NOT EXISTS suspicious_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    risk_score DECIMAL(3,2),
    user_agent TEXT,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_requests_tenant ON student_verification_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON student_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_email ON student_verification_requests(student_email);
CREATE INDEX IF NOT EXISTS idx_school_codes_tenant ON school_verification_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_school_codes_code ON school_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_approval_logs_request ON verification_approval_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_email_domains_tenant ON school_email_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_records_tenant ON student_id_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_phone ON phone_verification_attempts(phone);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_ip ON suspicious_activity_logs(ip_address);

-- Add Foreign Key Constraints (uncomment when you have the main tables)
-- ALTER TABLE student_verification_requests ADD CONSTRAINT fk_verification_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
-- ALTER TABLE student_verification_requests ADD CONSTRAINT fk_verification_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);
-- ALTER TABLE student_verification_requests ADD CONSTRAINT fk_verification_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id);
-- ALTER TABLE school_verification_codes ADD CONSTRAINT fk_codes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
-- ALTER TABLE school_verification_codes ADD CONSTRAINT fk_codes_created_by FOREIGN KEY (created_by) REFERENCES users(id);
-- ALTER TABLE verification_approval_logs ADD CONSTRAINT fk_approval_request FOREIGN KEY (request_id) REFERENCES student_verification_requests(id);
-- ALTER TABLE verification_approval_logs ADD CONSTRAINT fk_approval_teacher FOREIGN KEY (teacher_id) REFERENCES users(id);
-- ALTER TABLE school_email_domains ADD CONSTRAINT fk_domains_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
-- ALTER TABLE student_id_records ADD CONSTRAINT fk_records_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
-- ALTER TABLE suspicious_activity_logs ADD CONSTRAINT fk_activity_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- Sample data (optional - for testing)
-- INSERT INTO school_email_domains (tenant_id, domain) VALUES ('your-tenant-id', 'school.edu');
-- INSERT INTO student_id_records (tenant_id, student_id, first_name, last_name, email, grade_level) VALUES ('your-tenant-id', 'ST123456', 'John', 'Doe', 'john.doe@school.edu', 10);
