import pytest
from utils.grading_helper import grade_with_mistral, extract_score, extract_feedback
import os

def test_extract_score():
    """Test score extraction from response text"""
    # Test valid JSON response
    response = '{"score": 85.5, "feedback": "Good work"}'
    score = extract_score(response)
    assert score == 85.5

    # Test invalid JSON
    score = extract_score('invalid json')
    assert score == 0

def test_extract_feedback():
    """Test feedback extraction from response text"""
    # Test valid JSON response
    response = '{"score": 85, "feedback": "Excellent understanding of concepts"}'
    feedback = extract_feedback(response)
    assert feedback == "Excellent understanding of concepts"

    # Test invalid JSON
    feedback = extract_feedback('invalid json')
    assert feedback == "Error extracting feedback"

@pytest.mark.skipif(not os.getenv('MISTRAL_API_KEY'), 
                    reason="MISTRAL_API_KEY not set")
def test_grade_with_mistral():
    """Test grading with Mistral AI"""
    # Sample test data
    answer_text = """
    The process of photosynthesis converts light energy into chemical energy.
    It requires chlorophyll, carbon dioxide, and water.
    The process produces glucose and oxygen as byproducts.
    """
    
    rubric_text = """
    Grading Criteria (10 points total):
    - Mention of energy conversion (2 points)
    - List of required components (4 points)
    - Mention of products (4 points)
    """

    try:
        result = grade_with_mistral(answer_text, rubric_text)
        
        # Validate response structure
        assert 'score' in result
        assert 'feedback' in result
        
        # Basic validation of values
        assert isinstance(result['score'], (int, float))
        assert isinstance(result['feedback'], str)
        assert result['score'] >= 0
        assert len(result['feedback']) > 0
        
    except Exception as e:
        pytest.fail(f"Grading failed: {str(e)}")

def test_grade_with_mistral_error_handling():
    """Test error handling in grading function"""
    # Test with invalid API key
    original_key = os.getenv('MISTRAL_API_KEY')
    os.environ['MISTRAL_API_KEY'] = 'invalid_key'
    
    try:
        with pytest.raises(Exception) as exc_info:
            grade_with_mistral("test", "test")  # Should raise an error with invalid API key
        assert "Error in grading process" in str(exc_info.value)
    finally:
        # Restore original API key
        if original_key:
            os.environ['MISTRAL_API_KEY'] = original_key 