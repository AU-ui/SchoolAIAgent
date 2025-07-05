/**
 * EdTech Platform - ML Integration Service
 * Handles communication with FastAPI ML services
 */

const axios = require('axios');

class MLService {
    constructor() {
        this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        this.timeout = 30000; // 30 seconds
    }

    /**
     * Get ML service status
     */
    async getStatus() {
        try {
            const response = await axios.get(`${this.baseURL}/health`, {
                timeout: this.timeout
            });
            
            return {
                status: 'connected',
                service: 'ML Services',
                response: response.data
            };

        } catch (error) {
            console.error('ML service status check failed:', error.message);
            return {
                status: 'disconnected',
                service: 'ML Services',
                error: error.message
            };
        }
    }

    /**
     * Get attendance analytics
     */
    async getAttendanceAnalytics(analyticsData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/attendance/analyze`, {
                school_id: analyticsData.tenantId,
                student_id: analyticsData.studentId,
                date_range: {
                    start_date: analyticsData.startDate,
                    end_date: analyticsData.endDate
                },
                include_patterns: true,
                include_predictions: true
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error getting attendance analytics:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Attendance analytics could not be generated',
                fallback_data: {
                    patterns: [],
                    predictions: [],
                    alerts: []
                }
            };
        }
    }

    /**
     * Get class attendance analytics
     */
    async getClassAttendanceAnalytics(analyticsData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/attendance/analyze`, {
                school_id: analyticsData.tenantId,
                class_id: analyticsData.classId,
                date_range: {
                    start_date: analyticsData.startDate,
                    end_date: analyticsData.endDate
                },
                include_patterns: true,
                include_predictions: true
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error getting class attendance analytics:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Class attendance analytics could not be generated',
                fallback_data: {
                    patterns: [],
                    predictions: [],
                    alerts: []
                }
            };
        }
    }

    /**
     * Generate attendance report
     */
    async generateAttendanceReport(reportData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/reports/generate`, {
                school_id: reportData.tenantId,
                report_type: 'attendance',
                date_range: {
                    start_date: reportData.startDate,
                    end_date: reportData.endDate
                },
                include_insights: true,
                include_recommendations: true
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error generating attendance report:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Attendance report could not be generated',
                fallback_data: {
                    content: {},
                    insights: [],
                    recommendations: []
                }
            };
        }
    }

    /**
     * Get attendance insights
     */
    async getAttendanceInsights(insightsData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/attendance/analyze`, {
                school_id: insightsData.tenantId,
                student_id: insightsData.studentId,
                date_range: {
                    start_date: insightsData.startDate,
                    end_date: insightsData.endDate
                },
                include_patterns: true,
                include_predictions: true
            }, {
                timeout: this.timeout
            });

            return {
                patterns: response.data.patterns || [],
                predictions: response.data.predictions || {},
                alerts: response.data.alerts || [],
                recommendations: response.data.recommendations || []
            };

        } catch (error) {
            console.error('Error getting attendance insights:', error.message);
            return {
                patterns: [],
                predictions: {},
                alerts: [],
                recommendations: [
                    {
                        type: 'general',
                        message: 'Consider reviewing attendance patterns regularly',
                        priority: 'medium'
                    }
                ]
            };
        }
    }

    /**
     * Process communication with sentiment analysis
     */
    async processCommunication(communicationData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/communication/process`, {
                sender_id: communicationData.senderId,
                receiver_id: communicationData.receiverId,
                message_content: communicationData.content,
                message_type: communicationData.type,
                language: communicationData.language,
                urgency_level: communicationData.urgencyLevel
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error processing communication:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Communication analysis could not be performed',
                fallback_data: {
                    sentiment_score: 0.5,
                    sentiment_label: 'neutral',
                    language_detected: communicationData.language || 'English',
                    urgency_score: 0.5,
                    suggested_response: null,
                    engagement_prediction: 0.5
                }
            };
        }
    }

    /**
     * Analyze parent engagement
     */
    async analyzeEngagement(engagementData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/engagement/analyze`, {
                parent_id: engagementData.parentId,
                communication_history: engagementData.communicationHistory,
                include_analysis: true,
                include_recommendations: true
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error analyzing engagement:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Engagement analysis could not be performed',
                fallback_data: {
                    engagement_score: 0.5,
                    communication_patterns: {},
                    recommendations: [
                        {
                            type: 'general',
                            action: 'Maintain regular communication',
                            priority: 'medium'
                        }
                    ]
                }
            };
        }
    }

    /**
     * Generate comprehensive report
     */
    async generateComprehensiveReport(reportData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/reports/generate`, {
                school_id: reportData.tenantId,
                report_type: 'comprehensive',
                date_range: {
                    start_date: reportData.startDate,
                    end_date: reportData.endDate
                },
                include_insights: true,
                include_recommendations: true
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error generating comprehensive report:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Comprehensive report could not be generated',
                fallback_data: {
                    content: {},
                    insights: [],
                    recommendations: []
                }
            };
        }
    }

    /**
     * Prioritize tasks
     */
    async prioritizeTasks(taskData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/tasks/prioritize`, {
                teacher_id: taskData.teacherId,
                tasks: taskData.tasks,
                include_prioritization: true,
                include_scheduling: true
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error prioritizing tasks:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Task prioritization could not be performed',
                fallback_data: {
                    prioritized_tasks: taskData.tasks,
                    workload_analysis: {},
                    scheduling_suggestions: []
                }
            };
        }
    }

    /**
     * Analyze fee patterns
     */
    async analyzeFees(feeData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/fees/analyze`, {
                school_id: feeData.tenantId,
                student_id: feeData.studentId,
                include_predictions: true,
                include_recommendations: true
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error analyzing fees:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Fee analysis could not be performed',
                fallback_data: {
                    payment_analysis: {},
                    predictions: {},
                    recommendations: []
                }
            };
        }
    }

    /**
     * Generate paper/homework with AI
     */
    async generatePaper(paperData) {
        try {
            const response = await axios.post(`${this.baseURL}/api/v1/papers/generate`, {
                subject: paperData.subject,
                class: paperData.class,
                board: paperData.board,
                total_marks: paperData.totalMarks,
                duration: paperData.duration,
                topics: paperData.topics,
                question_types: paperData.questionTypes,
                difficulty_distribution: paperData.difficultyDistribution,
                include_instructions: paperData.includeInstructions,
                include_marks_breakdown: paperData.includeMarksBreakdown
            }, {
                timeout: this.timeout
            });

            return response.data;

        } catch (error) {
            console.error('Error generating paper:', error.message);
            return {
                error: 'ML service unavailable',
                message: 'Paper generation could not be performed',
                fallback_data: {
                    paper_id: null,
                    sections: [],
                    marking_scheme: {},
                    generated_at: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Batch process multiple ML operations
     */
    async batchProcess(operations) {
        const results = {};
        
        for (const [key, operation] of Object.entries(operations)) {
            try {
                switch (operation.type) {
                    case 'attendance_analytics':
                        results[key] = await this.getAttendanceAnalytics(operation.data);
                        break;
                    case 'communication_processing':
                        results[key] = await this.processCommunication(operation.data);
                        break;
                    case 'engagement_analysis':
                        results[key] = await this.analyzeEngagement(operation.data);
                        break;
                    case 'report_generation':
                        results[key] = await this.generateComprehensiveReport(operation.data);
                        break;
                    case 'task_prioritization':
                        results[key] = await this.prioritizeTasks(operation.data);
                        break;
                    default:
                        results[key] = {
                            error: 'Unknown operation type',
                            operation: operation.type
                        };
                }
            } catch (error) {
                results[key] = {
                    error: 'Operation failed',
                    message: error.message,
                    operation: operation.type
                };
            }
        }
        
        return results;
    }

    /**
     * Test ML service connectivity
     */
    async testConnectivity() {
        try {
            const response = await axios.get(`${this.baseURL}/`, {
                timeout: 5000
            });
            
            return {
                status: 'connected',
                service: 'ML Services',
                version: response.data.version,
                endpoints: response.data.endpoints
            };

        } catch (error) {
            return {
                status: 'disconnected',
                service: 'ML Services',
                error: error.message,
                suggestion: 'Check if ML service is running on ' + this.baseURL
            };
        }
    }
}

module.exports = MLService;
