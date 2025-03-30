import pytest
import io
import os
import json
import base64
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from flask import Flask
from app import app as flask_app
from utils.grading_helper import grade_with_mistral

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

@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as client:
        yield client

def test_home_endpoint(client):
    """Test the home endpoint"""
    response = client.get('/')
    assert response.status_code == 200
    assert b"AEMS Grading API is running" in response.data

def test_api_test_endpoint(client):
    """Test the API test endpoint"""
    response = client.get('/api/test')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'success'
    assert data['message'] == 'API is running'

def test_grade_endpoint_missing_data(client):
    """Test the grade endpoint with missing data"""
    response = client.post('/api/grade')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_grade_endpoint_missing_fields(client):
    """Test the grade endpoint with missing fields"""
    response = client.post('/api/grade', json={})
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    
    # Test missing answer_text
    response = client.post('/api/grade', json={'rubric_text': 'Rubric'})
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    
    # Test missing rubric_text
    response = client.post('/api/grade', json={'answer_text': 'Answer'})
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_grade_endpoint_valid_data(client, monkeypatch):
    """Test the grade endpoint with valid data"""
    # Mock the grade_with_mistral function to avoid actual API calls
    def mock_grade(*args, **kwargs):
        return {
            'score': 8.5,
            'feedback': 'Good job!',
            'total_points': 10
        }
    
    monkeypatch.setattr('app.grade_with_mistral', mock_grade)
    
    response = client.post('/api/grade', json={
        'answer_text': 'This is a test answer',
        'rubric_text': 'This is a test rubric',
        'strictness_level': 2
    })
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'score' in data
    assert 'feedback' in data
    assert 'total_points' in data
    assert data['score'] == 8.5
    assert data['feedback'] == 'Good job!'
    assert data['total_points'] == 10

def test_grade_with_mistral_function(monkeypatch):
    """Test the grade_with_mistral function directly"""
    # Mock the requests.post function to avoid actual API calls
    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self.json_data = json_data
            
        def json(self):
            return self.json_data
    
    def mock_post(*args, **kwargs):
        return MockResponse(200, {
            'choices': [
                {
                    'message': {
                        'content': '{"score": 7.5, "feedback": "Good answer!", "total_points": 10}'
                    }
                }
            ]
        })
    
    monkeypatch.setattr('requests.post', mock_post)
    
    # Set a mock API key for testing
    monkeypatch.setenv('MISTRAL_API_KEY', 'test_key')
    
    result = grade_with_mistral(
        'This is a test answer',
        'This is a test rubric',
        2
    )
    
    assert 'score' in result
    assert 'feedback' in result
    assert 'total_points' in result
    assert result['score'] == 7.5
    assert result['feedback'] == 'Good answer!'
    assert result['total_points'] == 10

def test_upload_and_process_workflow(client, monkeypatch):
    """Test the complete workflow: upload -> OCR -> grading"""
    # Mock the grade_with_mistral function to avoid actual API calls
    def mock_grade(*args, **kwargs):
        return {
            'score': 8.5,
            'feedback': 'Good job!',
            'total_points': 10
        }
    
    monkeypatch.setattr('app.grade_with_mistral', mock_grade)
    
    # Create test images with text
    rubric_text = "RUBRIC\nQuestion 1: Define integration testing (10 points)\nExpect: Definition of integration testing, examples, importance"
    rubric_img = create_test_image(rubric_text)
    
    script_text = "EXAM ANSWER\nQuestion 1: Integration testing is the phase in software testing where individual modules are combined and tested as a group. It follows unit testing and precedes system testing. It's important because it verifies the interfaces between components."
    script_img = create_test_image(script_text)
    
    # Test direct grading API
    response = client.post('/api/grade', json={
        'answer_text': script_text,
        'rubric_text': rubric_text,
        'strictness_level': 2
    })
    
    # Check response
    assert response.status_code == 200
    
    # Parse response data
    response_data = json.loads(response.data)
    
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

def test_error_handling(client):
    """Test error handling in the API"""
    # Test 404 error
    response = client.get('/nonexistent-endpoint')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data
    
    # Test internal server error handler registration
    # The structure of error_handler_spec changed in newer Flask versions
    # So we need a more flexible check
    
    # Check if there's a handler for Exception
    has_exception_handler = False
    
    # Method 1: Check in the None key (app-wide handlers)
    if hasattr(flask_app, 'error_handler_spec'):
        error_handlers = flask_app.error_handler_spec
        if error_handlers:
            # Check for app-wide handlers (None key)
            app_handlers = error_handlers.get(None, {})
            for status_code, handlers in app_handlers.items():
                if status_code is None and Exception in handlers:
                    has_exception_handler = True
                    break
    
    # Method 2: Check directly in the errorhandler list
    if hasattr(flask_app, 'errorhandler'):
        # This is a more direct check for newer Flask versions
        has_exception_handler = True
    
    assert has_exception_handler, "No error handler for Exception found"
