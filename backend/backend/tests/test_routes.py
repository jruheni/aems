import pytest
import io
import os

def test_process_missing_files(client):
    """Test endpoint without required files"""
    response = client.post('/api/ocr/process', data={})
    assert response.status_code == 400
    assert b'Both test script and rubric files are required' in response.data

def test_process_empty_files(client):
    """Test endpoint with empty files"""
    data = {
        'script': (io.BytesIO(b''), 'script.jpg'),
        'rubric': (io.BytesIO(b''), 'rubric.pdf')
    }
    response = client.post('/api/ocr/process', data=data)
    assert response.status_code == 400
    assert b'Files contain no data' in response.data

def test_process_valid_files(client, sample_image_path, sample_rubric_path):
    """Test endpoint with valid files"""
    # Skip if test files don't exist
    if not os.path.exists(sample_image_path) or not os.path.exists(sample_rubric_path):
        pytest.skip("Sample files not found")

    # Read test files
    with open(sample_image_path, 'rb') as script_file, \
         open(sample_rubric_path, 'rb') as rubric_file:
        
        data = {
            'script': (script_file, 'test_script.jpg'),
            'rubric': (rubric_file, 'test_rubric.pdf')
        }
        
        response = client.post('/api/ocr/process',
                             data=data,
                             content_type='multipart/form-data')
        
        # Check response
        assert response.status_code == 200
        assert b'score' in response.data
        assert b'feedback' in response.data

def test_process_invalid_file_type(client):
    """Test endpoint with invalid file type"""
    data = {
        'script': (io.BytesIO(b'invalid data'), 'script.txt'),
        'rubric': (io.BytesIO(b'invalid data'), 'rubric.txt')
    }
    response = client.post('/api/ocr/process', data=data)
    assert response.status_code == 400  # Changed to 400 as we now validate file types
    assert b'Invalid script file type' in response.data 