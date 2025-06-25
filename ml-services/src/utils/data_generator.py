"""
EdTech Platform - Dummy Data Generator
Generates realistic training data for ML models addressing Pain Points #1 and #5
"""

import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Tuple

class EdTechDataGenerator:
    """Generates dummy data for EdTech platform ML training"""
    
    def __init__(self, num_schools: int = 5, num_students: int = 1000, num_teachers: int = 50):
        self.num_schools = num_schools
        self.num_students = num_students
        self.num_teachers = num_teachers
        self.start_date = datetime(2024, 1, 1)
        self.end_date = datetime(2024, 6, 30)
        
        # School names and details
        self.schools = [
            {"name": "Bright Future Academy", "board": "CBSE", "location": "Mumbai"},
            {"name": "Excellence International School", "board": "ICSE", "location": "Delhi"},
            {"name": "Knowledge Valley School", "board": "State Board", "location": "Bangalore"},
            {"name": "Global Learning Center", "board": "CBSE", "location": "Chennai"},
            {"name": "Innovation School", "board": "ICSE", "location": "Hyderabad"}
        ]
        
        # Subjects for different boards
        self.subjects = {
            "CBSE": ["Mathematics", "Science", "English", "Hindi", "Social Studies", "Computer Science"],
            "ICSE": ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Geography"],
            "State Board": ["Mathematics", "Science", "English", "Regional Language", "Social Studies"]
        }
        
        # Fee structures
        self.fee_structures = {
            "CBSE": {"monthly": 8000, "quarterly": 22000, "annual": 80000},
            "ICSE": {"monthly": 12000, "quarterly": 33000, "annual": 120000},
            "State Board": {"monthly": 5000, "quarterly": 14000, "annual": 50000}
        }

    def generate_schools_data(self) -> pd.DataFrame:
        """Generate school information"""
        schools_data = []
        for i in range(self.num_schools):
            school = self.schools[i] if i < len(self.schools) else {
                "name": f"School {i+1}",
                "board": random.choice(["CBSE", "ICSE", "State Board"]),
                "location": random.choice(["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"])
            }
            
            schools_data.append({
                "school_id": i + 1,
                "school_name": school["name"],
                "board": school["board"],
                "location": school["location"],
                "total_students": random.randint(200, 800),
                "total_teachers": random.randint(20, 60),
                "established_year": random.randint(1990, 2010),
                "accreditation": random.choice(["A+", "A", "B+", "B"]),
                "fee_structure": self.fee_structures[school["board"]]
            })
        
        return pd.DataFrame(schools_data)

    def generate_users_data(self) -> pd.DataFrame:
        """Generate users (teachers, parents, students)"""
        users_data = []
        
        # Generate teachers
        for i in range(self.num_teachers):
            school_id = random.randint(1, self.num_schools)
            school = self.schools[school_id - 1] if school_id <= len(self.schools) else {"board": "CBSE"}
            subjects = self.subjects[school["board"]]
            
            users_data.append({
                "user_id": i + 1,
                "username": f"teacher{i+1}",
                "email": f"teacher{i+1}@school{school_id}.edu",
                "role": "teacher",
                "school_id": school_id,
                "subject": random.choice(subjects),
                "experience_years": random.randint(1, 15),
                "qualification": random.choice(["B.Ed", "M.Ed", "PhD"]),
                "created_at": self.start_date - timedelta(days=random.randint(30, 365))
            })
        
        # Generate students and parents
        for i in range(self.num_students):
            student_id = self.num_teachers + i + 1
            parent_id = student_id + self.num_students
            school_id = random.randint(1, self.num_schools)
            school = self.schools[school_id - 1] if school_id <= len(self.schools) else {"board": "CBSE"}
            
            # Student
            users_data.append({
                "user_id": student_id,
                "username": f"student{i+1}",
                "email": f"student{i+1}@school{school_id}.edu",
                "role": "student",
                "school_id": school_id,
                "class": random.randint(1, 12),
                "section": random.choice(["A", "B", "C", "D"]),
                "parent_id": parent_id,
                "created_at": self.start_date - timedelta(days=random.randint(30, 365))
            })
            
            # Parent
            users_data.append({
                "user_id": parent_id,
                "username": f"parent{i+1}",
                "email": f"parent{i+1}@email.com",
                "role": "parent",
                "school_id": school_id,
                "phone": f"+91{random.randint(7000000000, 9999999999)}",
                "preferred_language": random.choice(["English", "Hindi", "Tamil", "Telugu", "Kannada"]),
                "created_at": self.start_date - timedelta(days=random.randint(30, 365))
            })
        
        return pd.DataFrame(users_data)

    def generate_attendance_data(self) -> pd.DataFrame:
        """Generate attendance data for Pain Point #1"""
        attendance_data = []
        current_date = self.start_date
        
        while current_date <= self.end_date:
            # Skip weekends
            if current_date.weekday() < 5:  # Monday to Friday
                for student_id in range(self.num_teachers + 1, self.num_teachers + self.num_students + 1):
                    # Generate realistic attendance patterns
                    base_attendance_rate = 0.92  # 92% base attendance
                    
                    # Add seasonal variations (lower attendance in monsoon, higher in winter)
                    if current_date.month in [6, 7, 8]:  # Monsoon
                        base_attendance_rate -= 0.05
                    elif current_date.month in [12, 1, 2]:  # Winter
                        base_attendance_rate += 0.02
                    
                    # Add weekly patterns (lower on Mondays, higher on Fridays)
                    if current_date.weekday() == 0:  # Monday
                        base_attendance_rate -= 0.03
                    elif current_date.weekday() == 4:  # Friday
                        base_attendance_rate += 0.02
                    
                    # Individual student variations
                    student_variation = random.uniform(-0.1, 0.1)
                    final_attendance_rate = max(0.7, min(0.98, base_attendance_rate + student_variation))
                    
                    is_present = random.random() < final_attendance_rate
                    
                    if is_present:
                        # Generate QR scan time (between 8:00 AM and 9:30 AM)
                        scan_hour = 8
                        scan_minute = random.randint(0, 90)
                        if scan_minute >= 60:
                            scan_hour += 1
                            scan_minute -= 60
                        scan_time = current_date.replace(hour=scan_hour, minute=scan_minute)
                    else:
                        scan_time = None
                    
                    attendance_data.append({
                        "attendance_id": len(attendance_data) + 1,
                        "student_id": student_id,
                        "date": current_date.date(),
                        "is_present": is_present,
                        "scan_time": scan_time,
                        "qr_code": f"QR_{current_date.strftime('%Y%m%d')}_{student_id}",
                        "created_at": current_date
                    })
            
            current_date += timedelta(days=1)
        
        return pd.DataFrame(attendance_data)

    def generate_communication_data(self) -> pd.DataFrame:
        """Generate communication data for Pain Point #5"""
        communication_data = []
        
        # Generate messages over the last 6 months
        for day in range(180):
            current_date = self.end_date - timedelta(days=day)
            
            # Generate 5-15 messages per day
            num_messages = random.randint(5, 15)
            
            for _ in range(num_messages):
                sender_id = random.randint(1, self.num_teachers + self.num_students)
                sender_role = "teacher" if sender_id <= self.num_teachers else "parent"
                
                if sender_role == "teacher":
                    receiver_id = random.randint(self.num_teachers + 1, self.num_teachers + self.num_students)
                    receiver_role = "parent"
                else:
                    receiver_id = random.randint(1, self.num_teachers)
                    receiver_role = "teacher"
                
                # Generate realistic message content
                message_templates = {
                    "attendance": [
                        "Your child was absent today. Please provide a reason.",
                        "Great attendance this week! Keep it up.",
                        "Please ensure regular attendance for better performance."
                    ],
                    "academic": [
                        "Your child's performance has improved significantly.",
                        "Please review the homework assigned today.",
                        "Exam schedule has been updated. Please check."
                    ],
                    "fee": [
                        "Fee payment is due. Please complete the payment.",
                        "Thank you for the timely fee payment.",
                        "Payment reminder: Please clear pending fees."
                    ],
                    "general": [
                        "Parent-teacher meeting scheduled for next week.",
                        "School event notification: Annual day celebration.",
                        "Important announcement: School will be closed tomorrow."
                    ]
                }
                
                message_type = random.choice(list(message_templates.keys()))
                message_content = random.choice(message_templates[message_type])
                
                # Add language variations
                languages = ["English", "Hindi", "Tamil", "Telugu", "Kannada"]
                language = random.choice(languages)
                
                # Generate sentiment (positive, negative, neutral)
                sentiment_scores = {
                    "attendance": {"positive": 0.3, "negative": 0.4, "neutral": 0.3},
                    "academic": {"positive": 0.6, "negative": 0.2, "neutral": 0.2},
                    "fee": {"positive": 0.2, "negative": 0.5, "neutral": 0.3},
                    "general": {"positive": 0.4, "negative": 0.1, "neutral": 0.5}
                }
                
                sentiment = np.random.choice(
                    ["positive", "negative", "neutral"],
                    p=[sentiment_scores[message_type]["positive"], 
                       sentiment_scores[message_type]["negative"], 
                       sentiment_scores[message_type]["neutral"]]
                )
                
                communication_data.append({
                    "message_id": len(communication_data) + 1,
                    "sender_id": sender_id,
                    "receiver_id": receiver_id,
                    "message_type": message_type,
                    "content": message_content,
                    "language": language,
                    "sentiment": sentiment,
                    "is_read": random.choice([True, False]),
                    "response_time_minutes": random.randint(5, 1440) if random.random() < 0.8 else None,
                    "created_at": current_date - timedelta(hours=random.randint(0, 23))
                })
        
        return pd.DataFrame(communication_data)

    def generate_fee_data(self) -> pd.DataFrame:
        """Generate fee payment data"""
        fee_data = []
        
        for student_id in range(self.num_teachers + 1, self.num_teachers + self.num_students + 1):
            # Get student's school
            student_school = random.randint(1, self.num_schools)
            school = self.schools[student_school - 1] if student_school <= len(self.schools) else {"board": "CBSE"}
            fee_structure = self.fee_structures[school["board"]]
            
            # Generate fee records for the last 6 months
            for month in range(6):
                due_date = self.start_date + timedelta(days=month * 30)
                amount = fee_structure["monthly"]
                
                # Payment behavior patterns
                payment_probability = 0.85  # 85% payment rate
                
                # Add seasonal variations
                if month in [5, 6]:  # Summer vacation
                    payment_probability -= 0.1
                
                is_paid = random.random() < payment_probability
                
                if is_paid:
                    payment_date = due_date + timedelta(days=random.randint(-5, 15))
                    payment_method = random.choice(["Online", "Cash", "Cheque", "UPI"])
                    late_fee = max(0, (payment_date - due_date).days * 50) if payment_date > due_date else 0
                else:
                    payment_date = None
                    payment_method = None
                    late_fee = 0
                
                fee_data.append({
                    "fee_id": len(fee_data) + 1,
                    "student_id": student_id,
                    "month": due_date.month,
                    "year": due_date.year,
                    "amount": amount,
                    "due_date": due_date.date(),
                    "is_paid": is_paid,
                    "payment_date": payment_date.date() if payment_date else None,
                    "payment_method": payment_method,
                    "late_fee": late_fee,
                    "created_at": due_date
                })
        
        return pd.DataFrame(fee_data)

    def generate_all_data(self) -> Dict[str, pd.DataFrame]:
        """Generate all dummy data"""
        print("Generating EdTech Platform dummy data...")
        
        data = {
            "schools": self.generate_schools_data(),
            "users": self.generate_users_data(),
            "attendance": self.generate_attendance_data(),
            "communication": self.generate_communication_data(),
            "fees": self.generate_fee_data()
        }
        
        print(f"Generated data:")
        for key, df in data.items():
            print(f"  - {key}: {len(df)} records")
        
        return data

    def save_data(self, data: Dict[str, pd.DataFrame], output_dir: str = "ml-services/data"):
        """Save generated data to files"""
        os.makedirs(output_dir, exist_ok=True)
        
        for key, df in data.items():
            # Save as CSV
            csv_path = os.path.join(output_dir, f"{key}.csv")
            df.to_csv(csv_path, index=False)
            
            # Save as JSON for API testing
            json_path = os.path.join(output_dir, f"{key}.json")
            df.to_json(json_path, orient='records', date_format='iso')
            
            print(f"Saved {key} data to {csv_path} and {json_path}")

def main():
    """Main function to generate and save dummy data"""
    generator = EdTechDataGenerator(
        num_schools=5,
        num_students=1000,
        num_teachers=50
    )
    
    # Generate all data
    data = generator.generate_all_data()
    
    # Save data
    generator.save_data(data)
    
    print("\n✅ Dummy data generation completed!")
    print("📁 Data saved to ml-services/data/ directory")
    print("📊 Ready for ML model training")

if __name__ == "__main__":
    main() 