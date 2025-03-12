from flask import Blueprint, request, jsonify, make_response
from werkzeug.utils import secure_filename
import os
import magic
import logging
from utils.ocr_extraction import extract_text_from_image
from utils.grading_helper import grade_with_mistral
from flask_cors import cross_origin

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

bp = Blueprint('ocr', __name__, url_prefix='/api/ocr')

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = {
    'script': {'image/jpeg', 'image/png'},
    'rubric': {'application/pdf', 'image/jpeg', 'image/png'}
}

def allowed_file(file, file_type):
    """Check if file type is allowed"""
    if not file or file.filename == '':
        return False
    mime = magic.Magic(mime=True)
    file_content = file.read()
    file.seek(0)  # Reset file pointer
    detected_type = mime.from_buffer(file_content)
    logger.debug(f"File type check for {file_type}: {file.filename} -> {detected_type}")
    return detected_type in ALLOWED_EXTENSIONS[file_type]

def save_uploaded_file(file, prefix):
    """Save uploaded file and return the filepath"""
    if file and file.filename != '':
        filename = secure_filename(f"{prefix}_{file.filename}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        logger.debug(f"Saved file {filename} to {filepath}")
        return filepath
    return None

@bp.route('/process', methods=['POST', 'OPTIONS'])
@cross_origin()
def process_exam():
    logger.debug("Processing exam submission")
    logger.debug(f"Request headers: {dict(request.headers)}")
    
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    # Check if files are present
    if 'script' not in request.files or 'rubric' not in request.files:
        return jsonify({
            'error': 'Both test script and rubric files are required'
        }), 400

    script_file = request.files['script']
    rubric_file = request.files['rubric']

    # Check for empty files
    if script_file.filename == '' or rubric_file.filename == '':
        return jsonify({
            'error': 'Empty files submitted'
        }), 400

    # Check file content
    if script_file.read() == b'' or rubric_file.read() == b'':
        return jsonify({
            'error': 'Files contain no data'
        }), 400
    
    # Reset file pointers after reading
    script_file.seek(0)
    rubric_file.seek(0)

    # Validate file types
    if not allowed_file(script_file, 'script'):
        return jsonify({
            'error': 'Invalid script file type. Allowed types: JPEG, PNG'
        }), 400

    if not allowed_file(rubric_file, 'rubric'):
        return jsonify({
            'error': 'Invalid rubric file type. Allowed types: PDF, JPEG, PNG'
        }), 400

    script_path = None
    rubric_path = None

    try:
        # Save uploaded files
        script_path = save_uploaded_file(script_file, 'script')
        rubric_path = save_uploaded_file(rubric_file, 'rubric')

        if not script_path or not rubric_path:
            raise ValueError("Error saving uploaded files")

        logger.debug("Extracting text from script")
        script_text = extract_text_from_image(script_path)
        logger.debug(f"Script text: {script_text[:100]}...")

        logger.debug("Extracting text from rubric")
        rubric_text = extract_text_from_image(rubric_path)
        logger.debug(f"Rubric text: {rubric_text[:100]}...")

        if not script_text or not rubric_text:
            raise ValueError("Could not extract text from files")

        # Process with Mistral
        logger.debug("Processing with Mistral AI")
        result = grade_with_mistral(script_text, rubric_text)
        logger.debug(f"Grading result: {result}")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error processing files: {str(e)}", exc_info=True)
        return jsonify({
            'error': f'Error processing files: {str(e)}'
        }), 500

    finally:
        # Clean up uploaded files
        for path in [script_path, rubric_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                    logger.debug(f"Cleaned up file: {path}")
                except:
                    logger.warning(f"Failed to clean up file: {path}") 