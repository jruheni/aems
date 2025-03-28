import pytest
import io
import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def create_test_image(text, size=(800, 600), bg_color=(255, 255, 255), text_color=(0, 0, 0)):
    """Create a test image with the given text"""
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

def test_upload_and_process_workflow(client):
    """Test the complete workflow: upload -> OCR -> grading"""
    # Create test images with text
    rubric_text = "RUBRIC\nQuestion 1: Define integration testing (10 points)\nExpect: Definition of integration testing, examples, importance"
    rubric_img = create_test_image(rubric_text)
    
    script_text = "EXAM ANSWER\nQuestion 1: Integration testing is the phase in software testing where individual modules are combined and tested as a group. It follows unit testing and precedes system testing. It's important because it verifies the interfaces between components."
    script_img = create_test_image(script_text)
    
    # Send request to the upload endpoint
    data = {
        'rubric': (rubric_img, 'rubric.png'),
        'test_script': (script_img, 'test_script.png')
    }
    
    response = client.post(
        '/api/upload',
        data=data,
        content_type='multipart/form-data'
    )
    
    # Check response
    assert response.status_code == 200
    
    # Parse response data
    response_data = response.get_json()
    
    # Verify response structure
    assert 'score' in response_data
    assert 'total_points' in response_data
    assert 'feedback' in response_data
    
    # Verify score is a number
    assert isinstance(response_data['score'], (int, float))
    
    # Verify total points is a number
    assert isinstance(response_data['total_points'], (int, float))
    
    # Verify feedback is a string
    assert isinstance(response_data['feedback'], str)

def test_upload_missing_files(client):
    """Test upload endpoint with missing files"""
    # Send request with no files
    response = client.post('/api/upload')
    
    # Check response
    assert response.status_code == 400
    
    # Parse response data
    response_data = response.get_json()
    
    # Verify error message
    assert 'error' in response_data
    assert 'Both rubric and test script are required' in response_data['error']

def test_upload_invalid_file_types(client):
    """Test upload endpoint with invalid file types"""
    # Create a text file
    text_file = io.BytesIO(b'This is not an image or PDF')
    
    # Send request with invalid file types
    data = {
        'rubric': (text_file, 'rubric.txt'),
        'test_script': (text_file, 'test_script.txt')
    }
    
    response = client.post(
        '/api/upload',
        data=data,
        content_type='multipart/form-data'
    )
    
    # Check response
    assert response.status_code == 400
    
    # Parse response data
    response_data = response.get_json()
    
    # Verify error message
    assert 'error' in response_data
    assert 'Invalid' in response_data['error']
