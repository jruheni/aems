import pytest
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
BASE_URL = "http://localhost:5000"

@pytest.fixture(scope="module")
def test_exam():
    """Create an exam before tests and clean up after"""
    create_exam_url = f"{BASE_URL}/api/exams"
    exam_data = {
        "title": "Sample Test Exam",
        "description": "This is a test exam.",
        "created_by": "52e64934-ee37-4cf6-b1bd-9a1aa077f5e9"  
    }

    # Create the exam
    response = requests.post(create_exam_url, json=exam_data)
    print("Create Exam Response:", response.status_code, response.text)  # Debugging
    assert response.status_code == 201, f"Failed to create exam: {response.text}"

    exam = response.json()
    exam_id = exam.get("id")
    assert exam_id, "Response missing 'id' field"

    yield exam_id  # Pass the exam ID to the tests


def test_create_exam(test_exam):
    """Verify that the exam was created successfully"""
    assert test_exam is not None, "Exam ID should not be None"
