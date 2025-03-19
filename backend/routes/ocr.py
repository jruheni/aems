from flask import Blueprint, request, jsonify, make_response
from werkzeug.utils import secure_filename
import os
import magic
import logging
from utils.ocr_extraction import extract_text_from_image
from utils.grading_helper import grade_with_mistral
from flask_cors import cross_origin
import zipfile
import tempfile
import shutil
import pytesseract
from PIL import Image
from flask import current_app

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

bp = Blueprint('ocr', __name__, url_prefix='/api/ocr')

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'pdf': 'application/pdf'
}

def allowed_file(file) -> bool:
    try:
        if not file or not file.filename:
            logger.warning("Empty file or filename")
            return False

        # Log file details
        logger.debug(f"Checking file: {file.filename}")
        logger.debug(f"Content type from request: {file.content_type}")

        # Check file extension
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if ext not in ALLOWED_EXTENSIONS:
            logger.warning(f"Invalid extension: {ext}")
            return False

        # Read the first chunk of the file to detect its type
        first_chunk = file.stream.read(2048)
        file.stream.seek(0)  # Reset stream position
        
        # Detect MIME type
        mime = magic.from_buffer(first_chunk, mime=True)
        logger.debug(f"Detected MIME type: {mime}")
        logger.debug(f"Allowed MIME types: {ALLOWED_EXTENSIONS.values()}")

        is_allowed = mime in ALLOWED_EXTENSIONS.values()
        logger.debug(f"File is{' ' if is_allowed else ' not '}allowed")
        return is_allowed

    except Exception as e:
        logger.error(f"Error in file validation: {str(e)}", exc_info=True)
        return False

def save_uploaded_file(file, prefix):
    """Save uploaded file and return the filepath"""
    if file and file.filename != '':
        filename = secure_filename(f"{prefix}_{file.filename}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        logger.debug(f"Saved file {filename} to {filepath}")
        return filepath
    return None

def extract_test_scripts(zip_path):
    """Extract test scripts from ZIP file and return their paths"""
    extract_dir = tempfile.mkdtemp(dir=UPLOAD_FOLDER)
    script_paths = []
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
            
        # Get all files from the extracted directory
        for root, _, files in os.walk(extract_dir):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.pdf')):
                    script_paths.append(os.path.join(root, file))
        
        return script_paths
    except Exception as e:
        logger.error(f"Error extracting ZIP file: {str(e)}")
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)
        raise

@bp.route('/process', methods=['POST'])
@cross_origin()
def process_exam():
    try:
        logger.info("Starting exam processing")
        logger.debug(f"Request files: {request.files}")
        logger.debug(f"Request form: {request.form}")

        # Validate rubric
        if 'rubric' not in request.files:
            return jsonify({'error': 'No rubric file'}), 400
        
        rubric_file = request.files['rubric']
        if not allowed_file(rubric_file):
            return jsonify({'error': 'Invalid rubric file type'}), 400

        # Get test scripts count
        test_scripts_count = int(request.form.get('test_scripts_count', 0))
        if test_scripts_count == 0:
            return jsonify({'error': 'No test scripts provided'}), 400

        # Process files
        results = []
        
        # Save and process rubric
        rubric_filename = secure_filename(rubric_file.filename)
        rubric_path = os.path.join(current_app.config['UPLOAD_FOLDER'], rubric_filename)
        rubric_file.save(rubric_path)
        logger.debug(f"Rubric saved to: {rubric_path}")
        
        rubric_text = extract_text_from_image(rubric_path)
        logger.debug("Rubric text extracted successfully")

        # Process each test script
        for i in range(test_scripts_count):
            script_key = f'test_script_{i}'
            if script_key not in request.files:
                continue

            script_file = request.files[script_key]
            if not allowed_file(script_file):
                continue

            script_filename = secure_filename(script_file.filename)
            script_path = os.path.join(current_app.config['UPLOAD_FOLDER'], script_filename)
            script_file.save(script_path)
            logger.debug(f"Test script saved to: {script_path}")

            script_text = extract_text_from_image(script_path)
            logger.debug(f"Test script {i} text extracted successfully")

            # Compare texts and generate result
            # This is a placeholder - implement your actual comparison logic
            result = {
                'studentName': f"Student {i + 1}",
                'score': 80,  # Placeholder score
                'total_points': 100,
                'feedback': f"Processed test script {script_filename}"
            }
            results.append(result)

            # Clean up files
            os.remove(script_path)

        # Clean up rubric file
        os.remove(rubric_path)

        logger.info("Exam processing completed successfully")
        return jsonify(results)

    except Exception as e:
        logger.error("Error in exam processing", exc_info=True)
        return jsonify({'error': str(e)}), 500

def handle_preflight():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Accept')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return response

@bp.route('/test', methods=['POST'])
@cross_origin(origins=['http://localhost:3000'], methods=['POST'], allow_headers=['Content-Type'])
def test_upload():
    try:
        logger.debug("Test upload endpoint called")
        logger.debug(f"Request files: {request.files}")
        logger.debug(f"Request form: {request.form}")

        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if not allowed_file(file):
            return jsonify({'error': 'File type not allowed'}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        logger.debug(f"File saved successfully: {file_path}")

        return jsonify({'message': 'File uploaded successfully'})

    except Exception as e:
        logger.error("Error in test upload", exc_info=True)
        return jsonify({'error': str(e)}), 500

@bp.route('/upload/<file_type>', methods=['POST'])
@cross_origin(origins=['http://localhost:3000'])
def upload_file(file_type):
    try:
        if file_type not in ['rubric', 'test_scripts_zip']:
            return jsonify({'error': 'Invalid file type'}), 400

        if file_type not in request.files:
            return jsonify({'error': f'No {file_type} file provided'}), 400

        file = request.files[file_type]
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file):
            return jsonify({'error': f'Invalid {file_type} file type'}), 400

        filepath = save_uploaded_file(file, file_type)
        if not filepath:
            return jsonify({'error': 'Error saving file'}), 500

        return jsonify({
            'success': True,
            'message': f'{file_type} uploaded successfully',
            'filepath': filepath
        })

    except Exception as e:
        logger.error(f"Error uploading {file_type}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@bp.route('/upload-test', methods=['POST'])
@cross_origin()
def upload_test():
    try:
        logger.debug("=== Starting Upload Test ===")
        logger.debug(f"Headers: {dict(request.headers)}")
        logger.debug(f"Files: {list(request.files.keys())}")
        logger.debug(f"Form: {dict(request.form)}")

        if 'rubric' not in request.files:
            return jsonify({'error': 'No rubric file'}), 400

        if 'test_scripts_zip' not in request.files:
            return jsonify({'error': 'No test scripts file'}), 400

        rubric = request.files['rubric']
        test_scripts = request.files['test_scripts_zip']

        logger.debug(f"Rubric filename: {rubric.filename}")
        logger.debug(f"Test scripts filename: {test_scripts.filename}")

        return jsonify({
            'success': True,
            'message': 'Files received',
            'rubric_name': rubric.filename,
            'test_scripts_name': test_scripts.filename
        })

    except Exception as e:
        logger.error(f"Upload test error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500 