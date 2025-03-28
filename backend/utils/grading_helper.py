"""
Grading Helper Module
Provides functionality for automated grading using Mistral AI API
Includes various grading standards and text processing utilities
"""

import re
import os
import logging
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from mistralai.exceptions import MistralException

logger = logging.getLogger(__name__)

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
    Grade an answer using Mistral AI with a strictness rubric
    """
    try:
        client = create_mistral_client()
        total_points = extract_total_points(answer_text)
        strictness = get_strictness_description(strictness_level)

        system_prompt = f"""You are an expert exam grader using the {strictness['name']} grading standard. Your task is to:
1. Grade the student's answer based on the provided rubric
2. Provide a score out of {total_points} points
3. Give detailed feedback explaining the grading
4. Be objective and consistent in your grading
5. Format your response as JSON with 'score', 'total_points', and 'feedback' fields

Grading Standard: {strictness['description']}

IMPORTANT GRADING RULES:
{chr(10).join(f"- {rule}" for rule in strictness['rules'])}

Additional Notes:
- For Content Focus, give full points if the student demonstrates understanding
- Only Academic level should penalize spelling/grammar
- Be willing to give full marks where deserved
- Don’t be unnecessarily harsh"""

        user_prompt = f"""Please grade this answer based on the rubric provided:

Rubric:
{rubric_text}

Student's Answer:
{answer_text}

Remember to follow the {strictness['name']} grading standard.

Provide your response in this format:
{{
    "score": <numeric_score>,
    "total_points": {total_points},
    "feedback": "<detailed_feedback>"
}}"""

        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(role="user", content=user_prompt)
        ]

        response = client.chat(
            model="mistral-medium",
            messages=messages,
            temperature=0.1,
            max_tokens=1000
        )

        response_text = response.choices[0].message.content

        if not response_text or not any(k in response_text.lower() for k in ['score', 'feedback']):
            raise ValueError("Invalid response format from Mistral")

        return {
            'score': extract_score(response_text),
            'total_points': total_points,
            'feedback': extract_feedback(response_text),
            'grading_standard': strictness['name']
        }

    except MistralException as e:
        raise Exception(f"Mistral API error: {str(e)}")
    except Exception as e:
        raise Exception(f"Grading error: {str(e)}")

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
