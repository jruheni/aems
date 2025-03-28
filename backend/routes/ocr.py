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
def process_files():
    """Process uploaded files for OCR and grading"""
    logger.debug("OCR process endpoint called")
    
    # Check if files are present
    if 'rubric' not in request.files:
        logger.error("No rubric file provided")
        return jsonify({'error': 'No rubric file provided'}), 400
    
    if 'test_script' not in request.files:
        logger.error("No test script provided")
        return jsonify({'error': 'No test script provided'}), 400
    
    rubric_file = request.files['rubric']
    test_script_file = request.files['test_script']
    
    # Check if files are empty
    if rubric_file.filename == '':
        logger.error("Empty rubric file")
        return jsonify({'error': 'Empty rubric file'}), 400
    
    if test_script_file.filename == '':
        logger.error("Empty test script file")
        return jsonify({'error': 'Empty test script file'}), 400
    
    # Check file types
    allowed_extensions = {'png', 'jpg', 'jpeg', 'pdf'}
    
    if not allowed_file(rubric_file.filename):
        logger.error(f"Invalid rubric file type: {rubric_file.filename}")
        return jsonify({'error': 'Invalid rubric file type'}), 400
    
    if not allowed_file(test_script_file.filename):
        logger.error(f"Invalid test script file type: {test_script_file.filename}")
        return jsonify({'error': 'Invalid test script file type'}), 400
    
    # Save files temporarily
    rubric_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(rubric_file.filename))
    test_script_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(test_script_file.filename))
    
    rubric_file.save(rubric_path)
    test_script_file.save(test_script_path)
    
    logger.debug(f"Files saved: {rubric_path}, {test_script_path}")
    
    # Extract text from files
    try:
        rubric_text = extract_text_from_image(rubric_path)
        test_script_text = extract_text_from_image(test_script_path)
        
        # Log the extracted text for debugging
        logger.debug(f"Extracted rubric text: {rubric_text}")
        logger.debug(f"Extracted test script text: {test_script_text}")
        
        # Always attempt to grade, even if text extraction is partial or has issues
        if not rubric_text:
            rubric_text = "No text could be extracted from the rubric."
            logger.warning("No text extracted from rubric, but proceeding with grading")
        
        if not test_script_text:
            test_script_text = "No text could be extracted from the test script."
            logger.warning("No text extracted from test script, but proceeding with grading")
        
        # Grade the test script
        grading_result = grade_with_mistral(test_script_text, rubric_text)
        
        # Add the extracted text to the response for debugging
        grading_result['extracted_text'] = {
            'rubric': rubric_text,
            'test_script': test_script_text
        }
        
        return jsonify(grading_result), 200
        
    except Exception as e:
        logger.error(f"Error processing files: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error processing files: {str(e)}'}), 500
    finally:
        # Clean up temporary files
        if os.path.exists(rubric_path):
            os.remove(rubric_path)
        if os.path.exists(test_script_path):
            os.remove(test_script_path)

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

@bp.route('/extract', methods=['POST'])
def extract_text():
    """Extract text from uploaded files without grading"""
    logger.debug("OCR extract endpoint called")
    
    # Check if files are present
    if 'rubric' not in request.files:
        logger.error("No rubric file provided")
        return jsonify({'error': 'No rubric file provided'}), 400
    
    if 'test_script' not in request.files:
        logger.error("No test script provided")
        return jsonify({'error': 'No test script provided'}), 400
    
    rubric_file = request.files['rubric']
    test_script_file = request.files['test_script']
    
    # Check if files are empty
    if rubric_file.filename == '':
        logger.error("Empty rubric file")
        return jsonify({'error': 'Empty rubric file'}), 400
    
    if test_script_file.filename == '':
        logger.error("Empty test script file")
        return jsonify({'error': 'Empty test script file'}), 400
    
    # Save files temporarily
    rubric_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(rubric_file.filename))
    test_script_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(test_script_file.filename))
    
    rubric_file.save(rubric_path)
    test_script_file.save(test_script_path)
    
    logger.debug(f"Files saved: {rubric_path}, {test_script_path}")
    
    # Extract text from files
    try:
        rubric_text = extract_text_from_image(rubric_path)
        test_script_text = extract_text_from_image(test_script_path)
        
        return jsonify({
            'rubric_text': rubric_text,
            'script_text': test_script_text
        }), 200
        
    except Exception as e:
        logger.error(f"Error extracting text: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error extracting text: {str(e)}'}), 500
    finally:
        # Clean up temporary files
        if os.path.exists(rubric_path):
            os.remove(rubric_path)
        if os.path.exists(test_script_path):
            os.remove(test_script_path) 