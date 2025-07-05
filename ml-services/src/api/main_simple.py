"""
EdTech Platform - ML Services API (Simplified)
FastAPI application for ML-powered features
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import uvicorn
import logging
from datetime import datetime
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="EdTech Platform ML Services",
    description="ML-powered services for EdTech platform",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class SentimentAnalysisRequest(BaseModel):
    text: str
    context: Optional[str] = "general"

class SentimentAnalysisResponse(BaseModel):
    polarity: float
    subjectivity: float
    label: str
    processing_time_ms: float

class PaperGenerationRequest(BaseModel):
    subject: str
    topics: List[str]
    num_questions: int = 5
    difficulty_level: str = "medium"

class PaperGenerationResponse(BaseModel):
    subject: str
    questions: List[str]
    difficulty_level: str
    processing_time_ms: float

class VisualContentRequest(BaseModel):
    image_features: List[float]
    content_type: Optional[str] = None

class VisualContentResponse(BaseModel):
    content_type: str
    confidence: float
    processing_time_ms: float

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EdTech Platform ML Services",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "sentiment": "/api/v1/sentiment/analyze",
            "paper_generation": "/api/v1/paper/generate",
            "visual_content": "/api/v1/visual/analyze"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/sentiment/analyze", response_model=SentimentAnalysisResponse)
async def analyze_sentiment(request: SentimentAnalysisRequest):
    """Analyze sentiment of text"""
    start_time = datetime.now()
    
    try:
        # Simple sentiment analysis based on keywords
        text_lower = request.text.lower()
        
        positive_words = ["good", "great", "excellent", "amazing", "wonderful", "happy", "love", "like"]
        negative_words = ["bad", "terrible", "awful", "hate", "dislike", "sad", "angry", "frustrated"]
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            polarity = 0.6
            label = "positive"
        elif negative_count > positive_count:
            polarity = -0.4
            label = "negative"
        else:
            polarity = 0.0
            label = "neutral"
        
        subjectivity = 0.5
        
        processing_time = (datetime.now() - start_time).microseconds / 1000
        
        return SentimentAnalysisResponse(
            polarity=polarity,
            subjectivity=subjectivity,
            label=label,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/paper/generate", response_model=PaperGenerationResponse)
async def generate_paper(request: PaperGenerationRequest):
    """Generate exam questions"""
    start_time = datetime.now()
    
    try:
        questions = []
        for i in range(request.num_questions):
            topic = random.choice(request.topics) if request.topics else "General"
            question = f"Explain the concept of {topic} in {request.subject}."
            questions.append(question)
        
        processing_time = (datetime.now() - start_time).microseconds / 1000
        
        return PaperGenerationResponse(
            subject=request.subject,
            questions=questions,
            difficulty_level=request.difficulty_level,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in paper generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/visual/analyze", response_model=VisualContentResponse)
async def analyze_visual_content(request: VisualContentRequest):
    """Analyze visual learning content"""
    start_time = datetime.now()
    
    try:
        # Simple classification based on feature values
        if len(request.image_features) != 20:
            raise HTTPException(status_code=400, detail="Image features must have exactly 20 values")
        
        # Simple rule-based classification
        avg_feature = sum(request.image_features) / len(request.image_features)
        
        if avg_feature > 0.7:
            content_type = "diagram"
        elif avg_feature > 0.4:
            content_type = "chart"
        else:
            content_type = "text"
        
        confidence = random.uniform(0.7, 0.95)
        
        processing_time = (datetime.now() - start_time).microseconds / 1000
        
        return VisualContentResponse(
            content_type=content_type,
            confidence=confidence,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error in visual content analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 