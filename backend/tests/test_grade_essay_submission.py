import pytest
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
BASE_URL = 'http://localhost:5000'
TEST_USER = {
    'username': 'testuser',
    'password': 'testpassword123'
}

@pytest.fixture(scope='module')
def test_user():
    """Setup test user before running tests"""
    # Register test user
    register_url = f"{BASE_URL}/api/auth/register"
    register_data = {
        'username': TEST_USER['username'],  # Fixed key
        'password': TEST_USER['password'],
    }

    try:
        response = requests.post(register_url, json=register_data)
        print("Register Response:", response.status_code, response.text)  # Debugging
        assert response.status_code == 201, f"Failed to create test user: {response.text}"
        yield TEST_USER
    finally:
        # Cleanup: Delete test user (only if an endpoint exists)
        cleanup_url = f"{BASE_URL}/api/auth/cleanup"
        requests.post(cleanup_url, json={'username': TEST_USER['username']})

def test_ocr_failure(test_user):
    """Test successful login with valid credentials"""
    login_url = f"{BASE_URL}/auth/login"  # Fixed URL
    login_data = {
        'username': test_user['username'],  # Fixed key
        'password': test_user['password']
    }

    response = requests.post(login_url, json=login_data)
    print("Login Response:", response.status_code, response.text)  # Debugging
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    response_data = response.json()
    assert 'username' in response_data, "Response missing 'username' field"
    assert 'id' in response_data, "Response missing 'id' field"

