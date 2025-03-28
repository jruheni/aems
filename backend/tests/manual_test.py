import requests
import os
from PIL import Image, ImageDraw, ImageFont
import io

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

def test_upload_endpoint():
    """Test the /api/upload endpoint with test files"""
    # Create test directory
    os.makedirs('test_files', exist_ok=True)
    
    # Create test images
    rubric_path = create_test_image('test_files/rubric.png', 
        "RUBRIC\nQuestion 1: Define integration testing (10 points)\nExpect: Definition of integration testing, examples, importance")
    
    test_script_path = create_test_image('test_files/test_script.png',
        "EXAM ANSWER\nQuestion 1: Integration testing is the phase in software testing where individual modules are combined and tested as a group. It follows unit testing and precedes system testing. It's important because it verifies the interfaces between components.")
    
    # Send request
    url = 'http://localhost:5000/api/upload'
    
    with open(rubric_path, 'rb') as rubric_file, \
         open(test_script_path, 'rb') as test_script_file:
        
        files = {
            'rubric': ('rubric.png', rubric_file, 'image/png'),
            'test_script': ('test_script.png', test_script_file, 'image/png')
        }
        
        response = requests.post(url, files=files)
    
    # Clean up
    os.remove(rubric_path)
    os.remove(test_script_path)
    os.rmdir('test_files')
    
    # Print results
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_upload_endpoint()
