import pytest
import os
import sys
from flask import Flask
from pathlib import Path
from dotenv import load_dotenv
import io
from PIL import Image, ImageDraw, ImageFont

# Load environment variables from .env file
load_dotenv()

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = Flask(__name__)
    app.config.update({
        'TESTING': True,
        'UPLOAD_FOLDER': 'tests/test_data/uploads',
        'MAX_CONTENT_LENGTH': 16 * 1024 * 1024  # 16MB max file size
    })
    
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register routes
    from routes.ocr import bp as ocr_bp
    from routes.grading import bp as grading_bp
    app.register_blueprint(ocr_bp)
    app.register_blueprint(grading_bp)
    
    # Import the upload route function
    from app import upload_files
    
    # Register the upload route
    app.add_url_rule('/api/upload', 'upload_files', upload_files, methods=['POST'])
    
    yield app
    
    # Cleanup
    if os.path.exists(app.config['UPLOAD_FOLDER']):
        for file in os.listdir(app.config['UPLOAD_FOLDER']):
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], file))
        os.rmdir(app.config['UPLOAD_FOLDER'])

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def sample_image_path():
    """Path to a sample test image."""
    # Use the existing image in the uploads folder
    return r"C:\Users\ruhen\Desktop\aems\aems\backend\uploads\Screenshot_2025-03-27_155836.png"

@pytest.fixture
def sample_rubric_path():
    """Path to a sample rubric file."""
    # Use the existing image in the uploads folder
    return r"C:\Users\ruhen\Desktop\aems\aems\backend\uploads\Screenshot_2025-03-27_155909.png"

@pytest.fixture
def create_test_image_bytes():
    """Create a test image with text and return as bytes"""
    def _create_image(text, size=(800, 600), bg_color=(255, 255, 255), text_color=(0, 0, 0)):
        # Create a blank image with white background
        img = Image.new('RGB', size, color=bg_color)
        d = ImageDraw.Draw(img)
        
        # Try to use a default font, or use default if not available
        try:
            font = ImageFont.truetype("Arial", 20)
        except IOError:
            font = ImageFont.load_default()
        
        # Draw the text
        d.text((20, 20), text, fill=text_color, font=font)
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return img_byte_arr
    
    return _create_image 