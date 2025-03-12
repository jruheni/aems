import os

# Flask configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'

# File upload settings
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

# Database configuration (if needed)
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///aems.db') 