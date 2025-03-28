import os
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
import io

def create_test_data():
    """Create test data for OCR and grading tests"""
    # Create test data directory
    test_data_dir = os.path.join(os.path.dirname(__file__), 'test_data')
    os.makedirs(test_data_dir, exist_ok=True)
    
    # Create a sample script image
    script_path = os.path.join(test_data_dir, 'sample_script.jpg')
    create_test_image(script_path, 
        "EXAM ANSWER\nQuestion 1: Integration testing is the phase in software testing where individual modules are combined and tested as a group. It follows unit testing and precedes system testing. It's important because it verifies the interfaces between components.")
    
    # Create a sample rubric image (as PDF is harder to create programmatically)
    rubric_path = os.path.join(test_data_dir, 'sample_rubric.jpg')
    create_test_image(rubric_path, 
        "RUBRIC\nQuestion 1: Define integration testing (10 points)\nExpect: Definition of integration testing, examples, importance")
    
    print(f"Test data created in {test_data_dir}")
    print(f"Sample script: {script_path}")
    print(f"Sample rubric: {rubric_path}")

def create_test_image(filename, text):
    """Create a test image with the given text"""
    # Create a blank image with white background
    img = Image.new('RGB', (800, 600), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    
    # Try to use a default font, or use default if not available
    try:
        font = ImageFont.truetype("Arial", 20)
    except IOError:
        font = ImageFont.load_default()
    
    # Draw the text
    d.text((20, 20), text, fill=(0, 0, 0), font=font)
    
    # Save the image
    img.save(filename)
    return filename

if __name__ == "__main__":
    create_test_data()
