from dotenv import load_dotenv
import os

# Load environment variables
print("Loading environment variables...")
load_dotenv()

# Print all environment variables
print("\nAll environment variables:")
print("FLASK_APP =", os.getenv('FLASK_APP'))
print("FLASK_ENV =", os.getenv('FLASK_ENV'))
print("FLASK_DEBUG =", os.getenv('FLASK_DEBUG'))
print("MISTRAL_API_KEY =", os.getenv('MISTRAL_API_KEY'))
print("UPLOAD_FOLDER =", os.getenv('UPLOAD_FOLDER'))

# Specifically check Mistral API key
mistral_key = os.getenv('MISTRAL_API_KEY')
if mistral_key:
    print("\nMistral API key found!")
    print(f"Length: {len(mistral_key)}")
    print(f"First 4 chars: {mistral_key[:4]}...")
    print(f"Last 4 chars: ...{mistral_key[-4:]}")
else:
    print("\nWARNING: MISTRAL_API_KEY not found in environment variables!") 