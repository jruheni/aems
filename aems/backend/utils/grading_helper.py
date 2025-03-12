"""
Grading Helper Module
Provides functionality for automated grading using Mistral AI API
Includes various grading standards and text processing utilities
"""

import re
import os
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from mistralai.exceptions import MistralException

def create_mistral_client():
    """
    Create and configure Mistral API client
    Includes debug logging for API key verification
    Raises exception if API key is not set
    """
    print("\nDebugging Mistral client creation:")
    print("Current working directory:", os.getcwd())
    print("Environment variables loaded:", os.environ.get('FLASK_APP') is not None)
    
    api_key = os.getenv('MISTRAL_API_KEY')
    print("API Key found:", api_key is not None)
    if api_key:
        print("API Key length:", len(api_key))
        print("API Key first 4 chars:", api_key[:4])
    
    if not api_key:
        raise Exception("MISTRAL_API_KEY not set")
    return MistralClient(api_key=api_key)

def analyze_answer(text, keywords, total_points):
    """
    Analyze student answer based on keywords
    Args:
        text: Student's answer text
        keywords: List of expected keywords/concepts
        total_points: Maximum points possible
    Returns:
        tuple: (score, list of matched keywords)
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
    Generate detailed feedback based on grading results
    Highlights both strengths and areas for improvement
    """
    feedback = []
    
    if matched_keywords:
        feedback.append("Good points mentioned: " + ", ".join(matched_keywords))
    
    if missing_keywords:
        feedback.append("Consider including: " + ", ".join(missing_keywords))
    
    return "\n".join(feedback)

def grade_exam(text, grading_criteria=None):
    """
    Grade the exam text based on predefined or provided criteria
    """
    if grading_criteria is None:
        # Default grading criteria - should be customized based on actual exam
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
    Extract total points from question text
    Looks for patterns like (10 points), (10 marks), etc.
    Returns 10 as default if no point value is found
    """
    try:
        points_match = re.search(r'\((\d+)[\s,]*(?:points|pts|marks|mks)\)', text, re.IGNORECASE)
        if points_match:
            return int(points_match.group(1))
        return 10  # Default to 10 if not found
    except:
        return 10  # Default to 10 if there's an error

def get_strictness_description(level):
    """
    Get description and rules for each grading standard level
    Levels:
    1: Content Focus - Emphasis on understanding, ignore presentation
    2: Standard - Balanced approach (default)
    3: Strict - Thorough evaluation
    4: Academic - Highest precision requirements
    """
    strictness_levels = {
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
    return strictness_levels.get(level, strictness_levels[2])

def grade_with_mistral(answer_text, rubric_text, strictness_level=2):
    """
    Main grading function using Mistral AI
    
    Process:
    1. Creates Mistral client
    2. Extracts total points from question
    3. Gets grading standard rules
    4. Prepares detailed prompt for AI
    5. Processes response and extracts score/feedback
    
    Args:
        answer_text: Student's answer
        rubric_text: Grading rubric
        strictness_level: Integer 1-4 indicating grading strictness
    
    Returns:
        dict with score, total_points, feedback, and grading_standard
    """
    try:
        # Create client when needed
        client = create_mistral_client()

        # Extract total points from the question
        total_points = extract_total_points(answer_text)

        # Get strictness level details
        strictness = get_strictness_description(int(strictness_level))

        # Prepare the prompt for Mistral
        system_prompt = f"""You are an expert exam grader using the {strictness['name']} grading standard. Your task is to:
1. Grade the student's answer based on the provided rubric
2. Provide a score out of {total_points} points
3. Give detailed feedback explaining the grading
4. Be objective and consistent in your grading
5. Format your response as JSON with 'score', 'total_points', and 'feedback' fields

Grading Standard: {strictness['description']}

IMPORTANT GRADING RULES - YOU MUST FOLLOW THESE EXACTLY:
{chr(10).join(f"- {rule}" for rule in strictness['rules'])}

Additional Notes:
- For Content Focus level, if the student demonstrates understanding, they should receive full points regardless of presentation
- Only Academic level should care about spelling/grammar
- Be willing to give 100% scores when deserved
- Don't be unnecessarily harsh with grading"""

        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(
                role="user",
                content=f"""Please grade this answer based on the rubric provided:

Rubric:
{rubric_text}

Student's Answer:
{answer_text}

Remember to follow the {strictness['name']} grading standard as specified.

Provide your response in the following JSON format:
{{
    "score": <numeric_score>,
    "total_points": {total_points},
    "feedback": "<detailed_feedback>"
}}"""
            )
        ]

        # Get response from Mistral
        chat_response = client.chat(
            model="mistral-medium",
            messages=messages,
            temperature=0.1,  # Low temperature for more consistent grading
            max_tokens=1000
        )

        # Extract and validate the response
        response_text = chat_response.choices[0].message.content
        
        # Basic validation to ensure we got a valid response
        if not response_text or not any(keyword in response_text.lower() for keyword in ['score', 'feedback']):
            raise ValueError("Invalid response format from Mistral")

        return {
            'score': extract_score(response_text),
            'total_points': total_points,
            'feedback': extract_feedback(response_text),
            'grading_standard': strictness['name']
        }

    except MistralException as e:
        raise Exception(f"Error in grading process: {str(e)}")
    except Exception as e:
        raise Exception(f"Error in grading process: {str(e)}")

def extract_score(response_text):
    """
    Extract numeric score from Mistral's JSON response
    Uses regex to find score field
    Returns 0 if score cannot be extracted
    """
    try:
        score_match = re.search(r'"score":\s*(\d+(?:\.\d+)?)', response_text)
        if score_match:
            return float(score_match.group(1))
        return 0
    except:
        return 0

def extract_feedback(response_text):
    """
    Extract feedback text from Mistral's JSON response
    Uses regex to find feedback field
    Returns error message if feedback cannot be extracted
    """
    try:
        feedback_match = re.search(r'"feedback":\s*"([^"]+)"', response_text)
        if feedback_match:
            return feedback_match.group(1)
        return "Error extracting feedback"
    except:
        return "Error extracting feedback" 