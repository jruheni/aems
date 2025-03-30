"""
Grading Helper Module
Provides functionality for automated grading using Mistral AI API
Includes various grading standards and text processing utilities
"""

import re
import os
import logging
import requests
import json
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from mistralai.exceptions import MistralException
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Mistral API key from environment variables
MISTRAL_API_KEY = os.environ.get('MISTRAL_API_KEY')
if not MISTRAL_API_KEY:
    logger.warning("MISTRAL_API_KEY not found in environment variables")

def get_mistral_api_key():
    """
    Retrieve and validate Mistral API key from environment
    """
    api_key = os.getenv('MISTRAL_API_KEY')
    if not api_key:
        logger.error("MISTRAL_API_KEY not set in environment variables")
        raise Exception("MISTRAL_API_KEY not set")
    return api_key

def create_mistral_client():
    """
    Create and configure Mistral API client
    """
    api_key = get_mistral_api_key()
    return MistralClient(api_key=api_key)

def analyze_answer(text, keywords, total_points):
    """
    Analyze student answer based on keyword presence
    """
    score = 0
    matched_keywords = []

    for keyword in keywords:
        if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', text.lower()):
            score += total_points / len(keywords)
            matched_keywords.append(keyword)

    return score, matched_keywords

def generate_feedback(score, matched_keywords, missing_keywords):
    """
    Generate feedback based on matched and missing keywords
    """
    feedback = []

    if matched_keywords:
        feedback.append("Good points mentioned: " + ", ".join(matched_keywords))

    if missing_keywords:
        feedback.append("Consider including: " + ", ".join(missing_keywords))

    return "\n".join(feedback)

def grade_exam(text, grading_criteria=None):
    """
    Grade text using keyword matching (offline fallback)
    """
    if grading_criteria is None:
        grading_criteria = {
            'keywords': ['concept1', 'concept2', 'concept3'],
            'total_points': 100
        }

    score, matched_keywords = analyze_answer(
        text,
        grading_criteria['keywords'],
        grading_criteria['total_points']
    )

    missing_keywords = [k for k in grading_criteria['keywords'] if k not in matched_keywords]
    feedback = generate_feedback(score, matched_keywords, missing_keywords)

    return {
        'score': round(score, 2),
        'feedback': feedback
    }

def extract_total_points(text):
    """
    Extract total points from question text (e.g. (10 marks), (15 pts))
    """
    try:
        match = re.search(r'\((\d+)[\s,]*(?:points|pts|marks|mks)\)', text, re.IGNORECASE)
        return int(match.group(1)) if match else 10
    except:
        return 10

def get_strictness_description(level):
    """
    Get grading standard description based on strictness level (1–4)
    """
    levels = {
        1: {
            "name": "Content Focus",
            "description": "Focus solely on content and understanding. Ignore spelling, grammar, and formatting issues.",
            "rules": [
                "Evaluate ONLY the core concepts and ideas",
                "COMPLETELY IGNORE all spelling mistakes",
                "COMPLETELY IGNORE all grammatical errors",
                "COMPLETELY IGNORE all formatting issues",
                "Give full credit for correct concepts even if poorly expressed",
                "If the core understanding is demonstrated, award full points",
                "Do not deduct points for any presentation issues"
            ]
        },
        2: {
            "name": "Standard",
            "description": "Balance between content and presentation. Minor errors have small impact.",
            "rules": [
                "Focus primarily on content accuracy (90% of score)",
                "Only deduct for spelling/grammar if it obscures meaning",
                "Consider clarity of expression but prioritize understanding",
                "Minor presentation issues should not affect score",
                "Be generous with partial credit"
            ]
        },
        3: {
            "name": "Strict",
            "description": "Thorough evaluation of both content and presentation.",
            "rules": [
                "Evaluate content accuracy rigorously",
                "Consider spelling of technical terms",
                "Consider grammar that affects clarity",
                "Expect proper formatting",
                "Deduct points for unclear explanations"
            ]
        },
        4: {
            "name": "Academic",
            "description": "Rigorous academic standard with high expectations for precision.",
            "rules": [
                "Demand complete and precise answers",
                "Require perfect spelling of technical terms",
                "Require proper grammar and punctuation",
                "Expect perfect formatting and structure",
                "Expect precise use of scientific notation/units",
                "Deduct points for any technical inaccuracies",
                "Require professional academic writing standards"
            ]
        }
    }

    return levels.get(level, levels[2])

def grade_with_mistral(answer_text, rubric_text, strictness_level=2):
    """
    Grade a submission using Mistral AI.
    
    Args:
        answer_text (str): The student's answer text
        rubric_text (str): The rubric text
        strictness_level (int): Strictness level (1-4)
    
    Returns:
        dict: Grading result with score, feedback, and total_points
    """
    if not MISTRAL_API_KEY:
        logger.error("Mistral API key not found")
        raise ValueError("Mistral API key not found. Please set the MISTRAL_API_KEY environment variable.")
    
    logger.info(f"Grading submission with strictness level {strictness_level}")
    logger.info(f"Answer text length: {len(answer_text)}")
    logger.info(f"Answer text preview: {answer_text[:100]}...")
    logger.info(f"Rubric text length: {len(rubric_text)}")
    
    # Check if the answer text appears to be OCR output
    ocr_keywords = ["ocr", "image file", "processing required", "extract text"]
    if any(keyword in answer_text.lower() for keyword in ocr_keywords) and len(answer_text.strip()) < 100:
        logger.error("Answer text appears to be OCR placeholder, not actual content")
        logger.error(f"Answer text: {answer_text}")
        raise ValueError("The provided answer requires OCR processing to convert the image into text. Please provide the text version of the student's answer for accurate grading.")
    
    try:
        # Prepare the prompt for Mistral
        strictness_descriptions = {
            1: "Focus primarily on content and understanding, be lenient with formatting and minor errors.",
            2: "Balance content understanding with proper formatting and accuracy.",
            3: "Be strict with both content understanding and proper formatting.",
            4: "Apply academic-level rigor, requiring precise answers and proper formatting."
        }
        
        strictness_desc = strictness_descriptions.get(strictness_level, strictness_descriptions[2])
        
        # Add a note about OCR text if it appears to be OCR-processed
        ocr_note = ""
        if any(marker in answer_text.lower() for marker in ["ocr", "scan", "image", "recognition"]):
            ocr_note = "Note: The student's answer was extracted from an image using OCR, so there might be some formatting or character recognition errors. Please be understanding of these potential OCR errors when grading."
        
        prompt = f"""You are an expert grader for academic exams. Your task is to grade a student's answer based on a provided rubric.

RUBRIC:
{rubric_text}

STUDENT ANSWER:
{answer_text}

GRADING INSTRUCTIONS:
1. Evaluate the student's answer against the rubric criteria
2. Assign a score out of 10 points
3. Provide specific feedback explaining the score
4. Strictness level: {strictness_level} - {strictness_desc}
{ocr_note}

Respond with a JSON object containing:
1. "score": A number between 0 and 10
2. "feedback": Detailed feedback explaining the score
3. "total_points": 10

JSON RESPONSE:"""
        
        # Call Mistral API
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {MISTRAL_API_KEY}"
        }
        
        payload = {
            "model": "mistral-large-latest",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 1000
        }
        
        logger.info("Sending request to Mistral API")
        response = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30  # 30 second timeout
        )
        
        if response.status_code != 200:
            logger.error(f"Mistral API error: {response.status_code} - {response.text}")
            raise Exception(f"Mistral API error: {response.status_code} - {response.text}")
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        logger.info(f"Received response from Mistral: {content[:100]}...")
        
        # Parse the JSON response
        try:
            # First try direct JSON parsing
            grading_result = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from the text if it's not pure JSON
            logger.warning("Failed to parse direct JSON, trying to extract JSON from text")
            json_match = re.search(r'(\{.*\})', content, re.DOTALL)
            if json_match:
                try:
                    grading_result = json.loads(json_match.group(1))
                    logger.info("Successfully extracted JSON from text")
                except Exception as e:
                    logger.error(f"Failed to parse extracted JSON: {e}")
                    logger.error(f"Extracted content: {json_match.group(1)}")
                    raise ValueError(f"Invalid JSON response from Mistral API: {e}")
            else:
                logger.error(f"Failed to extract JSON from response: {content}")
                # As a fallback, create a basic result
                logger.warning("Creating fallback grading result")
                grading_result = {
                    "score": 5,
                    "feedback": f"Failed to parse AI response. Here's the raw response: {content}",
                    "total_points": 10
                }
        
        # Validate the result
        if "score" not in grading_result:
            logger.error(f"Missing score in result: {grading_result}")
            grading_result["score"] = 5
            
        if "feedback" not in grading_result:
            logger.error(f"Missing feedback in result: {grading_result}")
            grading_result["feedback"] = "No feedback provided by the grading system."
        
        # Ensure score is a number between 0 and 10
        try:
            score = float(grading_result["score"])
            score = max(0, min(10, score))
            grading_result["score"] = score
        except (ValueError, TypeError):
            logger.error(f"Invalid score value: {grading_result.get('score')}")
            grading_result["score"] = 5
        
        # Ensure total_points is 10
        grading_result["total_points"] = 10
        
        logger.info(f"Final grading result: {grading_result}")
        return grading_result
        
    except Exception as e:
        logger.error(f"Error in grading with Mistral: {str(e)}", exc_info=True)
        raise

def extract_score(response_text):
    """
    Extract score from Mistral's response JSON
    """
    try:
        match = re.search(r'"score":\s*(\d+(?:\.\d+)?)', response_text)
        return float(match.group(1)) if match else 0
    except:
        return 0

def extract_feedback(response_text):
    """
    Extract feedback from Mistral's response JSON
    """
    try:
        match = re.search(r'"feedback":\s*"([^"]+)"', response_text)
        return match.group(1) if match else "Feedback not found"
    except:
        return "Error extracting feedback"
