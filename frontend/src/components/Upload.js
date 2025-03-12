const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('script', scriptFile);
    formData.append('rubric', rubricFile);

    try {
        const response = await fetch('http://localhost:8000/api/ocr/process', {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Origin': 'http://localhost:3000'
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Server response:', errorData);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
        }

        const result = await response.json();
        console.log('Success:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}; 