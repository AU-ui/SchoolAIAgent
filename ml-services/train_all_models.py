"""
EdTech Platform - ML Models Training Script
Trains all existing ML models for the platform
"""

import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def train_attendance_model():
    """Train attendance anomaly detection model"""
    logger.info("Training Attendance Anomaly Detection Model...")
    
    try:
        from utils.train_attendance_model import train_performance_model as train_attendance
        model = train_attendance()
        logger.info("✅ Attendance model trained successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error training attendance model: {str(e)}")
        return False

def train_performance_model():
    """Train student performance prediction model"""
    logger.info("Training Student Performance Prediction Model...")
    
    try:
        from models.student_performance_model import train_performance_model
        model = train_performance_model()
        logger.info("✅ Performance model trained successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error training performance model: {str(e)}")
        return False

def train_engagement_model():
    """Train parent engagement analytics model"""
    logger.info("Training Parent Engagement Analytics Model...")
    
    try:
        from models.parent_engagement_model import train_parent_engagement_model
        model = train_parent_engagement_model()
        logger.info("✅ Engagement model trained successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error training engagement model: {str(e)}")
        return False

def main():
    """Main training function"""
    logger.info("🚀 Starting ML Models Training...")
    
    # Create models directory if it doesn't exist
    models_dir = Path("src/models")
    models_dir.mkdir(exist_ok=True)
    
    # Train all models
    results = {
        "attendance": train_attendance_model(),
        "performance": train_performance_model(),
        "engagement": train_engagement_model()
    }
    
    # Summary
    logger.info("\n📊 Training Summary:")
    for model_name, success in results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        logger.info(f"  {model_name}: {status}")
    
    successful_models = sum(results.values())
    total_models = len(results)
    
    logger.info(f"\n🎯 Overall: {successful_models}/{total_models} models trained successfully")
    
    if successful_models == total_models:
        logger.info("🎉 All models trained successfully!")
    else:
        logger.warning("⚠️ Some models failed to train. Check logs above.")

if __name__ == "__main__":
    main() 