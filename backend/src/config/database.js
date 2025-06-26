/**
 * EdTech Platform - Database Configuration
 * PostgreSQL connection setup with multi-tenant support
 */

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
    max: process.env.DB_MAX_CONNECTIONS || 20, // Maximum number of clients in the pool
    idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT || 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT || 2000, // Return an error after 2 seconds if connection could not be established
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connection established successfully');
        
        // Test query
        const result = await client.query('SELECT NOW() as current_time');
        console.log(`📅 Database time: ${result.rows[0].current_time}`);
        
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Get database client from pool
const getClient = async () => {
    try {
        const client = await pool.connect();
        return client;
    } catch (error) {
        console.error('Error getting database client:', error);
        throw error;
    }
};

// Execute query with automatic client release
const query = async (text, params = []) => {
    const client = await getClient();
    try {
        const start = Date.now();
        const result = await client.query(text, params);
        const duration = Date.now() - start;
        
        // Log slow queries in development
        if (process.env.NODE_ENV === 'development' && duration > 100) {
            console.log(`🐌 Slow query (${duration}ms):`, text);
        }
        
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Multi-tenant database operations
const getTenantDatabase = (tenantId) => {
    // For multi-tenant setup, you might have different databases per tenant
    // or use schema-based separation
    return {
        name: `edtech_tenant_${tenantId}`,
        schema: `tenant_${tenantId}`
    };
};

// Create tenant schema (for schema-based multi-tenancy)
const createTenantSchema = async (tenantId) => {
    const schemaName = `tenant_${tenantId}`;
    try {
        await query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
        console.log(`✅ Created schema for tenant ${tenantId}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to create schema for tenant ${tenantId}:`, error);
        return false;
    }
};

// Set search path for tenant-specific queries
const setTenantContext = async (client, tenantId) => {
    try {
        await client.query(`SET search_path TO tenant_${tenantId}, public`);
    } catch (error) {
        console.error('Error setting tenant context:', error);
        throw error;
    }
};

// Database health check
const healthCheck = async () => {
    try {
        const result = await query('SELECT 1 as health_check');
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbConfig.database,
            host: dbConfig.host,
            port: dbConfig.port
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// Get database statistics
const getStats = async () => {
    try {
        const stats = await query(`
            SELECT 
                count(*) as total_connections,
                state,
                count(*) as count
            FROM pg_stat_activity 
            WHERE datname = $1 
            GROUP BY state
        `, [dbConfig.database]);
        
        return {
            pool: {
                totalCount: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount
            },
            connections: stats.rows
        };
    } catch (error) {
        console.error('Error getting database stats:', error);
        return null;
    }
};

// Graceful shutdown
const closePool = async () => {
    try {
        await pool.end();
        console.log('✅ Database pool closed successfully');
    } catch (error) {
        console.error('❌ Error closing database pool:', error);
    }
};

// Event listeners for pool
pool.on('connect', (client) => {
    console.log('🔌 New database client connected');
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle client', err);
});

pool.on('remove', (client) => {
    console.log('🔌 Database client removed from pool');
});

// Export database utilities
module.exports = {
    pool,
    query,
    getClient,
    testConnection,
    getTenantDatabase,
    createTenantSchema,
    setTenantContext,
    healthCheck,
    getStats,
    closePool,
    config: dbConfig
}; 