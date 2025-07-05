-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    school_id VARCHAR(100) NOT NULL,
    role ENUM('admin', 'teacher', 'parent', 'student') NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    status ENUM('pending_verification', 'active', 'suspended', 'deleted') DEFAULT 'pending_verification',
    phone VARCHAR(20) NULL,
    avatar VARCHAR(255) NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_school_id (school_id),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- Verification codes table
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_code (user_id, code),
    INDEX idx_expires (expires_at)
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_token (user_id, token),
    INDEX idx_expires (expires_at)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_token (user_id, token),
    INDEX idx_expires (expires_at)
);

-- Insert sample school data
INSERT INTO schools (id, name, address, contact_email, contact_phone) VALUES
('SCH001', 'Springfield High School', '123 Education St, Springfield', 'admin@springfield.edu', '+1-555-0123'),
('SCH002', 'Lincoln Academy', '456 Learning Ave, Lincoln', 'info@lincoln.edu', '+1-555-0456'),
('SCH003', 'Riverside Elementary', '789 Knowledge Rd, Riverside', 'contact@riverside.edu', '+1-555-0789')
ON DUPLICATE KEY UPDATE name = VALUES(name); 