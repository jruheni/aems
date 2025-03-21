from flask import Blueprint, request, jsonify
from utils.grading_helper import grade_exam

bp = Blueprint('grading', __name__, url_prefix='/api/grading')

@bp.route('/grade', methods=['POST'])
def grade_submission():
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided for grading'}), 400
    
    try:
        result = grade_exam(data['text'])
        return jsonify({
            'success': True,
            'score': result['score'],
            'feedback': result['feedback']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 