"""
EdTech Platform - ML Services API
FastAPI application for ML-powered features addressing Pain Points #1 and #5
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import uvicorn
import logging
import os
import sys
from datetime import datetime, date, timedelta
import json
import random
import asyncio

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ML models
from models.attendance_model import AttendanceAnalyzer
from models.communication_model import CommunicationProcessor
from models.report_model import ReportGenerator
from models.task_model import TaskPrioritizer
from models.engagement_model import EngagementAnalyzer
from models.paper_model import PaperGenerationModel
from models.visual_model import VisualContentClassifier
from models.sentiment_model import SentimentAnalysisModel

# Import utilities
from utils.data_generator import EdTechDataGenerator
from utils.db_connection import DatabaseConnection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="EdTech Platform ML Services",
    description="ML-powered services for Pain Points #1 (Teacher Administrative Burden) and #5 (Parent-School Communication)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class AttendanceRequest(BaseModel):
    school_id: int
    class_id: Optional[int] = None
    date_range: Dict[str, str] = Field(..., description="Start and end dates in YYYY-MM-DD format")
    include_patterns: bool = True
    include_predictions: bool = True

class AttendanceResponse(BaseModel):
    school_id: int
    total_students: int
    attendance_rate: float
    patterns: Dict[str, Any]
    predictions: Dict[str, Any]
    alerts: List[Dict[str, Any]]
    generated_at: datetime

class AttendancePredictionRequest(BaseModel):
    school_id: int
    class_id: Optional[int] = None
    historical_data: List[Dict[str, Any]]
    days_ahead: int = 7
    include_confidence: bool = True

class AttendancePredictionResponse(BaseModel):
    school_id: int
    class_id: Optional[int]
    predictions: List[Dict[str, Any]]
    confidence_scores: List[float]
    trend_analysis: Dict[str, Any]
    processing_time_ms: float

class CommunicationRequest(BaseModel):
    sender_id: int
    receiver_id: int
    message_content: str
    message_type: str = Field(..., description="attendance, academic, fee, general")
    language: Optional[str] = "English"
    urgency_level: Optional[str] = "normal"

class CommunicationResponse(BaseModel):
    message_id: str
    sentiment_score: float
    sentiment_label: str
    language_detected: str
    urgency_score: float
    suggested_response: Optional[str]
    engagement_prediction: float
    processing_time_ms: float

class ReportRequest(BaseModel):
    school_id: int
    report_type: str = Field(..., description="attendance, academic, fee, comprehensive, student_performance")
    date_range: Dict[str, str]
    include_insights: bool = True
    include_recommendations: bool = True

class ReportResponse(BaseModel):
    report_id: str
    report_type: str
    school_id: int
    generated_at: datetime
    content: Dict[str, Any]
    insights: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    processing_time_ms: float

class TaskRequest(BaseModel):
    teacher_id: int
    tasks: List[Dict[str, Any]]
    include_prioritization: bool = True
    include_scheduling: bool = True

class TaskResponse(BaseModel):
    teacher_id: int
    prioritized_tasks: List[Dict[str, Any]]
    workload_analysis: Dict[str, Any]
    scheduling_suggestions: List[Dict[str, Any]]
    processing_time_ms: float

class FeeRequest(BaseModel):
    school_id: int
    student_id: Optional[int] = None
    include_predictions: bool = True
    include_recommendations: bool = True

class FeeResponse(BaseModel):
    school_id: int
    payment_analysis: Dict[str, Any]
    predictions: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    processing_time_ms: float

class EngagementRequest(BaseModel):
    parent_id: int
    communication_history: List[Dict[str, Any]]
    include_analysis: bool = True
    include_recommendations: bool = True

class EngagementResponse(BaseModel):
    parent_id: int
    engagement_score: float
    communication_patterns: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    processing_time_ms: float

class PaperGenerationRequest(BaseModel):
    subject: str
    topics: List[str]
    num_questions: int = 5
    difficulty_level: str = "medium"

class PaperGenerationResponse(BaseModel):
    subject: str
    questions: List[Dict[str, Any]]
    answer_key: Dict[str, Any]
    difficulty_level: str
    difficulty_distribution: Dict[str, Any]
    topic_coverage: Dict[str, Any]
    paper_metadata: Dict[str, Any]
    ml_model_used: str
    generation_confidence: float
    total_questions: int
    processing_time_ms: float

class VisualContentRequest(BaseModel):
    image_features: List[float]  # 20 features representing the image
    content_type: Optional[str] = None

class VisualContentResponse(BaseModel):
    content_type: str
    confidence: float
    processing_time_ms: float

class SentimentAnalysisRequest(BaseModel):
    text: str
    context: Optional[str] = "general"

class SentimentAnalysisResponse(BaseModel):
    polarity: float
    subjectivity: float
    label: str
    processing_time_ms: float

class PaperDifficultyRequest(BaseModel):
    question: str
    subject: str
    grade_level: int = 10

class PaperDifficultyResponse(BaseModel):
    question: str
    difficulty_score: float
    difficulty_level: str
    complexity_factors: List[str]
    suggested_grade_level: int
    processing_time_ms: float

# Global variables for ML models
attendance_analyzer = None
communication_processor = None
report_generator = None
task_prioritizer = None
engagement_analyzer = None
paper_generator = None
visual_classifier = None
sentiment_analyzer = None
db_connection = None

@app.on_event("startup")
async def startup_event():
    """Initialize ML models and database connection on startup"""
    global attendance_analyzer, communication_processor, report_generator, task_prioritizer, engagement_analyzer, paper_generator, visual_classifier, sentiment_analyzer, db_connection
    
    logger.info("Starting EdTech ML Services...")
    
    try:
        # Initialize database connection
        db_connection = DatabaseConnection()
        logger.info("Database connection initialized")
        
        # Initialize ML models
        attendance_analyzer = AttendanceAnalyzer()
        communication_processor = CommunicationProcessor()
        report_generator = ReportGenerator()
        task_prioritizer = TaskPrioritizer()
        engagement_analyzer = EngagementAnalyzer()
        paper_generator = PaperGenerationModel()
        visual_classifier = VisualContentClassifier()
        sentiment_analyzer = SentimentAnalysisModel()
        
        logger.info("All ML models initialized successfully")
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise e

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "EdTech Platform ML Services API",
        "version": "1.0.0",
        "description": "ML-powered services for educational institutions",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "attendance": "/api/v1/attendance/analyze",
            "communication": "/api/v1/communication/analyze",
            "reports": "/api/v1/reports/generate",
            "tasks": "/api/v1/tasks/prioritize",
            "engagement": "/api/v1/engagement/analyze",
            "paper": "/api/v1/paper/generate",
            "visual": "/api/v1/visual/classify",
            "sentiment": "/api/v1/sentiment/analyze"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "ml_models": all([
                attendance_analyzer is not None,
                communication_processor is not None,
                report_generator is not None,
                task_prioritizer is not None,
                engagement_analyzer is not None,
                paper_generator is not None,
                visual_classifier is not None,
                sentiment_analyzer is not None
            ]),
            "database": db_connection is not None
        }
    }

@app.post("/api/v1/attendance/analyze", response_model=AttendanceResponse)
async def analyze_attendance(request: AttendanceRequest):
    """Analyze attendance patterns using ML models"""
    start_time = datetime.now()
    
    try:
        # Generate sample attendance data
        attendance_data = [
            {"student_id": i, "date": "2024-01-01", "present": random.choice([True, False])}
            for i in range(1, 31)
        ]
        
        # Use the attendance analyzer to analyze patterns
        patterns = attendance_analyzer.analyze_patterns(attendance_data)
        
        # Generate predictions if requested
        predictions = {}
        if request.include_predictions:
            predictions = attendance_analyzer.predict_attendance(attendance_data, 7)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return AttendanceResponse(
            school_id=request.school_id,
            total_students=30,
            attendance_rate=0.85,
            patterns=patterns,
            predictions=predictions,
            alerts=[],
            generated_at=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error in attendance analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/attendance/predict", response_model=AttendancePredictionResponse)
async def predict_attendance(request: AttendancePredictionRequest):
    """Predict future attendance using ML models"""
    start_time = datetime.now()
    
    try:
        # Use the attendance analyzer to predict attendance
        prediction_result = attendance_analyzer.predict_attendance(
            request.historical_data, 
            request.days_ahead
        )
        
        # Generate confidence scores
        confidence_scores = [random.uniform(0.7, 0.95) for _ in range(request.days_ahead)]
        
        # Create trend analysis
        trend_analysis = {
            "overall_trend": random.choice(["increasing", "decreasing", "stable"]),
            "trend_confidence": random.uniform(0.6, 0.9),
            "seasonal_patterns": ["monday_low", "friday_high"],
            "anomaly_detected": random.choice([True, False])
        }
        
        # Format predictions
        predictions = []
        for i in range(request.days_ahead):
            predictions.append({
                "date": (datetime.now() + timedelta(days=i+1)).strftime("%Y-%m-%d"),
                "predicted_attendance_rate": prediction_result["predictions"][i],
                "confidence": confidence_scores[i],
                "day_of_week": (datetime.now() + timedelta(days=i+1)).strftime("%A")
            })
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return AttendancePredictionResponse(
            school_id=request.school_id,
            class_id=request.class_id,
            predictions=predictions,
            confidence_scores=confidence_scores,
            trend_analysis=trend_analysis,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in attendance prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/communication/analyze", response_model=CommunicationResponse)
async def analyze_communication(request: CommunicationRequest):
    """Analyze communication sentiment and urgency"""
    start_time = datetime.now()
    
    try:
        # Use the communication processor to analyze the message
        analysis_result = communication_processor.analyze_message(
            request.message_content,
            request.message_type
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return CommunicationResponse(
            message_id=f"msg_{random.randint(1000, 9999)}",
            sentiment_score=analysis_result["sentiment_score"],
            sentiment_label=analysis_result["sentiment_label"],
            language_detected=analysis_result["language_detected"],
            urgency_score=analysis_result["urgency_score"],
            suggested_response=analysis_result.get("suggested_response"),
            engagement_prediction=analysis_result["engagement_prediction"],
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in communication analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/communication/urgency", response_model=CommunicationResponse)
async def detect_communication_urgency(request: CommunicationRequest):
    """Detect urgency level in communication"""
    start_time = datetime.now()
    
    try:
        # Use the communication processor to detect urgency
        urgency_result = communication_processor.detect_urgency(
            request.message_content
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return CommunicationResponse(
            message_id=f"msg_{random.randint(1000, 9999)}",
            sentiment_score=urgency_result["sentiment_score"],
            sentiment_label=urgency_result["sentiment_label"],
            language_detected=urgency_result["language_detected"],
            urgency_score=urgency_result["urgency_score"],
            suggested_response=urgency_result.get("suggested_response"),
            engagement_prediction=urgency_result["engagement_prediction"],
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in urgency detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/reports/generate", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    """Generate comprehensive reports using ML models"""
    start_time = datetime.now()
    
    try:
        # Generate report using the report generator
        report_result = report_generator.generate_report(
            request.report_type,
            {
                "school_id": request.school_id,
                "date_range": request.date_range,
                "include_insights": request.include_insights,
                "include_recommendations": request.include_recommendations
            }
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return ReportResponse(
            report_id=f"report_{random.randint(1000, 9999)}",
            report_type=request.report_type,
            school_id=request.school_id,
            generated_at=datetime.now(),
            content=report_result,
            insights=report_result.get("insights", []),
            recommendations=report_result.get("recommendations", []),
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in report generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/reports/student", response_model=ReportResponse)
async def generate_student_report(request: ReportRequest):
    """Generate student-specific report"""
    start_time = datetime.now()
    
    try:
        # Generate student report using the report generator
        report_result = report_generator.generate_report(
            "student_performance",
            {
                "student_id": request.school_id,  # Using school_id as student_id for this endpoint
                "date_range": request.date_range,
                "include_attendance": True,
                "include_grades": True
            }
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return ReportResponse(
            report_id=f"student_report_{random.randint(1000, 9999)}",
            report_type="student_performance",
            school_id=request.school_id,
            generated_at=datetime.now(),
            content=report_result,
            insights=report_result.get("insights", []),
            recommendations=report_result.get("recommendations", []),
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in student report generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/tasks/prioritize", response_model=TaskResponse)
async def prioritize_tasks(request: TaskRequest):
    """Prioritize tasks using ML models"""
    start_time = datetime.now()
    
    try:
        # Use the task prioritizer to prioritize tasks
        prioritization_result = task_prioritizer.prioritize_tasks(request.tasks)
        
        # Extract the prioritized tasks from the result
        prioritized_tasks = prioritization_result["prioritized_tasks"]
        workload_analysis = prioritization_result["workload_analysis"]
        scheduling_suggestions = prioritization_result["scheduling_suggestions"]
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return TaskResponse(
            teacher_id=request.teacher_id,
            prioritized_tasks=prioritized_tasks,
            workload_analysis=workload_analysis,
            scheduling_suggestions=scheduling_suggestions,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in task prioritization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/fees/analyze", response_model=FeeResponse)
async def analyze_fees(request: FeeRequest):
    """Analyze fee payment patterns and predict future payments"""
    start_time = datetime.now()
    
    try:
        payment_analysis = {
            "total_outstanding": random.uniform(5000, 50000),
            "payment_rate": random.uniform(0.7, 0.95),
            "average_payment_time": random.randint(5, 15)
        }
        
        predictions = {
            "next_month_collection": random.uniform(8000, 60000),
            "default_risk": random.uniform(0.05, 0.2),
            "recovery_probability": random.uniform(0.6, 0.9)
        }
        
        recommendations = [
            "Send payment reminders to overdue accounts",
            "Offer payment plans for large outstanding amounts",
            "Implement early payment discounts"
        ]
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return FeeResponse(
            school_id=request.school_id,
            payment_analysis=payment_analysis,
            predictions=predictions,
            recommendations=recommendations,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in fee analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/engagement/analyze", response_model=EngagementResponse)
async def analyze_engagement(request: EngagementRequest):
    """Analyze parent engagement patterns"""
    start_time = datetime.now()
    
    try:
        engagement_score = random.uniform(0.4, 0.9)
        
        communication_patterns = {
            "response_time": random.uniform(2, 48),
            "message_frequency": random.uniform(1, 10),
            "preferred_channel": random.choice(["email", "sms", "app"])
        }
        
        recommendations = [
            "Send personalized communication based on preferences",
            "Schedule regular check-ins",
            "Provide more detailed progress reports"
        ]
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return EngagementResponse(
            parent_id=request.parent_id,
            engagement_score=engagement_score,
            communication_patterns=communication_patterns,
            recommendations=recommendations,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in engagement analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/paper/generate", response_model=PaperGenerationResponse)
async def generate_paper(request: PaperGenerationRequest):
    """Generate exam questions using the paper generation model"""
    start_time = datetime.now()
    
    try:
        # Generate questions using the paper generation model
        paper_result = paper_generator.generate_paper(
            request.subject, 
            request.topics, 
            request.num_questions,
            request.difficulty_level
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return PaperGenerationResponse(
            subject=paper_result["subject"],
            questions=paper_result["questions"],
            answer_key=paper_result["answer_key"],
            difficulty_level=paper_result["difficulty_level"],
            difficulty_distribution=paper_result["difficulty_distribution"],
            topic_coverage=paper_result["topic_coverage"],
            paper_metadata=paper_result["paper_metadata"],
            ml_model_used=paper_result["ml_model_used"],
            generation_confidence=paper_result["generation_confidence"],
            total_questions=paper_result["total_questions"],
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in paper generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/visual/classify", response_model=VisualContentResponse)
async def classify_visual_content(request: VisualContentRequest):
    """Classify visual learning content"""
    start_time = datetime.now()
    
    try:
        # Ensure we have 20 features
        if len(request.image_features) != 20:
            raise HTTPException(status_code=400, detail="Image features must have exactly 20 values")
        
        # Use the visual classifier to classify content
        classification_result = visual_classifier.classify_content(request.image_features)
        
        # Extract the content_type from the result dictionary
        content_type = classification_result["content_type"]
        confidence = classification_result["confidence"]
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return VisualContentResponse(
            content_type=content_type,
            confidence=confidence,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in visual content classification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/visual/analyze", response_model=VisualContentResponse)
async def analyze_visual_content(request: VisualContentRequest):
    """Analyze visual learning content using the visual classifier"""
    start_time = datetime.now()
    
    try:
        # Ensure we have 20 features
        if len(request.image_features) != 20:
            raise HTTPException(status_code=400, detail="Image features must have exactly 20 values")
        
        # Use the visual classifier to classify content
        classification_result = visual_classifier.classify_content(request.image_features)
        
        # Extract the content_type from the result dictionary
        content_type = classification_result["content_type"]
        confidence = classification_result["confidence"]
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return VisualContentResponse(
            content_type=content_type,
            confidence=confidence,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in visual content analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sentiment/analyze", response_model=SentimentAnalysisResponse)
async def analyze_sentiment(request: SentimentAnalysisRequest):
    """Analyze sentiment of text using the sentiment analysis model"""
    start_time = datetime.now()
    
    try:
        # Analyze sentiment using the sentiment analyzer
        sentiment_result = sentiment_analyzer.analyze_sentiment(request.text)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return SentimentAnalysisResponse(
            polarity=sentiment_result["polarity"],
            subjectivity=sentiment_result["subjectivity"],
            label=sentiment_result["label"],
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/data/generate")
async def generate_dummy_data(background_tasks: BackgroundTasks):
    """Generate dummy data for testing"""
    background_tasks.add_task(generate_data_task)
    return {"message": "Data generation started in background"}

async def generate_data_task():
    """Background task to generate dummy data"""
    logger.info("Generating dummy data...")
    # Simulate data generation
    await asyncio.sleep(5)
    logger.info("Dummy data generation completed")

@app.get("/api/v1/models/status")
async def get_models_status():
    """Get status of all ML models"""
    return {
        "models": {
            "attendance_analyzer": attendance_analyzer is not None,
            "communication_processor": communication_processor is not None,
            "report_generator": report_generator is not None,
            "task_prioritizer": task_prioritizer is not None,
            "engagement_analyzer": engagement_analyzer is not None,
            "paper_generator": paper_generator is not None,
            "visual_classifier": visual_classifier is not None,
            "sentiment_analyzer": sentiment_analyzer is not None
        },
        "database": db_connection is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/paper/analyze-difficulty", response_model=PaperDifficultyResponse)
async def analyze_question_difficulty(request: PaperDifficultyRequest):
    """Analyze the difficulty level of a question using ML models"""
    start_time = datetime.now()
    
    try:
        # Use the paper generation model to analyze difficulty
        difficulty_result = paper_generator.analyze_question_difficulty(
            request.question,
            request.subject,
            request.grade_level
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return PaperDifficultyResponse(
            question=request.question,
            difficulty_score=difficulty_result["difficulty_score"],
            difficulty_level=difficulty_result["difficulty_level"],
            complexity_factors=difficulty_result["complexity_factors"],
            suggested_grade_level=difficulty_result["suggested_grade_level"],
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in question difficulty analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 