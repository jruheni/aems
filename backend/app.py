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
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-secret-key-here')

# Configure CORS
CORS(app, 
     resources={r"/*": {
         "origins": ["https://aems-frontend.onrender.com", "http://localhost:3000"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True
     }},
     supports_credentials=True)

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

@app.route('/api/auth/login', methods=['POST'])
def login():
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
        
        return jsonify(user), 200
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Exam management endpoints
@app.route('/api/exams', methods=['GET'])
def get_exams():
    user_id = request.args.get('user_id')
    
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
    
    if not title or not created_by:
        return jsonify({"error": "Title and user ID are required"}), 400
    
    try:
        exam = supabase.create_exam(title, description, created_by)
        return jsonify(exam), 201
    except Exception as e:
        logger.error(f"Create exam error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Rubric management endpoints
@app.route('/api/rubrics', methods=['POST'])
def upload_rubric():
    exam_id = request.form.get('exam_id')
    file = request.files.get('file')
    
    if not exam_id or not file:
        return jsonify({"error": "Exam ID and file are required"}), 400
    
    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        file_type = file.content_type
        
        # Read file content for preview
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            preview = content[:500]  # First 500 characters as preview
        
        # Upload rubric to Supabase
        rubric = supabase.upload_rubric(
            exam_id=exam_id,
            file_name=filename,
            file_type=file_type,
            file_size=file_size,
            preview=preview,
            content=content
        )
        
        # Clean up temporary file
        os.remove(file_path)
        
        return jsonify(rubric), 201
    except Exception as e:
        logger.error(f"Upload rubric error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/rubrics/<exam_id>', methods=['GET'])
def get_rubric(exam_id):
    try:
        rubric = supabase.get_rubric(exam_id)
        
        if not rubric:
            return jsonify({"error": "Rubric not found"}), 404
        
        return jsonify(rubric), 200
    except Exception as e:
        logger.error(f"Get rubric error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Submission management endpoints
@app.route('/api/submissions', methods=['POST'])
def create_submission():
    exam_id = request.form.get('exam_id')
    student_name = request.form.get('student_name')
    created_by = request.form.get('created_by')
    file = request.files.get('file')
    
    if not exam_id or not student_name or not created_by or not file:
        return jsonify({"error": "Exam ID, student name, user ID, and file are required"}), 400
    
    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Read file content
        with open(file_path, 'r', encoding='utf-8') as f:
            extracted_text = f.read()
        
        # Get rubric text
        rubric = supabase.get_rubric(exam_id)
        rubric_text = rubric.get('content') if rubric else None
        
        # Create submission
        submission = supabase.create_submission(
            exam_id=exam_id,
            student_name=student_name,
            script_file_name=filename,
            created_by=created_by,
            extracted_text_script=extracted_text,
            extracted_text_rubric=rubric_text
        )
        
        # Clean up temporary file
        os.remove(file_path)
        
        return jsonify(submission), 201
    except Exception as e:
        logger.error(f"Create submission error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/submissions/<exam_id>', methods=['GET'])
def get_submissions(exam_id):
    try:
        submissions = supabase.get_submissions(exam_id)
        return jsonify(submissions), 200
    except Exception as e:
        logger.error(f"Get submissions error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

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

@app.route('/')
def home():
    logger.info("Home endpoint called")
    return "AEMS Grading API is running"

# Configure application
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False') == 'True'

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "expose_headers": ["Content-Type"]
    }
})

@app.route('/api/test', methods=['GET'])
def test_api():
    """Simple endpoint to test if the API is running"""
    logger.info("Test API endpoint called")
    return jsonify({"status": "success", "message": "API is running"})

@app.route('/api/grade', methods=['POST'])
def grade_submission():
    """Grade a submission using Mistral AI"""
    try:
        logger.info("Grade API endpoint called")
        
        # Log request headers for debugging
        logger.info(f"Request headers: {dict(request.headers)}")
        
        # Check if the request has JSON content
        if not request.is_json:
            logger.error("Request does not contain JSON")
            return jsonify({"error": "Request must be JSON"}), 400
        
        # Get the data from the request
        data = request.get_json()
        logger.info(f"Request data: {data}")
        
        # Check if the required fields are present
        if 'answer_text' not in data:
            logger.error("Missing answer_text field")
            return jsonify({"error": "Missing required field: answer_text"}), 400
            
        if 'rubric_text' not in data:
            logger.error("Missing rubric_text field")
            return jsonify({"error": "Missing required field: rubric_text"}), 400
        
        # Validate the answer text
        answer_text = data['answer_text']
        if not answer_text or not answer_text.strip():
            logger.error("Empty answer_text")
            return jsonify({"error": "answer_text cannot be empty"}), 400
        
        # Check if the answer text is too short (likely OCR failed)
        if len(answer_text.strip()) < 20:
            logger.error(f"Answer text too short: '{answer_text}'")
            return jsonify({
                "error": "The provided answer text is too short. This may indicate OCR processing failed."
            }), 400
        
        # Get the strictness level (default to 2 if not provided)
        strictness_level = data.get('strictness_level', 2)
        
        # Call the grading function
        logger.info("Calling grade_with_mistral function")
        result = grade_with_mistral(
            data['answer_text'],
            data['rubric_text'],
            strictness_level
        )
        
        logger.info(f"Grading result: {result}")
        return jsonify(result)
    
    except ValueError as ve:
        # Handle specific value errors (like OCR issues)
        error_message = str(ve)
        logger.error(f"Value error: {error_message}")
        
        if "OCR" in error_message:
            # This is an OCR-related error
            return jsonify({"error": error_message}), 400
        else:
            # Other value errors
            return jsonify({"error": error_message}), 400
    
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
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

if __name__ == '__main__':
    # Check if MISTRAL_API_KEY is set
    if not os.environ.get('MISTRAL_API_KEY'):
        logger.warning("MISTRAL_API_KEY environment variable is not set!")
        print("WARNING: MISTRAL_API_KEY environment variable is not set!")
    
    logger.info("Starting AEMS Grading API on port 5000")
    print("Starting AEMS Grading API on port 5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
