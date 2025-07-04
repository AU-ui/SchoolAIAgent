-- EdTech Platform - Visual Learning System Schema
-- Handles educational topics, visual content, progress tracking, and analytics

-- =====================================================
-- CORE LEARNING TABLES
-- =====================================================

-- Educational topics table
CREATE TABLE IF NOT EXISTS learning_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Visual content table
CREATE TABLE IF NOT EXISTS visual_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Learning requests table
CREATE TABLE IF NOT EXISTS learning_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- =====================================================
-- PROGRESS TRACKING TABLES
-- =====================================================

-- Student learning progress table
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Learning sessions table
CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- FEEDBACK AND RATINGS TABLES
-- =====================================================

-- Content feedback table
CREATE TABLE IF NOT EXISTS content_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Content safety reports table
CREATE TABLE IF NOT EXISTS safety_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- ANALYTICS AND RECOMMENDATIONS TABLES
-- =====================================================

-- Learning analytics table
CREATE TABLE IF NOT EXISTS learning_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Content recommendations table
CREATE TABLE IF NOT EXISTS content_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- =====================================================
-- SYLLABUS AND CURRICULUM TABLES
-- =====================================================

-- Syllabus analysis table
CREATE TABLE IF NOT EXISTS syllabus_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Learning paths table
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    grade_level INTEGER NOT NULL,
    subject VARCHAR(50) NOT NULL,
    topic_sequence UUID[] NOT NULL, -- Array of topic IDs in order
    estimated_duration INTEGER, -- total minutes
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Learning topics indexes
CREATE INDEX IF NOT EXISTS idx_learning_topics_subject_grade ON learning_topics(subject, grade_level);
CREATE INDEX IF NOT EXISTS idx_learning_topics_tenant ON learning_topics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_topics_active ON learning_topics(is_active);

-- Visual content indexes
CREATE INDEX IF NOT EXISTS idx_visual_content_topic ON visual_content(topic_id);
CREATE INDEX IF NOT EXISTS idx_visual_content_type ON visual_content(content_type);
CREATE INDEX IF NOT EXISTS idx_visual_content_safe ON visual_content(is_safe);
CREATE INDEX IF NOT EXISTS idx_visual_content_tenant ON visual_content(tenant_id);

-- Learning progress indexes
CREATE INDEX IF NOT EXISTS idx_learning_progress_student ON learning_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_content ON learning_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_status ON learning_progress(completion_status);
CREATE INDEX IF NOT EXISTS idx_learning_progress_tenant ON learning_progress(tenant_id);

-- Learning sessions indexes
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_content ON learning_sessions(content_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_date ON learning_sessions(session_start);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_content_feedback_content ON content_feedback(content_id);
CREATE INDEX IF NOT EXISTS idx_content_feedback_user ON content_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_content_feedback_rating ON content_feedback(rating);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_learning_analytics_student_date ON learning_analytics(student_id, date);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_tenant ON learning_analytics(tenant_id);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_content_recommendations_student ON content_recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_score ON content_recommendations(recommendation_score);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp on learning_topics
CREATE OR REPLACE FUNCTION update_learning_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_learning_topics_updated_at
    BEFORE UPDATE ON learning_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_topics_updated_at();

-- Update updated_at timestamp on visual_content
CREATE OR REPLACE FUNCTION update_visual_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_visual_content_updated_at
    BEFORE UPDATE ON visual_content
    FOR EACH ROW
    EXECUTE FUNCTION update_visual_content_updated_at();

-- Update updated_at timestamp on learning_progress
CREATE OR REPLACE FUNCTION update_learning_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_learning_progress_updated_at
    BEFORE UPDATE ON learning_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_progress_updated_at();

-- =====================================================
-- SAMPLE DATA INSERTION (OPTIONAL)
-- =====================================================

-- Insert sample educational topics
INSERT INTO learning_topics (topic_name, subject, grade_level, description, learning_objectives, tenant_id) VALUES
('photosynthesis', 'science', 5, 'Learn about how plants make their own food using sunlight', ARRAY['Understand the process of photosynthesis', 'Identify the parts of a plant involved in photosynthesis'], (SELECT id FROM tenants LIMIT 1)),
('fractions', 'math', 4, 'Introduction to fractions and basic operations', ARRAY['Understand what fractions represent', 'Add and subtract simple fractions'], (SELECT id FROM tenants LIMIT 1)),
('ancient_egypt', 'history', 6, 'Explore the civilization of ancient Egypt', ARRAY['Learn about Egyptian pharaohs', 'Understand Egyptian culture and religion'], (SELECT id FROM tenants LIMIT 1))
ON CONFLICT (topic_name, subject, grade_level, tenant_id) DO NOTHING;
