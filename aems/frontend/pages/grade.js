import { useState } from 'react';
import axios from 'axios';

export default function GradeEssay() {
  const [essay, setEssay] = useState('');
  const [rubric, setRubric] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleGrade = async () => {
    const res = await axios.post('/api/grading/evaluate', { essay, rubric });
    setFeedback(res.data.feedback);
  };

  return (
    <div>
      <textarea placeholder="Essay" onChange={(e) => setEssay(e.target.value)} />
      <textarea placeholder="Rubric" onChange={(e) => setRubric(e.target.value)} />
      <button onClick={handleGrade}>Grade</button>
      <pre>{feedback}</pre>
    </div>
  );
}