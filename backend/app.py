from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from routes import ocr, grading

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Enable CORS for development
CORS(app, 
     resources={r"/*": {"origins": "*"}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Accept"],
     methods=["GET", "POST", "OPTIONS"])

# Configure app
app.config.from_object('config')

# Register blueprints
app.register_blueprint(ocr.bp)
app.register_blueprint(grading.bp)

if __name__ == '__main__':
    app.run(debug=True, port=8000) 
