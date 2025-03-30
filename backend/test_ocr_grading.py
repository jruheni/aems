import requests
import json
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_ocr_grading():
    """Test the OCR and grading flow"""
    print("Testing OCR and grading flow...")
    
    # Sample data with mock OCR text
    mock_ocr_text = """
    Student Answer:
    
    The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration, which involves several steps including glycolysis, the citric acid cycle, and oxidative phosphorylation. The inner membrane of the mitochondria is folded into cristae to increase surface area for ATP production.
    
    Mitochondria have their own DNA (mtDNA) and can replicate independently of the cell cycle. They are believed to have originated from ancient bacteria through endosymbiosis. This theory suggests that mitochondria were once free-living bacteria that were engulfed by larger cells.
    
    The number of mitochondria in a cell varies depending on the cell's energy needs. Cells that require more energy, such as muscle cells, contain more mitochondria than cells with lower energy requirements.
    """
    
    sample_rubric = """
    Rubric for Cell Biology Question:
    
    1. Definition of mitochondria (2 points)
       - Correctly identifies mitochondria as the powerhouse/energy producer of the cell
    
    2. ATP Production (3 points)
       - Explains that mitochondria produce ATP
       - Mentions cellular respiration
       - Describes at least one step of the process
    
    3. Structure (2 points)
       - Describes the inner membrane/cristae
       - Explains the purpose of the structure
    
    4. Additional facts (3 points)
       - Mentions mitochondrial DNA
       - Discusses endosymbiotic theory
       - Explains variation in mitochondrial numbers
    """
    
    data = {
        "answer_text": mock_ocr_text,
        "rubric_text": sample_rubric,
        "strictness_level": 2
    }
    
    try:
        # Test the grading API
        print("\nTesting grading API with mock OCR text...")
        
        response = requests.post(
            "http://localhost:5000/api/grade",
            headers={"Content-Type": "application/json"},
            json=data
        )
        
        print(f"Grade API response: {response.status_code}")
        if response.ok:
            result = response.json()
            print(json.dumps(result, indent=2))
            print("\nGrading test successful!")
        else:
            print(f"Error: {response.text}")
            print("\nGrading test failed!")
    except Exception as e:
        print(f"Error testing grading API: {e}")

if __name__ == "__main__":
    test_ocr_grading() 