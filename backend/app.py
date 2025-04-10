from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.exceptions import HTTPException
import os
import logging
from dotenv import load_dotenv  # Import dotenv
from routes.ocr import bp as ocr_bp
from routes.grading import bp as grading_bp
from utils.ocr_extraction import extract_text_from_image
from utils.grading_helper import grade_with_mistral
import tempfile
import supabase_client as supabase
import hashlib
import secrets
import json
import traceback
import sys
import jwt
import bcrypt
from datetime import datetime, timedelta
import requests
from supabase import create_client, Client
import subprocess
import re
from functools import wraps
import pdf2image
import cv2
import numpy as np
from PIL import Image
import pytesseract



# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('api.log')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Load secret key from environment or use a default for development
app.secret_key = secrets.token_hex(16)  # Generate a random secret key

# Configure session for cross-domain compatibility in production
app.config.update(
    SESSION_COOKIE_SECURE=False,  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY=True,  # Make cookies not accessible via JavaScript
    SESSION_COOKIE_SAMESITE="None",  # Required for cross-origin cookies in modern browsers
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    SESSION_COOKIE_DOMAIN=None,  # Allow any domain
    SESSION_COOKIE_PATH='/',
)

# Configure CORS with more permissive settings for deployed environment
CORS(app,
    resources={r"/*": {
        "origins": ["https://aems-frontend.onrender.com", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": [
            "Content-Type", 
            "Authorization", 
            "X-Requested-With", 
            "Cache-Control", 
            "Accept", 
            "Origin", 
            "Pragma", 
            "Expires",
            "Accept-Encoding", 
            "Accept-Language",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Headers",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Credentials"
        ],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600
    }},
    supports_credentials=True
)

# Add CORS headers and handle cookies
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in ["https://aems-frontend.onrender.com", "http://localhost:3000"]:
        response.headers.add('Access-Control-Allow-Origin', origin)
    
    # Add CORS headers
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Allow-Headers', 
        'Content-Type, Authorization, X-Requested-With, Cache-Control, Accept, Origin, '
        'Pragma, Expires, Accept-Encoding, Accept-Language, '
        'Access-Control-Allow-Origin, Access-Control-Allow-Headers, '
        'Access-Control-Allow-Methods, Access-Control-Allow-Credentials')
    response.headers.add('Access-Control-Allow-Methods', 
        'GET, POST, PUT, DELETE, OPTIONS')
    
    # Handle cookies in production
    if os.environ.get('FLASK_ENV', 'production') == 'production':
        cookies = [x for x in response.headers.getlist('Set-Cookie')]
        for i in range(len(cookies)):
            if 'SameSite=' not in cookies[i]:
                cookies[i] = f"{cookies[i].rstrip(';')}; SameSite=None; Secure"
        
        # Clear existing cookies and add the modified ones
        response.headers.pop('Set-Cookie', None)
        for cookie in cookies:
            response.headers.add('Set-Cookie', cookie)
    
    return response

app.register_blueprint(ocr_bp)
app.register_blueprint(grading_bp)

# Initialize the database
try:
    supabase.create_tables()
    logger.info("Database initialized successfully")
except Exception as e:
    logger.error(f"Database initialization failed: {e}")

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Error handler
@app.errorhandler(Exception)
def handle_error(e):
    logger.error(f"Error occurred: {str(e)}", exc_info=True)
    return jsonify({"error": str(e)}), 500

# Helper function to hash passwords
def hash_password(password):
    salt = secrets.token_hex(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"{salt}${pwdhash}"

# User authentication endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    try:
        # Hash the password before storing
        hashed_password = hash_password(password)
        
        # Register the user with our Supabase client
        user = supabase.register_user(username, hashed_password)
        
        return jsonify({
            "id": user['id'],
            "username": user['username']
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 204
        
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    try:
        # Authenticate the user with our Supabase client
        user = supabase.authenticate_user(username, password)
        
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Set up the session
        session.permanent = True
        session.modified = True  # Ensure the session is saved
        session['user_id'] = user.get('id')
        session['username'] = user.get('username')
        session['role'] = user.get('role', 'teacher')
        
        # Log session data for debugging
        logger.info(f"Login successful. Session data: {dict(session)}")
        
        # Set session cookie in response
        response = jsonify(user)
        return response, 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout the user by clearing the session"""
    try:
        session.clear()
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        logger.error(f"Logout error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/auth/student-login', methods=['POST', 'OPTIONS'])
def student_login():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        password = data.get('password')

        if not student_id or not password:
            return jsonify({"error": "Missing student_id or password"}), 400

        logger.info(f"Attempting student login for ID: {student_id}")
        student = supabase.authenticate_student(student_id, password)
        
        if student:
            # Set session data
            session.clear()  # Clear any existing session data
            session.permanent = True
            session['user_id'] = student['id']
            session['username'] = student['name']
            session['user_type'] = 'student'
            session['student_id'] = student['student_id']
            
            # Force the session to be saved
            session.modified = True
            
            logger.info(f"Student login successful. Session data: {dict(session)}")
            
            response = jsonify({
                "message": "Login successful",
                "user": {
                    "id": student['id'],
                    "username": student['name'],
                    "student_id": student['student_id'],
                    "user_type": "student"
                }
            })
            
            # Ensure cookie settings are properly set
            if os.environ.get('FLASK_ENV', 'production') == 'production':
                response.set_cookie(
                    'session',
                    session.get('session'),
                    secure=True,
                    httponly=True,
                    samesite='None',
                    domain=None,
                    path='/'
                )
            
            return response

        logger.info("Student authentication failed")
        return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        logger.error(f"Error in student_login: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error"}), 500

# Exam management endpoints
@app.route('/api/exams', methods=['GET'])
def get_exams():
    user_id = session.get('user_id')
    try:
        exams = supabase.get_exams(user_id)
        return jsonify(exams), 200
    except Exception as e:
        logger.error(f"Get exams error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/exams', methods=['POST'])
def create_exam():
    data = request.json
    title = data.get('title')
    description = data.get('description', '')
    created_by = data.get('created_by')
    language = data.get('language', 'English') # Extract language, default to English
    
    if not title or not created_by:
        return jsonify({"error": "Title and user ID are required"}), 400
    
    try:
        # Pass language to the helper function
        exam = supabase.create_exam(title, description, created_by, language)
        return jsonify(exam), 201
    except Exception as e:
        logger.error(f"Create exam error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/exams/<exam_id>', methods=['DELETE'])
def delete_exam(exam_id):
    try:
        logger.info(f"[Debug] Attempting to delete exam with ID: {exam_id}")
        
        # First, delete all submissions for this exam
        submissions_response = requests.delete(
            f"{supabase.SUPABASE_URL}/rest/v1/submissions?exam_id=eq.{exam_id}",
            headers=supabase.headers
        )
        logger.info(f"[Debug] Submissions deletion status: {submissions_response.status_code}")
        
        # Delete any rubrics associated with this exam
        rubrics_response = requests.delete(
            f"{supabase.SUPABASE_URL}/rest/v1/rubrics?exam_id=eq.{exam_id}",
            headers=supabase.headers
        )
        logger.info(f"[Debug] Rubrics deletion status: {rubrics_response.status_code}")
        
        # Finally, delete the exam
        exam_response = requests.delete(
            f"{supabase.SUPABASE_URL}/rest/v1/exams?id=eq.{exam_id}",
            headers=supabase.headers
        )
        logger.info(f"[Debug] Exam deletion status: {exam_response.status_code}")
        
        if exam_response.status_code == 204:  # Successful deletion returns 204 No Content
            logger.info(f"[Debug] Successfully deleted exam {exam_id} and related records")
            return jsonify({"message": "Exam and related records deleted successfully"}), 200
        else:
            logger.error(f"Failed to delete exam: {exam_response.text}")
            return jsonify({"error": "Failed to delete exam"}), 500
            
    except Exception as e:
        logger.error(f"Delete exam error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to delete exam: {str(e)}"}), 500

# Rubric management endpoints
@app.route('/api/rubrics', methods=['POST'])
def upload_rubric():
    try:
        logger.info("[Debug] Handling rubric upload")
        data = request.get_json()
        logger.info(f"[Debug] Request data: {data}")
        
        file_name = data.get('file_name')
        file_type = data.get('file_type')
        file_size = data.get('file_size')
        image_url = data.get('image_url')
        exam_id = data.get('exam_id')
        content = data.get('content')
        
        if not file_name or not image_url or not exam_id:
            logger.error("[Debug] Missing required fields")
            return jsonify({"error": "File name, URL, and exam ID are required"}), 400
        
        # First, delete any existing rubric for this exam
        logger.info(f"[Debug] Checking for existing rubric for exam_id: {exam_id}")
        delete_response = requests.delete(
            f"{supabase.SUPABASE_URL}/rest/v1/rubrics",
            headers=supabase.headers,
            params={"exam_id": f"eq.{exam_id}"}
        )
        
        if delete_response.status_code not in [200, 204]:
            logger.error(f"[Debug] Error deleting existing rubric: {delete_response.text}")
            # Continue anyway as there might not be an existing rubric
        
        # Create the data dictionary with correct column names
        rubric_data = {
            "file_name": file_name,
            "file_type": file_type,
            "file_size": file_size,
            "image_url": image_url,
            "exam_id": exam_id,
            "content": content
        }
        
        logger.info(f"[Debug] Creating new rubric with data: {rubric_data}")
        
        # Upload rubric metadata to Supabase
        response = requests.post(
            f"{supabase.SUPABASE_URL}/rest/v1/rubrics",
            headers={
                **supabase.headers,
                'Prefer': 'return=representation'
            },
            json=rubric_data
        )
        
        if response.status_code not in [201, 200]:
            logger.error(f"Failed to upload rubric: {response.text}")
            return jsonify({"error": "Failed to upload rubric"}), 500
            
        rubric = response.json()[0] if isinstance(response.json(), list) else response.json()
        
        logger.info(f"[Debug] Rubric uploaded successfully: {rubric['id']}")
        return jsonify({
            "message": "Rubric uploaded successfully",
            "rubric": {
                "id": rubric.get('id'),
                "file_name": file_name,
                "file_type": file_type,
                "file_size": file_size,
                "image_url": image_url,
                "exam_id": exam_id,
                "content": content
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Upload rubric error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/rubrics/<exam_id>', methods=['GET'])
def get_rubric(exam_id):
    try:
        logger.info(f"[Debug] Fetching rubric for exam_id: {exam_id}")
        
        # Get rubric from Supabase
        response = requests.get(
            f"{supabase.SUPABASE_URL}/rest/v1/rubrics?exam_id=eq.{exam_id}",
            headers=supabase.headers
        )
        
        logger.info(f"[Debug] Supabase response status: {response.status_code}")
        logger.info(f"[Debug] Supabase response: {response.json() if response.status_code == 200 else 'No data'}")
        
        if response.status_code != 200:
            logger.error(f"Failed to fetch rubric: {response.text}")
            return jsonify({"error": "Failed to fetch rubric"}), 500
            
        rubrics = response.json()
        
        if not rubrics:
            logger.info("[Debug] No rubric found for this exam")
            return jsonify({"error": "No rubric uploaded yet"}), 404
            
        # Return the most recent rubric if multiple exist
        rubric = rubrics[0]
        
        return jsonify({
            "id": rubric.get('id'),
            "exam_id": rubric.get('exam_id'),
            "file_name": rubric.get('file_name'),
            "content": rubric.get('content'),
            "preview": rubric.get('preview'),
            "created_at": rubric.get('created_at'),
            "image_url": rubric.get('image_url'),
            "file_type": rubric.get('file_type'),
            "file_size": rubric.get('file_size')
        }), 200
        
    except Exception as e:
        logger.error(f"Get rubric error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# Submission management endpoints
@app.route('/api/submissions', methods=['POST'])
def create_submission():
    # Expect JSON data now, not form data with file
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    exam_id = data.get('exam_id')
    student_name = data.get('student_name')
    student_id = data.get('student_id') # Get student_id from payload
    created_by = data.get('created_by')
    script_file_name = data.get('script_file_name')
    extracted_text_script = data.get('extracted_text_script')
    
    # Basic validation - include student_id
    if not all([exam_id, student_name, student_id, created_by, script_file_name, extracted_text_script]):
        return jsonify({"error": "Missing required fields: exam_id, student_name, student_id, created_by, script_file_name, extracted_text_script"}), 400
    
    try:
        # Get rubric text (remains the same)
        rubric = supabase.get_rubric(exam_id)
        rubric_text = rubric.get('content') if rubric else None
        
        # Create submission using data from payload - pass student_id
        submission = supabase.create_submission(
            exam_id=exam_id,
            student_name=student_name,
            student_id=student_id, # Pass student_id
            script_file_name=script_file_name,
            created_by=created_by,
            extracted_text_script=extracted_text_script,
            extracted_text_rubric=rubric_text
        )
        
        return jsonify(submission), 201
            
    except Exception as e:
        logger.error(f"Create submission error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/submissions', methods=['GET', 'OPTIONS'])
def get_submissions():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        exam_id = request.args.get('exam_id')
        student_id = request.args.get('student_id')
        
        # If neither parameter is provided, return error
        if not exam_id and not student_id:
            return jsonify({"error": "Either exam_id or student_id is required"}), 400
            
        # If exam_id is provided, get submissions for that exam
        if exam_id:
            # First get all submissions for the exam
            response = requests.get(
                f"{supabase.SUPABASE_URL}/rest/v1/submissions?exam_id=eq.{exam_id}",
                headers=supabase.headers
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch submissions: {response.text}")
                return jsonify({"error": "Failed to fetch submissions"}), 500
                
            submissions = response.json()
            
            # For each submission, get the student details if student_id exists
            transformed_submissions = []
            for submission in submissions:
                student_id = submission.get('student_id')
                # Use the name from the submission record first as default
                student_name = submission.get('student_name', 'Unknown Student') 

                # Optionally, try to get the official name from the students table if ID exists
                if student_id:
                    try: # Add try-except for robustness
                        student_response = requests.get(
                            f"{supabase.SUPABASE_URL}/rest/v1/students?student_id=eq.{student_id}",
                            headers=supabase.headers,
                            timeout=5 # Add a timeout
                        )
                        if student_response.status_code == 200 and student_response.json():
                            student = student_response.json()[0]
                            # If name found in students table, prefer it
                            student_name = student.get('name', student_name) 
                    except requests.exceptions.RequestException as req_err:
                        logger.warning(f"Could not fetch student details for ID {student_id}: {req_err}")
                
                transformed_submissions.append({
                    **submission,
                    'student_name': student_name # Use the determined name
                })
            
            return jsonify(transformed_submissions), 200
            
        # If student_id is provided, get submissions for that student
        else:
            response = requests.get(
                f"{supabase.SUPABASE_URL}/rest/v1/submissions?student_id=eq.{student_id}&select=*,exam:exams(id,title,description)",
                headers=supabase.headers
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch submissions: {response.text}")
                return jsonify({"error": "Failed to fetch submissions"}), 500
                
            submissions = response.json()
            transformed_submissions = [{
                **submission,
                'exam_title': submission['exam']['title'] if submission.get('exam') else 'Untitled Exam',
                'exam_description': submission['exam']['description'] if submission.get('exam') else '',
            } for submission in submissions]
            
            return jsonify(transformed_submissions), 200
            
    except Exception as e:
        logger.error(f"Error getting submissions: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/submissions/<submission_id>/score', methods=['PUT'])
def update_submission_score(submission_id):
    data = request.json
    score = data.get('score')
    feedback = data.get('feedback', '')
    
    if score is None:
        return jsonify({"error": "Score is required"}), 400
    
    try:
        success = supabase.update_submission_score(submission_id, score, feedback)
        
        if success:
            return jsonify({"message": "Score updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update score"}), 500
    except Exception as e:
        logger.error(f"Update submission score error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/auth/verify', methods=['GET', 'OPTIONS'])
def verify_auth():
    if request.method == 'OPTIONS':
        logger.info("[Debug] Handling OPTIONS request for /auth/verify")
        return '', 204
        
    try:
        logger.info("[Debug] Verifying authentication")
        logger.info(f"[Debug] Current session: {dict(session)}")
        logger.info(f"[Debug] Request cookies: {request.cookies}")
        
        user_id = session.get('user_id')
        user_type = session.get('user_type')
        
        logger.info(f"[Debug] User ID from session: {user_id}")
        logger.info(f"[Debug] User type from session: {user_type}")
        
        if not user_id:
            logger.info("[Debug] No user_id found in session")
            return jsonify({"error": "User not found"}), 404

        if user_type == 'student':
            # Get student details from database
            student_id = session.get('student_id')
            response = requests.get(
                f"{supabase.SUPABASE_URL}/rest/v1/students?student_id=eq.{student_id}",
                headers=supabase.headers
            )
            
            if response.status_code != 200 or not response.json():
                logger.error(f"[Debug] Failed to fetch student data: {response.text}")
                return jsonify({"error": "Student not found"}), 404
                
            student = response.json()[0]
            result = {
                "id": student['id'],
                "username": student['name'],
                "student_id": student['student_id'],
                "user_type": "student"
            }
        else:
            # Get teacher/user details
            response = requests.get(
                f"{supabase.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
                headers=supabase.headers
            )
            
            if response.status_code != 200 or not response.json():
                logger.error(f"[Debug] Failed to fetch user data: {response.text}")
                return jsonify({"error": "User not found"}), 404
                
            user = response.json()[0]
            result = {
                "id": user['id'],
                "username": user['username'],
                "user_type": "teacher"
            }
        
        logger.info(f"[Debug] Returning user data: {result}")
        return jsonify(result)

    except Exception as e:
        logger.error(f"[Debug] Error in verify_auth: {str(e)}")
        logger.error(f"[Debug] Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/')
def home():
    logger.info("Home endpoint called")
    return "AEMS Grading API is running"

# Configure application
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False') == 'True'

@app.route('/api/test', methods=['GET'])
def test_api():
    """Simple endpoint to test if the API is running"""
    logger.info("Test API endpoint called")
    return jsonify({"status": "success", "message": "API is running"})

@app.route('/api/grade', methods=['POST'])
def grade_submission():
    try:
        data = request.get_json()
        submission_id = data.get('submission_id')
        
        if not submission_id:
            return jsonify({"error": "submission_id is required"}), 400

        # Get the submission with its texts
        response = requests.get(
            f"{supabase.SUPABASE_URL}/rest/v1/submissions?id=eq.{submission_id}",
            headers=supabase.headers
        )

        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch submission"}), 500

        submissions = response.json()
        if not submissions:
            return jsonify({"error": "Submission not found"}), 404

        submission = submissions[0]
        answer_text = submission.get('extracted_text_script')
        rubric_text = submission.get('extracted_text_rubric')

        if not answer_text or not rubric_text:
            return jsonify({"error": "Missing required texts for grading"}), 400

        # Grade using the stored texts
        result = grade_with_mistral(
            answer_text,
            rubric_text,
            data.get('strictness_level', 2)
        )

        # Update the submission with the grade
        update_response = requests.patch(
            f"{supabase.SUPABASE_URL}/rest/v1/submissions?id=eq.{submission_id}",
            headers=supabase.headers,
            json={
                "score": result.get('score'),
                "feedback": result.get('feedback'),
                "total_points": result.get('total_points', 10)
            }
        )

        if update_response.status_code != 204:
            logger.error("Failed to update submission with grade")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Grading error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    logger.error(f"404 error: {str(e)}")
    return jsonify({"error": "The requested endpoint was not found"}), 404

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled exception: {str(e)}")
    logger.error(traceback.format_exc())
    return jsonify({"error": str(e)}), 500

# Add this new endpoint for getting student data
@app.route('/students', methods=['GET', 'OPTIONS'])
def get_student():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        student_id = request.args.get('student_id')
        logger.info(f"[Debug] Getting student data for ID: {student_id}")
        
        if not student_id:
            return jsonify({"error": "student_id is required"}), 400
            
        # Try to find student by either database id or student_id
        if student_id.isdigit():
            # If it's a number, try database id first
            response = requests.get(
                f"{supabase.SUPABASE_URL}/rest/v1/students?id=eq.{student_id}",
                headers=supabase.headers
            )
            
            if response.status_code != 200 or not response.json():
                # If not found by id, try student_id
                response = requests.get(
                    f"{supabase.SUPABASE_URL}/rest/v1/students?student_id=eq.{student_id}",
                    headers=supabase.headers
                )
        else:
            # If it's not a number, use student_id
            response = requests.get(
                f"{supabase.SUPABASE_URL}/rest/v1/students?student_id=eq.{student_id}",
                headers=supabase.headers
            )
        
        logger.info(f"[Debug] Supabase response status: {response.status_code}")
        
        if response.status_code != 200 or not response.json():
            return jsonify({"error": "Student not found"}), 404
            
        student = response.json()[0]
        result = {
            "id": student['id'],
            "student_id": student['student_id'],
            "name": student['name'],
            "email": student['email']
        }
        
        logger.info(f"[Debug] Returning student data: {result}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"[Debug] Error getting student: {str(e)}")
        logger.error(f"[Debug] Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/ocr/extract-text', methods=['POST'])
def extract_text():
    """Extract text from uploaded file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            # Extract text using OCR
            extracted_text = extract_text_from_image(filepath)
            
            if not extracted_text:
                return jsonify({'error': 'No text could be extracted'}), 400

            return jsonify({'text': extracted_text}), 200

        finally:
            # Clean up temporary file
            if os.path.exists(filepath):
                os.remove(filepath)

    except Exception as e:
        logger.error(f"Error extracting text: {str(e)}")
        return jsonify({'error': str(e)}), 500

def preprocess_image(image):
    """
    Preprocess the image for better OCR results
    """
    # Convert to grayscale if image is in color
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    # Apply adaptive thresholding
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    # Denoise
    denoised = cv2.fastNlMeansDenoising(binary)

    # Dilation to connect text components
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    dilated = cv2.dilate(denoised, kernel, iterations=1)

    return dilated

if __name__ == '__main__':
    # Check if MISTRAL_API_KEY is set
    if not os.environ.get('MISTRAL_API_KEY'):
        logger.warning("MISTRAL_API_KEY environment variable is not set!")
        print("WARNING: MISTRAL_API_KEY environment variable is not set!")
    
    logger.info("Starting AEMS Grading API on port 5000")
    print("Starting AEMS Grading API on port 5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
