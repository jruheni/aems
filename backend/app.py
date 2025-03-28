from flask import Flask, request, jsonify
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



# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

CORS(app)  # Allow all origins (or specify Vercel domain)

app.register_blueprint(ocr_bp)
app.register_blueprint(grading_bp)


@app.route('/')
def home():
    return "Flask Backend is Running!"

# Configure application
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False') == 'True'

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "expose_headers": ["Content-Type"]
    }
})

# Global error handler
@app.errorhandler(Exception)
def handle_error(e):
    logger.error(f"Error occurred: {str(e)}", exc_info=True)
    code = 500
    if isinstance(e, HTTPException):
        code = e.code
    return jsonify(error=str(e)), code

@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'rubric' not in request.files or 'test_script' not in request.files:
        return jsonify({'error': 'Both rubric and test script are required.'}), 400

    rubric = request.files['rubric']
    test_script = request.files['test_script']

    # Validate file types
    if not (rubric.filename.endswith('.pdf') or rubric.filename.endswith('.png') or rubric.filename.endswith('.jpg')):
        return jsonify({'error': 'Invalid rubric file type. Only PDF, PNG, and JPG are allowed.'}), 400

    if not (test_script.filename.endswith('.pdf') or test_script.filename.endswith('.png') or test_script.filename.endswith('.jpg')):
        return jsonify({'error': 'Invalid test script file type. Only PDF, PNG, and JPG are allowed.'}), 400

    # Save the files
    rubric_filename = secure_filename(rubric.filename)
    test_script_filename = secure_filename(test_script.filename)

    rubric_path = os.path.join(app.config['UPLOAD_FOLDER'], rubric_filename)
    test_script_path = os.path.join(app.config['UPLOAD_FOLDER'], test_script_filename)

    rubric.save(rubric_path)
    test_script.save(test_script_path)
    
    # Process the files with OCR
    try:
        rubric_text = extract_text_from_image(rubric_path)
        script_text = extract_text_from_image(test_script_path)
        
        # Grade the exam
        grading_result = grade_with_mistral(script_text, rubric_text)
        
        # Clean up files
        os.remove(rubric_path)
        os.remove(test_script_path)
        
        result = {
            'studentName': grading_result.get('studentName', 'Student 1'),
            'score': grading_result.get('score', 0),
            'total_points': grading_result.get('total_points', 100),
            'feedback': grading_result.get('feedback', 'No feedback generated.')
        }
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error processing files: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
