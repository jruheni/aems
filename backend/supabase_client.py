import requests
import json
import os
import logging
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase API details
SUPABASE_URL = "https://huomcpulnpatjyvrnlju.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1b21jcHVsbnBhdGp5dnJubGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTcyOTUsImV4cCI6MjA1ODgzMzI5NX0.u-2TyALnnmw1PCBe0gUh9iUXYnhwxWE242sN1rktKNE"

# Headers for Supabase REST API
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def create_tables():
    """Create tables in Supabase using the REST API"""
    try:
        # Check if users table exists
        check_users = requests.get(f"{SUPABASE_URL}/rest/v1/users?limit=1", headers=headers)
        
        # If users table doesn't exist, create it
        if check_users.status_code != 200:
            logger.info("Creating users table")
            create_users_table()
        else:
            logger.info("Users table already exists")
        
        # Check if exams table exists
        check_exams = requests.get(f"{SUPABASE_URL}/rest/v1/exams?limit=1", headers=headers)
        
        # If exams table doesn't exist, create it
        if check_exams.status_code != 200:
            logger.info("Creating exams table")
            create_exams_table()
        else:
            logger.info("Exams table already exists")
        
        # Check if rubrics table exists
        check_rubrics = requests.get(f"{SUPABASE_URL}/rest/v1/rubrics?limit=1", headers=headers)
        
        # If rubrics table doesn't exist, create it
        if check_rubrics.status_code != 200:
            logger.info("Creating rubrics table")
            create_rubrics_table()
        else:
            logger.info("Rubrics table already exists")
        
        # Check if submissions table exists
        check_submissions = requests.get(f"{SUPABASE_URL}/rest/v1/submissions?limit=1", headers=headers)
        
        # If submissions table doesn't exist, create it
        if check_submissions.status_code != 200:
            logger.info("Creating submissions table")
            create_submissions_table()
        else:
            logger.info("Submissions table already exists")
        
        return True
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        return False

def create_users_table():
    """Create users table using Supabase Management API"""
    # Note: This would normally require the service role key, not the anon key
    # For this example, we'll assume the table already exists in Supabase
    logger.info("Users table should be created in the Supabase dashboard")
    return True

def create_exams_table():
    """Create exams table using Supabase Management API"""
    # Note: This would normally require the service role key, not the anon key
    # For this example, we'll assume the table already exists in Supabase
    logger.info("Exams table should be created in the Supabase dashboard")
    return True

def create_rubrics_table():
    """Create rubrics table using Supabase Management API"""
    # Note: This would normally require the service role key, not the anon key
    # For this example, we'll assume the table already exists in Supabase
    logger.info("Rubrics table should be created in the Supabase dashboard")
    return True

def create_submissions_table():
    """Create submissions table using Supabase Management API"""
    # Note: This would normally require the service role key, not the anon key
    # For this example, we'll assume the table already exists in Supabase
    logger.info("Submissions table should be created in the Supabase dashboard")
    return True

def register_user(username, password):
    """Register a new user using Supabase REST API"""
    try:
        # Check if username exists
        check_url = f"{SUPABASE_URL}/rest/v1/users?username=eq.{username}&select=id"
        check_response = requests.get(check_url, headers=headers)
        
        if check_response.status_code == 200 and check_response.json():
            raise ValueError("Username already exists")
        
        # Insert new user
        insert_url = f"{SUPABASE_URL}/rest/v1/users"
        insert_data = {
            "username": username,
            "password": password  # In a real app, hash this password
        }
        
        insert_response = requests.post(
            insert_url,
            headers=headers,
            json=insert_data
        )
        
        if insert_response.status_code in (200, 201):
            user = insert_response.json()[0]
            return user
        else:
            logger.error(f"Failed to register user: {insert_response.text}")
            raise Exception(f"Registration failed: {insert_response.text}")
    except ValueError as e:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise

def authenticate_user(username, password):
    """Authenticate a user using Supabase REST API"""
    try:
        # Get user by username
        url = f"{SUPABASE_URL}/rest/v1/users?username=eq.{username}&select=id,username,password"
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200 or not response.json():
            return None
        
        user = response.json()[0]
        
        # Check password (in a real app, verify hash)
        if user["password"] == password:
            return {
                "id": user["id"],
                "username": user["username"]
            }
        
        return None
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return None

def get_exams(user_id=None):
    """Get exams using Supabase REST API"""
    try:
        if user_id:
            url = f"{SUPABASE_URL}/rest/v1/exams?created_by=eq.{user_id}&order=created_at.desc"
        else:
            url = f"{SUPABASE_URL}/rest/v1/exams?order=created_at.desc"
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to get exams: {response.text}")
            return []
    except Exception as e:
        logger.error(f"Get exams error: {e}")
        return []

def create_exam(title, description, created_by):
    """Create an exam using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/exams"
        data = {
            "title": title,
            "description": description,
            "created_by": created_by
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code in (200, 201):
            return response.json()[0]
        else:
            logger.error(f"Failed to create exam: {response.text}")
            raise Exception(f"Failed to create exam: {response.text}")
    except Exception as e:
        logger.error(f"Create exam error: {e}")
        raise

def upload_rubric(exam_id, file_name, file_type, file_size, preview, content=None):
    """Upload a rubric using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/rubrics"
        data = {
            "exam_id": exam_id,
            "file_name": file_name,
            "file_type": file_type,
            "file_size": file_size,
            "preview": preview,
            "content": content
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code in (200, 201):
            return response.json()[0]
        else:
            logger.error(f"Failed to upload rubric: {response.text}")
            raise Exception(f"Failed to upload rubric: {response.text}")
    except Exception as e:
        logger.error(f"Upload rubric error: {e}")
        raise

def get_rubric(exam_id):
    """Get a rubric using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/rubrics?exam_id=eq.{exam_id}"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            rubrics = response.json()
            if rubrics:
                return rubrics[0]
            return None
        else:
            logger.error(f"Failed to get rubric: {response.text}")
            return None
    except Exception as e:
        logger.error(f"Get rubric error: {e}")
        return None

def create_submission(exam_id, student_name, script_file_name, created_by, extracted_text_script=None, extracted_text_rubric=None):
    """Create a submission using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/submissions"
        data = {
            "exam_id": exam_id,
            "student_name": student_name,
            "script_file_name": script_file_name,
            "created_by": created_by,
            "extracted_text_script": extracted_text_script,
            "extracted_text_rubric": extracted_text_rubric
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code in (200, 201):
            return response.json()[0]
        else:
            logger.error(f"Failed to create submission: {response.text}")
            raise Exception(f"Failed to create submission: {response.text}")
    except Exception as e:
        logger.error(f"Create submission error: {e}")
        raise

def get_submissions(exam_id):
    """Get submissions using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/submissions?exam_id=eq.{exam_id}&order=created_at.desc"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to get submissions: {response.text}")
            return []
    except Exception as e:
        logger.error(f"Get submissions error: {e}")
        return []

def update_submission_score(submission_id, score, feedback):
    """Update a submission score using Supabase REST API"""
    try:
        url = f"{SUPABASE_URL}/rest/v1/submissions?id=eq.{submission_id}"
        data = {
            "score": score,
            "feedback": feedback
        }
        
        response = requests.patch(url, headers=headers, json=data)
        
        if response.status_code == 204:
            return True
        else:
            logger.error(f"Failed to update submission score: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Update submission score error: {e}")
        return False

# Initialize tables when module is imported
if __name__ == "__main__":
    create_tables() 