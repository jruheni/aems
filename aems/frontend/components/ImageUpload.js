import { useState } from 'react';
import axios from 'axios';

export default function ImageUpload() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');

  const handleUpload = async (e) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post('/api/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setText(res.data.text);
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
      <pre>{text}</pre>
    </div>
  );
}