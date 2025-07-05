/**
 * EdTech Platform - Database Configuration
 * In-memory database for development
 */

// Simple in-memory database for development
const inMemoryDB = {
    users: [],
    verificationCodes: {},
    sessions: {}
};

// Mock database functions
const query = async (text, params = []) => {
    console.log('Mock DB Query:', text, params);
    return { rows: [], rowCount: 0 };
};

const getClient = async () => {
    return {
        query: query,
        release: () => console.log('Client released')
    };
};

const pool = {
    connect: async () => getClient(),
    query: query,
    end: async () => console.log('Pool ended')
};

// Health check
const healthCheck = async () => {
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'in-memory',
        message: 'Using in-memory database for development'
    };
};

// Export database utilities
module.exports = {
    pool,
    query,
    getClient,
    testConnection: async () => console.log('✅ Mock database connection successful!'),
    healthCheck,
    closePool: async () => console.log('✅ Mock database pool closed'),
    config: { database: 'in-memory' },
    // Export in-memory storage for use in routes
    db: inMemoryDB
}; 