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
from datetime import datetime, date
import json
import random

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ML models (will be created next)
# from models.attendance_analyzer import AttendanceAnalyzer
# from models.communication_processor import CommunicationProcessor
# from models.report_generator import ReportGenerator
# from models.task_prioritizer import TaskPrioritizer
# from models.engagement_analyzer import EngagementAnalyzer

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
    report_type: str = Field(..., description="attendance, academic, fee, comprehensive")
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

# Global variables for ML models (will be initialized)
attendance_analyzer = None
communication_processor = None
report_generator = None
task_prioritizer = None
engagement_analyzer = None
db_connection = None

@app.on_event("startup")
async def startup_event():
    """Initialize ML models and database connection on startup"""
    global attendance_analyzer, communication_processor, report_generator, task_prioritizer, engagement_analyzer, db_connection
    
    logger.info("Starting EdTech ML Services...")
    
    try:
        # Initialize database connection
        db_connection = DatabaseConnection()
        logger.info("Database connection established")
        
        # Initialize ML models (placeholder for now)
        # attendance_analyzer = AttendanceAnalyzer()
        # communication_processor = CommunicationProcessor()
        # report_generator = ReportGenerator()
        # task_prioritizer = TaskPrioritizer()
        # engagement_analyzer = EngagementAnalyzer()
        
        logger.info("ML models initialized")
        logger.info("EdTech ML Services ready!")
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EdTech Platform ML Services",
        "version": "1.0.0",
        "status": "running",
        "pain_points": ["#1: Teacher Administrative Burden", "#5: Parent-School Communication"],
        "endpoints": {
            "attendance": "/api/v1/attendance/analyze",
            "communication": "/api/v1/communication/process",
            "reports": "/api/v1/reports/generate",
            "tasks": "/api/v1/tasks/prioritize",
            "fees": "/api/v1/fees/analyze",
            "engagement": "/api/v1/engagement/analyze"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "connected" if db_connection else "disconnected",
            "ml_models": "initialized" if attendance_analyzer else "not_initialized"
        }
    }

# Pain Point #1: Teacher Administrative Burden

@app.post("/api/v1/attendance/analyze", response_model=AttendanceResponse)
async def analyze_attendance(request: AttendanceRequest):
    """
    Analyze attendance patterns and predict absenteeism (Pain Point #1)
    """
    start_time = datetime.now()
    
    try:
        # Placeholder for actual ML analysis
        # For now, return mock data
        analysis_result = {
            "school_id": request.school_id,
            "total_students": 250,
            "attendance_rate": 0.92,
            "patterns": {
                "weekly_pattern": {"Monday": 0.89, "Tuesday": 0.93, "Wednesday": 0.94, "Thursday": 0.92, "Friday": 0.95},
                "monthly_trend": {"January": 0.94, "February": 0.93, "March": 0.91, "April": 0.90, "May": 0.88, "June": 0.85},
                "seasonal_factors": ["Monsoon season shows 5% decrease", "Winter shows 2% increase"]
            },
            "predictions": {
                "next_week_attendance": 0.91,
                "at_risk_students": [101, 203, 456, 789],
                "absenteeism_probability": 0.08
            },
            "alerts": [
                {"student_id": 101, "type": "frequent_absence", "severity": "high"},
                {"student_id": 203, "type": "pattern_change", "severity": "medium"}
            ]
        }
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return AttendanceResponse(
            school_id=analysis_result["school_id"],
            total_students=analysis_result["total_students"],
            attendance_rate=analysis_result["attendance_rate"],
            patterns=analysis_result["patterns"],
            predictions=analysis_result["predictions"],
            alerts=analysis_result["alerts"],
            generated_at=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error in attendance analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Attendance analysis failed: {str(e)}")

@app.post("/api/v1/reports/generate", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    """
    Generate AI-powered reports (Pain Point #1)
    """
    start_time = datetime.now()
    
    try:
        # Placeholder for actual report generation
        report_content = {
            "summary": f"Comprehensive {request.report_type} report for School {request.school_id}",
            "period": f"{request.date_range['start']} to {request.date_range['end']}",
            "key_metrics": {
                "attendance_rate": 0.92,
                "academic_performance": 0.85,
                "fee_collection_rate": 0.88
            },
            "detailed_analysis": "Detailed analysis would be generated here..."
        }
        
        insights = [
            {"type": "attendance", "insight": "Attendance improves by 3% on Fridays", "confidence": 0.85},
            {"type": "academic", "insight": "Mathematics performance shows upward trend", "confidence": 0.78},
            {"type": "fee", "insight": "Online payments increased by 15%", "confidence": 0.92}
        ]
        
        recommendations = [
            {"category": "attendance", "action": "Implement early morning activities to improve Monday attendance"},
            {"category": "academic", "action": "Provide additional support for struggling students"},
            {"category": "communication", "action": "Send fee reminders 3 days before due date"}
        ]
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return ReportResponse(
            report_id=f"RPT_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            report_type=request.report_type,
            school_id=request.school_id,
            generated_at=datetime.now(),
            content=report_content,
            insights=insights,
            recommendations=recommendations,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in report generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@app.post("/api/v1/tasks/prioritize", response_model=TaskResponse)
async def prioritize_tasks(request: TaskRequest):
    """
    Prioritize and schedule teacher tasks (Pain Point #1)
    """
    start_time = datetime.now()
    
    try:
        # Placeholder for actual task prioritization
        prioritized_tasks = []
        for i, task in enumerate(request.tasks):
            priority_score = 0.8 - (i * 0.1)  # Mock priority calculation
            prioritized_tasks.append({
                **task,
                "priority_score": priority_score,
                "priority_level": "high" if priority_score > 0.7 else "medium" if priority_score > 0.4 else "low",
                "estimated_duration": random.randint(30, 180),
                "deadline_urgency": random.uniform(0.1, 1.0)
            })
        
        # Sort by priority score
        prioritized_tasks.sort(key=lambda x: x["priority_score"], reverse=True)
        
        workload_analysis = {
            "total_tasks": len(prioritized_tasks),
            "estimated_total_time": sum(task["estimated_duration"] for task in prioritized_tasks),
            "workload_distribution": {"high": 0.4, "medium": 0.4, "low": 0.2},
            "stress_level": "moderate"
        }
        
        scheduling_suggestions = [
            {"task_id": task.get("id", i), "suggested_time": "morning", "reason": "High priority tasks"},
            {"task_id": task.get("id", i+1), "suggested_time": "afternoon", "reason": "Medium priority tasks"}
        ]
        
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
        raise HTTPException(status_code=500, detail=f"Task prioritization failed: {str(e)}")

@app.post("/api/v1/fees/analyze", response_model=FeeResponse)
async def analyze_fees(request: FeeRequest):
    """
    Analyze fee payment patterns and predict defaults (Pain Point #1 & #5)
    """
    start_time = datetime.now()
    
    try:
        # Placeholder for actual fee analysis
        payment_analysis = {
            "total_students": 250,
            "payment_rate": 0.88,
            "average_payment_time": 2.5,  # days after due date
            "payment_methods": {"Online": 0.6, "Cash": 0.25, "Cheque": 0.1, "UPI": 0.05},
            "seasonal_patterns": {"Summer": 0.82, "Monsoon": 0.85, "Winter": 0.92}
        }
        
        predictions = {
            "next_month_payment_rate": 0.90,
            "at_risk_payments": [101, 203, 456],
            "expected_revenue": 2250000,
            "default_probability": 0.12
        }
        
        recommendations = [
            {"type": "communication", "action": "Send personalized payment reminders"},
            {"type": "incentive", "action": "Offer 2% discount for early payments"},
            {"type": "support", "action": "Provide payment plan options for struggling families"}
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
        raise HTTPException(status_code=500, detail=f"Fee analysis failed: {str(e)}")

# Pain Point #5: Parent-School Communication

@app.post("/api/v1/communication/process", response_model=CommunicationResponse)
async def process_communication(request: CommunicationRequest):
    """
    Process communication with sentiment analysis and language detection (Pain Point #5)
    """
    start_time = datetime.now()
    
    try:
        # Placeholder for actual communication processing
        # Mock sentiment analysis
        sentiment_scores = {
            "positive": 0.6,
            "negative": 0.2,
            "neutral": 0.2
        }
        
        sentiment_score = sentiment_scores["positive"]  # Mock calculation
        sentiment_label = "positive" if sentiment_score > 0.5 else "negative" if sentiment_score < 0.3 else "neutral"
        
        # Mock language detection
        language_detected = request.language or "English"
        
        # Mock urgency calculation
        urgency_keywords = ["urgent", "immediate", "asap", "emergency", "critical"]
        urgency_score = sum(1 for keyword in urgency_keywords if keyword in request.message_content.lower()) / len(urgency_keywords)
        
        # Mock response suggestion
        suggested_response = "Thank you for your message. We will address this promptly."
        
        # Mock engagement prediction
        engagement_prediction = 0.75  # 75% chance of response
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return CommunicationResponse(
            message_id=f"MSG_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            sentiment_score=sentiment_score,
            sentiment_label=sentiment_label,
            language_detected=language_detected,
            urgency_score=urgency_score,
            suggested_response=suggested_response,
            engagement_prediction=engagement_prediction,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in communication processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Communication processing failed: {str(e)}")

@app.post("/api/v1/engagement/analyze", response_model=EngagementResponse)
async def analyze_engagement(request: EngagementRequest):
    """
    Analyze parent engagement patterns (Pain Point #5)
    """
    start_time = datetime.now()
    
    try:
        # Placeholder for actual engagement analysis
        engagement_score = 0.78  # Mock calculation based on communication history
        
        communication_patterns = {
            "response_rate": 0.85,
            "average_response_time": 2.3,  # hours
            "preferred_communication_time": "evening",
            "preferred_language": "English",
            "engagement_trend": "increasing"
        }
        
        recommendations = [
            {"type": "timing", "action": "Send messages between 6-8 PM for better response rates"},
            {"type": "content", "action": "Use shorter, more direct messages"},
            {"type": "frequency", "action": "Limit to 2-3 messages per week to avoid overwhelming"}
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
        raise HTTPException(status_code=500, detail=f"Engagement analysis failed: {str(e)}")

# Utility endpoints

@app.post("/api/v1/data/generate")
async def generate_dummy_data(background_tasks: BackgroundTasks):
    """
    Generate dummy data for testing and development
    """
    try:
        background_tasks.add_task(generate_data_task)
        return {"message": "Data generation started in background", "status": "processing"}
    except Exception as e:
        logger.error(f"Error starting data generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Data generation failed: {str(e)}")

async def generate_data_task():
    """Background task to generate dummy data"""
    try:
        generator = EdTechDataGenerator()
        data = generator.generate_all_data()
        generator.save_data(data)
        logger.info("Dummy data generation completed")
    except Exception as e:
        logger.error(f"Error in data generation task: {str(e)}")

@app.get("/api/v1/models/status")
async def get_models_status():
    """Get status of ML models"""
    return {
        "models": {
            "attendance_analyzer": "initialized" if attendance_analyzer else "not_initialized",
            "communication_processor": "initialized" if communication_processor else "not_initialized",
            "report_generator": "initialized" if report_generator else "not_initialized",
            "task_prioritizer": "initialized" if task_prioritizer else "not_initialized",
            "engagement_analyzer": "initialized" if engagement_analyzer else "not_initialized"
        },
        "database": "connected" if db_connection else "disconnected"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 