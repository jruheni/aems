import pytest
import os
import sys
from flask import Flask
from pathlib import Path
from dotenv import load_dotenv

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
        'UPLOAD_FOLDER': 'tests/test_data/uploads'
    })
    
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register routes
    from routes.ocr import bp as ocr_bp
    app.register_blueprint(ocr_bp)
    
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
    return os.path.join(os.path.dirname(__file__), 'test_data', 'sample_script.jpg')

@pytest.fixture
def sample_rubric_path():
    """Path to a sample rubric file."""
    return os.path.join(os.path.dirname(__file__), 'test_data', 'sample_rubric.pdf') 