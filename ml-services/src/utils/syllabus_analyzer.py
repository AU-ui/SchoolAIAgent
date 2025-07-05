"""
EdTech Platform - Syllabus Analyzer
Intelligent syllabus selection and analysis for paper generation
"""

import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SyllabusAnalyzer:
    """
    Intelligent syllabus analyzer for paper generation
    Handles board-specific syllabus, topic selection, and difficulty mapping
    """
    
    def __init__(self):
        self.syllabus_data = self._load_syllabus_data()
        self.topic_difficulty_mapping = self._load_difficulty_mapping()
        self.question_bank = self._load_question_bank()
    
    def _load_syllabus_data(self) -> Dict[str, Any]:
        """Load comprehensive syllabus data for different boards"""
        return {
            "CBSE": {
                "class_10": {
                    "Mathematics": {
                        "units": [
                            {
                                "name": "Real Numbers",
                                "topics": ["Euclid's Division Lemma", "Fundamental Theorem of Arithmetic", "Irrational Numbers"],
                                "weightage": 6,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Polynomials",
                                "topics": ["Zeroes of Polynomial", "Relationship between Zeroes and Coefficients", "Division Algorithm"],
                                "weightage": 4,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Pair of Linear Equations",
                                "topics": ["Graphical Method", "Algebraic Methods", "Cross Multiplication Method"],
                                "weightage": 6,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Quadratic Equations",
                                "topics": ["Solution by Factorization", "Solution by Completing Square", "Quadratic Formula"],
                                "weightage": 6,
                                "difficulty": "hard",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Arithmetic Progressions",
                                "topics": ["General Term", "Sum of n Terms", "Applications"],
                                "weightage": 4,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Triangles",
                                "topics": ["Similarity of Triangles", "Pythagoras Theorem", "Basic Proportionality Theorem"],
                                "weightage": 6,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Coordinate Geometry",
                                "topics": ["Distance Formula", "Section Formula", "Area of Triangle"],
                                "weightage": 4,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Trigonometry",
                                "topics": ["Trigonometric Ratios", "Trigonometric Identities", "Applications"],
                                "weightage": 5,
                                "difficulty": "hard",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Applications of Trigonometry",
                                "topics": ["Heights and Distances", "Real-life Applications"],
                                "weightage": 4,
                                "difficulty": "hard",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Circles",
                                "topics": ["Tangent to Circle", "Number of Tangents", "Properties of Tangents"],
                                "weightage": 4,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Constructions",
                                "topics": ["Division of Line Segment", "Construction of Tangents"],
                                "weightage": 3,
                                "difficulty": "medium",
                                "question_types": ["long_answer"]
                            },
                            {
                                "name": "Areas Related to Circles",
                                "topics": ["Area of Sector", "Area of Segment", "Areas of Combinations"],
                                "weightage": 3,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Surface Areas and Volumes",
                                "topics": ["Surface Area", "Volume", "Combinations of Solids"],
                                "weightage": 4,
                                "difficulty": "medium",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Statistics",
                                "topics": ["Mean", "Median", "Mode", "Cumulative Frequency"],
                                "weightage": 4,
                                "difficulty": "easy",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            },
                            {
                                "name": "Probability",
                                "topics": ["Theoretical Probability", "Experimental Probability"],
                                "weightage": 3,
                                "difficulty": "easy",
                                "question_types": ["mcq", "short_answer", "long_answer"]
                            }
                        ],
                        "total_marks": 80,
                        "duration": "3 hours",
                        "paper_pattern": {
                            "section_a": {"type": "mcq", "questions": 20, "marks_per_question": 1},
                            "section_b": {"type": "short_answer", "questions": 6, "marks_per_question": 2},
                            "section_c": {"type": "short_answer", "questions": 8, "marks_per_question": 3},
                            "section_d": {"type": "long_answer", "questions": 6, "marks_per_question": 4}
                        }
                    },
                    "Science": {
                        "units": [
                            {
                                "name": "Chemical Reactions and Equations",
                                "topics": ["Chemical Changes", "Balancing Equations", "Types of Reactions"],
                                "weightage": 5,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Acids, Bases and Salts",
                                "topics": ["pH Scale", "Neutralization", "Salts"],
                                "weightage": 5,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Metals and Non-metals",
                                "topics": ["Physical Properties", "Chemical Properties", "Reactivity Series"],
                                "weightage": 5,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Carbon and its Compounds",
                                "topics": ["Covalent Bonding", "Hydrocarbons", "Functional Groups"],
                                "weightage": 4,
                                "difficulty": "hard"
                            },
                            {
                                "name": "Life Processes",
                                "topics": ["Nutrition", "Respiration", "Transportation", "Excretion"],
                                "weightage": 6,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Control and Coordination",
                                "topics": ["Nervous System", "Endocrine System", "Plant Hormones"],
                                "weightage": 4,
                                "difficulty": "medium"
                            },
                            {
                                "name": "How do Organisms Reproduce",
                                "topics": ["Asexual Reproduction", "Sexual Reproduction", "Reproductive Health"],
                                "weightage": 4,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Heredity and Evolution",
                                "topics": ["Inheritance", "Variation", "Evolution"],
                                "weightage": 4,
                                "difficulty": "hard"
                            },
                            {
                                "name": "Light - Reflection and Refraction",
                                "topics": ["Reflection", "Refraction", "Lenses", "Mirrors"],
                                "weightage": 5,
                                "difficulty": "hard"
                            },
                            {
                                "name": "Human Eye and Colourful World",
                                "topics": ["Eye Structure", "Defects", "Dispersion", "Scattering"],
                                "weightage": 3,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Electricity",
                                "topics": ["Ohm's Law", "Resistance", "Series and Parallel Circuits"],
                                "weightage": 5,
                                "difficulty": "hard"
                            },
                            {
                                "name": "Magnetic Effects of Electric Current",
                                "topics": ["Magnetic Field", "Electromagnetic Induction", "Electric Motor"],
                                "weightage": 4,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Sources of Energy",
                                "topics": ["Conventional Sources", "Non-conventional Sources", "Environmental Impact"],
                                "weightage": 3,
                                "difficulty": "easy"
                            },
                            {
                                "name": "Our Environment",
                                "topics": ["Ecosystem", "Food Chains", "Environmental Problems"],
                                "weightage": 3,
                                "difficulty": "easy"
                            },
                            {
                                "name": "Management of Natural Resources",
                                "topics": ["Conservation", "Sustainable Development", "Local Management"],
                                "weightage": 3,
                                "difficulty": "easy"
                            }
                        ],
                        "total_marks": 80,
                        "duration": "3 hours"
                    }
                }
            },
            "ICSE": {
                "class_10": {
                    "Mathematics": {
                        "units": [
                            {
                                "name": "Commercial Mathematics",
                                "topics": ["Compound Interest", "Shares and Dividends", "Banking"],
                                "weightage": 15,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Algebra",
                                "topics": ["Linear Inequations", "Quadratic Equations", "Ratio and Proportion"],
                                "weightage": 25,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Geometry",
                                "topics": ["Similarity", "Loci", "Circles"],
                                "weightage": 20,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Mensuration",
                                "topics": ["Area and Volume", "Surface Area", "Combinations"],
                                "weightage": 15,
                                "difficulty": "medium"
                            },
                            {
                                "name": "Trigonometry",
                                "topics": ["Trigonometric Ratios", "Heights and Distances"],
                                "weightage": 15,
                                "difficulty": "hard"
                            },
                            {
                                "name": "Statistics",
                                "topics": ["Mean", "Median", "Mode", "Histograms"],
                                "weightage": 10,
                                "difficulty": "easy"
                            }
                        ],
                        "total_marks": 80,
                        "duration": "2.5 hours"
                    }
                }
            }
        }
    
    def _load_difficulty_mapping(self) -> Dict[str, Dict[str, Any]]:
        """Load difficulty mapping for topics and question types"""
        return {
            "easy": {
                "description": "Basic understanding required",
                "time_per_question": {"mcq": 1, "short_answer": 3, "long_answer": 8},
                "marks_range": {"mcq": 1, "short_answer": 2, "long_answer": 4},
                "cognitive_level": "Remembering, Understanding"
            },
            "medium": {
                "description": "Application and analysis required",
                "time_per_question": {"mcq": 2, "short_answer": 5, "long_answer": 12},
                "marks_range": {"mcq": 1, "short_answer": 3, "long_answer": 6},
                "cognitive_level": "Applying, Analyzing"
            },
            "hard": {
                "description": "Synthesis and evaluation required",
                "time_per_question": {"mcq": 3, "short_answer": 8, "long_answer": 20},
                "marks_range": {"mcq": 1, "short_answer": 4, "long_answer": 8},
                "cognitive_level": "Evaluating, Creating"
            }
        }
    
    def _load_question_bank(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load question bank templates for different topics"""
        return {
            "Mathematics": {
                "Real Numbers": [
                    {
                        "question": "Prove that √2 is irrational.",
                        "type": "long_answer",
                        "difficulty": "hard",
                        "marks": 4,
                        "solution": "Using contradiction method...",
                        "topics": ["Irrational Numbers", "Proof by Contradiction"]
                    },
                    {
                        "question": "Find the HCF of 96 and 404 by prime factorization method.",
                        "type": "short_answer",
                        "difficulty": "medium",
                        "marks": 3,
                        "solution": "96 = 2^5 × 3, 404 = 2^2 × 101...",
                        "topics": ["Prime Factorization", "HCF"]
                    }
                ],
                "Polynomials": [
                    {
                        "question": "If α and β are the zeroes of the polynomial x² - 5x + 6, find α² + β².",
                        "type": "short_answer",
                        "difficulty": "medium",
                        "marks": 3,
                        "solution": "Using α + β = 5, αβ = 6...",
                        "topics": ["Zeroes of Polynomial", "Relationships"]
                    }
                ]
            }
        }
    
    def get_syllabus(self, board: str, class_level: str, subject: str) -> Dict[str, Any]:
        """Get syllabus for specific board, class, and subject"""
        try:
            syllabus = self.syllabus_data.get(board, {}).get(class_level, {}).get(subject, {})
            if not syllabus:
                raise ValueError(f"Syllabus not found for {board} {class_level} {subject}")
            return syllabus
        except Exception as e:
            logger.error(f"Error getting syllabus: {str(e)}")
            raise
    
    def select_topics(self, board: str, class_level: str, subject: str, 
                     total_marks: int, topic_preferences: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Intelligently select topics based on weightage and preferences"""
        syllabus = self.get_syllabus(board, class_level, subject)
        units = syllabus.get("units", [])
        
        # If specific topics are preferred, prioritize them
        if topic_preferences:
            selected_units = [unit for unit in units if unit["name"] in topic_preferences]
        else:
            selected_units = units
        
        # Calculate topic distribution based on weightage
        total_weightage = sum(unit["weightage"] for unit in selected_units)
        topic_distribution = []
        
        for unit in selected_units:
            marks_allocation = int((unit["weightage"] / total_weightage) * total_marks)
            topic_distribution.append({
                "unit_name": unit["name"],
                "topics": unit["topics"],
                "allocated_marks": marks_allocation,
                "difficulty": unit["difficulty"],
                "question_types": unit.get("question_types", ["mcq", "short_answer", "long_answer"])
            })
        
        return topic_distribution
    
    def get_question_distribution(self, board: str, class_level: str, subject: str,
                                total_marks: int, difficulty_distribution: Dict[str, float]) -> Dict[str, Any]:
        """Get question distribution based on paper pattern and difficulty"""
        syllabus = self.get_syllabus(board, class_level, subject)
        paper_pattern = syllabus.get("paper_pattern", {})
        
        question_distribution = {}
        remaining_marks = total_marks
        
        for section, config in paper_pattern.items():
            section_marks = config["questions"] * config["marks_per_question"]
            if section_marks <= remaining_marks:
                question_distribution[section] = {
                    "type": config["type"],
                    "questions": config["questions"],
                    "marks_per_question": config["marks_per_question"],
                    "total_marks": section_marks,
                    "difficulty_distribution": difficulty_distribution
                }
                remaining_marks -= section_marks
        
        return question_distribution
    
    def validate_paper_requirements(self, board: str, class_level: str, subject: str,
                                  total_marks: int, duration: str) -> Dict[str, Any]:
        """Validate if paper requirements are feasible"""
        syllabus = self.get_syllabus(board, class_level, subject)
        
        validation_result = {
            "is_valid": True,
            "warnings": [],
            "suggestions": []
        }
        
        # Check total marks
        expected_marks = syllabus.get("total_marks", 80)
        if total_marks != expected_marks:
            validation_result["warnings"].append(f"Expected {expected_marks} marks for {board} {class_level} {subject}")
        
        # Check duration
        expected_duration = syllabus.get("duration", "3 hours")
        if duration != expected_duration:
            validation_result["warnings"].append(f"Expected duration: {expected_duration}")
        
        # Check if enough topics available
        units = syllabus.get("units", [])
        if len(units) < 3:
            validation_result["warnings"].append("Limited topics available for paper generation")
        
        return validation_result
    
    def get_learning_objectives(self, board: str, class_level: str, subject: str, 
                              topics: List[str]) -> List[str]:
        """Get learning objectives for selected topics"""
        syllabus = self.get_syllabus(board, class_level, subject)
        units = syllabus.get("units", [])
        
        objectives = []
        for unit in units:
            if unit["name"] in topics:
                for topic in unit["topics"]:
                    objectives.append(f"Understand and apply concepts of {topic}")
        
        return objectives
    
    def generate_paper_instructions(self, board: str, class_level: str, subject: str,
                                  total_marks: int, duration: str) -> str:
        """Generate paper instructions based on board and subject"""
        instructions = f"""
        {board} {class_level} {subject} Examination
        Total Marks: {total_marks}
        Duration: {duration}
        
        General Instructions:
        1. All questions are compulsory.
        2. Marks are indicated against each question.
        3. Use of calculator is not allowed.
        4. Draw neat diagrams wherever required.
        5. Write your answers clearly and legibly.
        """
        
        return instructions.strip()

# Example usage
if __name__ == "__main__":
    analyzer = SyllabusAnalyzer()
    
    # Get syllabus for CBSE Class 10 Mathematics
    syllabus = analyzer.get_syllabus("CBSE", "class_10", "Mathematics")
    print(f"CBSE Class 10 Mathematics has {len(syllabus['units'])} units")
    
    # Select topics for 80-mark paper
    topics = analyzer.select_topics("CBSE", "class_10", "Mathematics", 80)
    print(f"Selected {len(topics)} topics for paper generation")
    
    # Get question distribution
    distribution = analyzer.get_question_distribution(
        "CBSE", "class_10", "Mathematics", 80,
        {"easy": 0.3, "medium": 0.5, "hard": 0.2}
    )
    print(f"Question distribution: {distribution}") 