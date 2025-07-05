/**
 * EdTech Platform - Database Setup Script
 * Initializes PostgreSQL database with schema and sample data
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'edtech_platform',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

/**
 * Test database connection
 */
async function testConnection() {
    try {
        console.log('🔌 Testing database connection...');
        const client = await pool.connect();
        
        // Test basic query
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Database connection successful!');
        console.log(`📅 Current time: ${result.rows[0].current_time}`);
        console.log(`🐘 PostgreSQL version: ${result.rows[0].pg_version.split(' ')[1]}`);
        
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Make sure PostgreSQL is running');
        console.log('2. Check your database credentials in .env file');
        console.log('3. Ensure the database exists');
        console.log('4. Verify network connectivity');
        return false;
    }
}

/**
 * Create database if it doesn't exist
 */
async function createDatabase() {
    try {
        console.log('🗄️ Creating database if it doesn\'t exist...');
        
        // Connect to default postgres database
        const defaultPool = new Pool({
            ...dbConfig,
            database: 'postgres'
        });
        
        const client = await defaultPool.connect();
        
        // Check if database exists
        const dbExists = await client.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [dbConfig.database]
        );
        
        if (dbExists.rows.length === 0) {
            console.log(`📝 Creating database: ${dbConfig.database}`);
            await client.query(`CREATE DATABASE ${dbConfig.database}`);
            console.log('✅ Database created successfully!');
        } else {
            console.log('✅ Database already exists!');
        }
        
        client.release();
        await defaultPool.end();
        return true;
    } catch (error) {
        console.error('❌ Error creating database:', error.message);
        return false;
    }
}

/**
 * Read and execute SQL schema file
 */
async function executeSchema() {
    try {
        console.log('📋 Executing database schema...');
        
        // Use the complete schema instead of the basic one
        const schemaPath = path.join(__dirname, 'complete_schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        const client = await pool.connect();
        
        // Split SQL by semicolons and execute each statement
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await client.query(statement);
                    console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log(`⚠️ Statement ${i + 1} skipped (already exists)`);
                    } else {
                        console.error(`❌ Error in statement ${i + 1}:`, error.message);
                        throw error;
                    }
                }
            }
        }
        
        client.release();
        console.log('✅ Database schema executed successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error executing schema:', error.message);
        return false;
    }
}

/**
 * Insert sample data
 */
async function insertSampleData() {
    try {
        console.log('📊 Inserting sample data...');
        
        const client = await pool.connect();
        
        // Sample tenant
        const tenantResult = await client.query(`
            INSERT INTO tenants (name, domain, subdomain) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (subdomain) DO NOTHING 
            RETURNING id
        `, ['Demo School', 'demoschool.com', 'demo']);
        
        let tenantId;
        if (tenantResult.rows.length > 0) {
            tenantId = tenantResult.rows[0].id;
        } else {
            const existingTenant = await client.query(
                'SELECT id FROM tenants WHERE subdomain = $1',
                ['demo']
            );
            tenantId = existingTenant.rows[0].id;
        }
        
        // Sample admin user
        await client.query(`
            INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) 
            VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6) 
            ON CONFLICT (email) DO NOTHING
        `, [tenantId, 'admin@demoschool.com', 'admin123', 'Admin', 'User', 'admin']);
        
        // Sample teacher
        await client.query(`
            INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) 
            VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6) 
            ON CONFLICT (email) DO NOTHING
        `, [tenantId, 'teacher@demoschool.com', 'teacher123', 'John', 'Smith', 'teacher']);
        
        // Sample parent
        await client.query(`
            INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) 
            VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6) 
            ON CONFLICT (email) DO NOTHING
        `, [tenantId, 'parent@demoschool.com', 'parent123', 'Jane', 'Doe', 'parent']);
        
        // Sample student
        await client.query(`
            INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) 
            VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6) 
            ON CONFLICT (email) DO NOTHING
        `, [tenantId, 'student@demoschool.com', 'student123', 'Alex', 'Johnson', 'student']);
        
        // Sample class
        const classResult = await client.query(`
            INSERT INTO classes (tenant_id, name, section, academic_year) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT DO NOTHING 
            RETURNING id
        `, [tenantId, 'Class 10', 'A', '2024-25']);
        
        let classId;
        if (classResult.rows.length > 0) {
            classId = classResult.rows[0].id;
        } else {
            const existingClass = await client.query(
                'SELECT id FROM classes WHERE tenant_id = $1 AND name = $2 AND section = $3',
                [tenantId, 'Class 10', 'A']
            );
            classId = existingClass.rows[0].id;
        }
        
        // Sample subject
        const subjectResult = await client.query(`
            INSERT INTO subjects (tenant_id, name, code) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (code) DO NOTHING 
            RETURNING id
        `, [tenantId, 'Mathematics', 'MATH101']);
        
        let subjectId;
        if (subjectResult.rows.length > 0) {
            subjectId = subjectResult.rows[0].id;
        } else {
            const existingSubject = await client.query(
                'SELECT id FROM subjects WHERE code = $1',
                ['MATH101']
            );
            subjectId = existingSubject.rows[0].id;
        }
        
        // Get user IDs for relationships
        const teacherUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            ['teacher@demoschool.com']
        );
        
        const parentUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            ['parent@demoschool.com']
        );
        
        const studentUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            ['student@demoschool.com']
        );
        
        // Class assignment
        await client.query(`
            INSERT INTO class_assignments (teacher_id, class_id, subject_id, tenant_id, academic_year) 
            VALUES ($1, $2, $3, $4, $5) 
            ON CONFLICT DO NOTHING
        `, [teacherUser.rows[0].id, classId, subjectId, tenantId, '2024-25']);
        
        // Student class assignment
        await client.query(`
            INSERT INTO student_class_assignments (student_id, class_id, tenant_id, academic_year, roll_number) 
            VALUES ($1, $2, $3, $4, $5) 
            ON CONFLICT DO NOTHING
        `, [studentUser.rows[0].id, classId, tenantId, '2024-25', '001']);
        
        // Parent-student relationship
        await client.query(`
            INSERT INTO parent_student_relationships (parent_id, student_id, tenant_id) 
            VALUES ($1, $2, $3) 
            ON CONFLICT DO NOTHING
        `, [parentUser.rows[0].id, studentUser.rows[0].id, tenantId]);
        
        client.release();
        console.log('✅ Sample data inserted successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error inserting sample data:', error.message);
        return false;
    }
}

/**
 * Verify database setup
 */
async function verifySetup() {
    try {
        console.log('🔍 Verifying database setup...');
        
        const client = await pool.connect();
        
        // Check tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📋 Created tables:');
        tables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        // Check sample data
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        const tenantCount = await client.query('SELECT COUNT(*) as count FROM tenants');
        const classCount = await client.query('SELECT COUNT(*) as count FROM classes');
        
        console.log('\n📊 Sample data counts:');
        console.log(`  - Users: ${userCount.rows[0].count}`);
        console.log(`  - Tenants: ${tenantCount.rows[0].count}`);
        console.log(`  - Classes: ${classCount.rows[0].count}`);
        
        client.release();
        console.log('✅ Database setup verification complete!');
        return true;
    } catch (error) {
        console.error('❌ Error verifying setup:', error.message);
        return false;
    }
}

/**
 * Main setup function
 */
async function setupDatabase() {
    console.log('🚀 Starting EdTech Platform Database Setup...\n');
    
    try {
        // Step 1: Test connection
        const connectionOk = await testConnection();
        if (!connectionOk) {
            console.log('\n❌ Cannot proceed without database connection');
            process.exit(1);
        }
        
        // Step 2: Create database
        const dbCreated = await createDatabase();
        if (!dbCreated) {
            console.log('\n❌ Cannot proceed without database');
            process.exit(1);
        }
        
        // Step 3: Execute schema
        const schemaExecuted = await executeSchema();
        if (!schemaExecuted) {
            console.log('\n❌ Cannot proceed without schema');
            process.exit(1);
        }
        
        // Step 4: Insert sample data
        const sampleDataInserted = await insertSampleData();
        if (!sampleDataInserted) {
            console.log('\n⚠️ Sample data insertion failed, but continuing...');
        }
        
        // Step 5: Verify setup
        await verifySetup();
        
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Start the backend server: npm start');
        console.log('2. Test the API endpoints');
        console.log('3. Begin frontend development');
        
    } catch (error) {
        console.error('\n❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = {
    testConnection,
    createDatabase,
    executeSchema,
    insertSampleData,
    verifySetup,
    setupDatabase
}; 