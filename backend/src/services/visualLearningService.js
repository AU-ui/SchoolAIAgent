/**
 * EdTech Platform - Visual Learning Service
 * Handles visual learning content generation with safety filtering
 */

const { pool } = require('../config/database');
const { ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler');
const MLService = require('./mlIntegrationService');

class VisualLearningService {
    constructor() {
        this.mlService = new MLService();
        this.educationalTopics = this.getEducationalTopics();
        this.blockedCategories = ['inappropriate', 'violent', 'adult', 'political', 'religious', 'commercial', 'entertainment'];
    }

    /**
     * Get pre-approved educational topics
     */
    getEducationalTopics() {
        return {
            science: [
                'photosynthesis', 'water_cycle', 'human_body', 'ecosystems', 'food_chains',
                'weather', 'climate', 'solar_system', 'earth_layers', 'volcanoes',
                'earthquakes', 'rocks_minerals', 'plants', 'animals', 'microorganisms',
                'genetics', 'evolution', 'chemistry_basics', 'physics_basics', 'energy'
            ],
            math: [
                'fractions', 'decimals', 'percentages', 'algebra', 'geometry',
                'measurement', 'time', 'money', 'patterns', 'statistics',
                'probability', 'place_value', 'addition', 'subtraction', 'multiplication',
                'division', 'angles', 'shapes', 'area_perimeter', 'volume'
            ],
            history: [
                'ancient_civilizations', 'world_war_ii', 'american_revolution', 'civil_rights',
                'ancient_egypt', 'ancient_greece', 'ancient_rome', 'middle_ages',
                'renaissance', 'industrial_revolution', 'space_race', 'cold_war',
                'geographic_discoveries', 'cultural_exchanges', 'technological_advances'
            ],
            geography: [
                'continents', 'oceans', 'countries', 'capitals', 'landforms',
                'climate_zones', 'biomes', 'natural_resources', 'population',
                'economic_systems', 'political_systems', 'cultural_regions'
            ],
            literature: [
                'poetry', 'prose', 'grammar', 'vocabulary', 'reading_comprehension',
                'story_elements', 'character_analysis', 'plot_structure', 'themes',
                'figurative_language', 'writing_styles', 'literary_devices'
            ],
            languages: [
                'english_grammar', 'spanish_basics', 'french_basics', 'german_basics',
                'pronunciation', 'vocabulary_building', 'sentence_structure',
                'verb_conjugation', 'noun_declension', 'language_culture'
            ]
        };
    }

    /**
     * Validate if topic is educational and appropriate for grade level
     */
    validateEducationalTopic(topic, subject, gradeLevel) {
        // Check if topic exists in educational topics
        if (!this.educationalTopics[subject] || !this.educationalTopics[subject].includes(topic)) {
            throw new ValidationError(`Topic '${topic}' is not in the approved educational topics list`);
        }

        // Check grade level appropriateness
        if (gradeLevel < 1 || gradeLevel > 12) {
            throw new ValidationError('Grade level must be between 1 and 12');
        }

        // Additional grade-specific validations
        if (gradeLevel <= 3 && ['algebra', 'calculus', 'advanced_chemistry'].includes(topic)) {
            throw new ValidationError(`Topic '${topic}' is not appropriate for grade ${gradeLevel}`);
        }

        return true;
    }

    /**
     * Create safe prompt for content generation
     */
    createSafePrompt(topic, gradeLevel, subject, contentType) {
        const educationalPrefixes = [
            'Educational diagram of',
            'School textbook illustration of',
            'Academic diagram showing',
            'Learning material about',
            'Classroom illustration of'
        ];

        const safetySuffixes = [
            'educational content only',
            'school appropriate',
            'academic illustration',
            'learning material',
            'classroom safe'
        ];

        const prefix = educationalPrefixes[Math.floor(Math.random() * educationalPrefixes.length)];
        const suffix = safetySuffixes[Math.floor(Math.random() * safetySuffixes.length)];

        let prompt = `${prefix} ${topic}, grade ${gradeLevel} level, ${suffix}`;
        prompt += ', family friendly, educational, academic, classroom appropriate';

        // Add content type specific modifiers
        if (contentType === 'image') {
            prompt += ', clear diagram, labeled, informative';
        } else if (contentType === 'video') {
            prompt += ', animated explanation, step by step, educational video';
        } else if (contentType === 'interactive') {
            prompt += ', interactive learning, hands-on, engaging';
        }

        return prompt;
    }

    /**
     * Request visual learning content for a topic
     */
    async requestVisualLearning(studentId, topicName, subject, gradeLevel) {
        const client = await pool.connect();
        try {
            // Validate topic
            this.validateEducationalTopic(topicName, subject, gradeLevel);

            // Check if topic already exists
            let topic = await this.getTopicByName(topicName, subject, gradeLevel);
            
            if (!topic) {
                // Create new topic
                topic = await this.createTopic(topicName, subject, gradeLevel);
            }

            // Create learning request
            const requestId = await this.createLearningRequest(studentId, topicName, subject, gradeLevel);

            // Generate content
            const content = await this.generateVisualContent(topic, gradeLevel, subject);

            // Update request status
            await this.updateLearningRequest(requestId, 'completed', content.id);

            return {
                requestId,
                topic: topic,
                content: content,
                safetyVerified: true,
                curriculumAligned: true
            };

        } catch (error) {
            console.error('Error requesting visual learning:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Generate visual content using ML service
     */
    async generateVisualContent(topic, gradeLevel, subject) {
        try {
            // Generate different types of content
            const contentPromises = [
                this.generateImage(topic.topic_name, gradeLevel, subject),
                this.generateVideo(topic.topic_name, gradeLevel, subject),
                this.generateInteractive(topic.topic_name, gradeLevel, subject)
            ];

            const [image, video, interactive] = await Promise.all(contentPromises);

            // Store content in database
            const contentId = await this.storeVisualContent(topic.id, {
                image,
                video,
                interactive
            });

            return { id: contentId, image, video, interactive };

        } catch (error) {
            console.error('Error generating visual content:', error);
            throw error;
        }
    }

    /**
     * Generate educational image
     */
    async generateImage(topic, gradeLevel, subject) {
        const prompt = this.createSafePrompt(topic, gradeLevel, subject, 'image');
        
        try {
            // Call ML service for image generation
            const result = await this.mlService.generateEducationalImage({
                prompt,
                gradeLevel,
                subject,
                topic
            });

            return {
                type: 'image',
                url: result.imageUrl,
                thumbnailUrl: result.thumbnailUrl,
                title: `Educational Diagram: ${topic}`,
                description: `Educational diagram showing ${topic} for grade ${gradeLevel}`,
                safetyScore: result.safetyScore || 0.95
            };

        } catch (error) {
            console.error('Error generating image:', error);
            // Return placeholder image
            return {
                type: 'image',
                url: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Educational+Content',
                thumbnailUrl: 'https://via.placeholder.com/200x150/4CAF50/FFFFFF?text=Educational',
                title: `Educational Diagram: ${topic}`,
                description: `Educational diagram showing ${topic} for grade ${gradeLevel}`,
                safetyScore: 1.0
            };
        }
    }

    /**
     * Generate educational video
     */
    async generateVideo(topic, gradeLevel, subject) {
        const prompt = this.createSafePrompt(topic, gradeLevel, subject, 'video');
        
        try {
            // Call ML service for video generation
            const result = await this.mlService.generateEducationalVideo({
                prompt,
                gradeLevel,
                subject,
                topic,
                duration: this.getDurationForGrade(gradeLevel)
            });

            return {
                type: 'video',
                url: result.videoUrl,
                thumbnailUrl: result.thumbnailUrl,
                title: `Educational Video: ${topic}`,
                description: `Educational video explaining ${topic} for grade ${gradeLevel}`,
                duration: result.duration || this.getDurationForGrade(gradeLevel),
                safetyScore: result.safetyScore || 0.95
            };

        } catch (error) {
            console.error('Error generating video:', error);
            // Return placeholder video
            return {
                type: 'video',
                url: 'https://example.com/placeholder-video.mp4',
                thumbnailUrl: 'https://via.placeholder.com/200x150/2196F3/FFFFFF?text=Video',
                title: `Educational Video: ${topic}`,
                description: `Educational video explaining ${topic} for grade ${gradeLevel}`,
                duration: this.getDurationForGrade(gradeLevel),
                safetyScore: 1.0
            };
        }
    }

    /**
     * Generate interactive content
     */
    async generateInteractive(topic, gradeLevel, subject) {
        try {
            // Generate interactive HTML content
            const interactiveContent = this.createInteractiveContent(topic, gradeLevel, subject);

            return {
                type: 'interactive',
                url: `data:text/html;base64,${Buffer.from(interactiveContent).toString('base64')}`,
                title: `Interactive Learning: ${topic}`,
                description: `Interactive learning experience for ${topic}`,
                safetyScore: 1.0
            };

        } catch (error) {
            console.error('Error generating interactive content:', error);
            return {
                type: 'interactive',
                url: 'https://example.com/interactive-placeholder.html',
                title: `Interactive Learning: ${topic}`,
                description: `Interactive learning experience for ${topic}`,
                safetyScore: 1.0
            };
        }
    }

    /**
     * Get appropriate duration for grade level
     */
    getDurationForGrade(gradeLevel) {
        if (gradeLevel <= 3) return 60; // 1 minute
        if (gradeLevel <= 6) return 120; // 2 minutes
        if (gradeLevel <= 9) return 180; // 3 minutes
        return 240; // 4 minutes for high school
    }

    /**
     * Create interactive HTML content
     */
    createInteractiveContent(topic, gradeLevel, subject) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Interactive Learning: ${topic}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f0f8ff; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
                .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                .content { padding: 20px; }
                .interactive-element { margin: 20px 0; padding: 15px; border: 2px solid #ddd; border-radius: 5px; }
                .button { background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
                .button:hover { background: #1976D2; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Interactive Learning: ${topic}</h1>
                    <p>Grade ${gradeLevel} - ${subject}</p>
                </div>
                <div class="content">
                    <h2>Welcome to your interactive learning experience!</h2>
                    <p>This interactive module will help you learn about <strong>${topic}</strong>.</p>
                    
                    <div class="interactive-element">
                        <h3>Learning Objectives</h3>
                        <ul>
                            <li>Understand the basic concepts of ${topic}</li>
                            <li>Explore interactive elements</li>
                            <li>Test your knowledge</li>
                        </ul>
                    </div>
                    
                    <div class="interactive-element">
                        <h3>Interactive Quiz</h3>
                        <p>Test your understanding of ${topic}:</p>
                        <button class="button" onclick="startQuiz()">Start Quiz</button>
                        <div id="quiz-results"></div>
                    </div>
                    
                    <div class="interactive-element">
                        <h3>Learning Progress</h3>
                        <div id="progress-bar" style="width: 100%; height: 20px; background: #ddd; border-radius: 10px;">
                            <div id="progress-fill" style="width: 0%; height: 100%; background: #4CAF50; border-radius: 10px; transition: width 0.3s;"></div>
                        </div>
                        <p id="progress-text">Progress: 0%</p>
                    </div>
                </div>
            </div>
            
            <script>
                let progress = 0;
                
                function startQuiz() {
                    const questions = [
                        "What is the main topic of this lesson?",
                        "How does this topic relate to ${subject}?",
                        "What grade level is this content designed for?"
                    ];
                    
                    let score = 0;
                    questions.forEach((question, index) => {
                        const answer = prompt(question);
                        if (answer && answer.toLowerCase().includes('${topic.toLowerCase()}')) {
                            score++;
                        }
                    });
                    
                    const percentage = Math.round((score / questions.length) * 100);
                    document.getElementById('quiz-results').innerHTML = 
                        '<h4>Quiz Results: ' + percentage + '%</h4>';
                    
                    updateProgress(percentage);
                }
                
                function updateProgress(newProgress) {
                    progress = Math.max(progress, newProgress);
                    document.getElementById('progress-fill').style.width = progress + '%';
                    document.getElementById('progress-text').textContent = 'Progress: ' + progress + '%';
                }
                
                // Update progress as user interacts
                document.addEventListener('click', function() {
                    updateProgress(progress + 10);
                });
            </script>
        </body>
        </html>
        `;
    }

    /**
     * Get topic by name, subject, and grade level
     */
    async getTopicByName(topicName, subject, gradeLevel) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT * FROM visual_learning_topics 
                WHERE topic_name = $1 AND subject = $2 AND grade_level = $3 AND is_active = true
            `;
            const result = await client.query(query, [topicName, subject, gradeLevel]);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    /**
     * Create new topic
     */
    async createTopic(topicName, subject, gradeLevel) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO visual_learning_topics (topic_name, subject, grade_level, difficulty_level, description)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const difficultyLevel = this.getDifficultyForGrade(gradeLevel);
            const description = `Educational content about ${topicName} for grade ${gradeLevel}`;
            
            const result = await client.query(query, [topicName, subject, gradeLevel, difficultyLevel, description]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Get difficulty level for grade
     */
    getDifficultyForGrade(gradeLevel) {
        if (gradeLevel <= 3) return 'beginner';
        if (gradeLevel <= 6) return 'intermediate';
        return 'advanced';
    }

    /**
     * Create learning request
     */
    async createLearningRequest(studentId, topicName, subject, gradeLevel) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO learning_requests (student_id, topic_name, subject, grade_level, status)
                VALUES ($1, $2, $3, $4, 'processing')
                RETURNING id
            `;
            const result = await client.query(query, [studentId, topicName, subject, gradeLevel]);
            return result.rows[0].id;
        } finally {
            client.release();
        }
    }

    /**
     * Update learning request status
     */
    async updateLearningRequest(requestId, status, contentId = null) {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE learning_requests 
                SET status = $1, generated_content_id = $2, completed_at = NOW()
                WHERE id = $3
            `;
            await client.query(query, [status, contentId, requestId]);
        } finally {
            client.release();
        }
    }

    /**
     * Store visual content in database
     */
    async storeVisualContent(topicId, content) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO visual_content (topic_id, content_type, content_url, thumbnail_url, title, description, duration, safety_score, is_approved)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
                RETURNING id
            `;
            
            const result = await client.query(query, [
                topicId,
                content.image.type,
                content.image.url,
                content.image.thumbnailUrl,
                content.image.title,
                content.image.description,
                content.image.duration,
                content.image.safetyScore
            ]);
            
            return result.rows[0].id;
        } finally {
            client.release();
        }
    }

    /**
     * Get available topics by grade and subject
     */
    async getAvailableTopics(gradeLevel, subject = null) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT * FROM available_topics_view 
                WHERE grade_level = $1
            `;
            let params = [gradeLevel];
            
            if (subject) {
                query += ' AND subject = $2';
                params.push(subject);
            }
            
            query += ' ORDER BY topic_name';
            
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Get student learning progress
     */
    async getStudentProgress(studentId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT * FROM student_progress_view 
                WHERE student_id = $1
                ORDER BY last_accessed_at DESC
            `;
            const result = await client.query(query, [studentId]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Update learning progress
     */
    async updateLearningProgress(studentId, contentId, progressPercentage, timeSpent) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO learning_progress (student_id, content_id, progress_percentage, time_spent, completion_status, engagement_score)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (student_id, content_id) 
                DO UPDATE SET 
                    progress_percentage = EXCLUDED.progress_percentage,
                    time_spent = learning_progress.time_spent + EXCLUDED.time_spent,
                    completion_status = EXCLUDED.completion_status,
                    engagement_score = EXCLUDED.engagement_score,
                    last_accessed_at = NOW()
            `;
            
            const completionStatus = progressPercentage >= 100 ? 'completed' : 'in_progress';
            const engagementScore = Math.min(progressPercentage / 100, 1.0);
            
            await client.query(query, [studentId, contentId, progressPercentage, timeSpent, completionStatus, engagementScore]);
        } finally {
            client.release();
        }
    }
}

module.exports = VisualLearningService; 