import React, { useState, useEffect } from 'react';
import { useToast, Box, Button, FormControl, FormLabel, Input, VStack, Text, Heading, Divider, HStack, Badge, Icon, CloseButton } from '@chakra-ui/react';
import { FaFileAlt, FaCheck } from 'react-icons/fa';

const Upload = () => {
    const [scriptFile, setScriptFile] = useState(null);
    const [rubricFile, setRubricFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [score, setScore] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [extractedText, setExtractedText] = useState({ rubric: '', script: '' });
    const [examName, setExamName] = useState('');
    const [previousSubmissions, setPreviousSubmissions] = useState([]);
    const [username, setUsername] = useState('');
    const toast = useToast();
    
    // Get the exam name and username from URL or localStorage
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const examNameParam = params.get('examName');
        if (examNameParam) {
            setExamName(examNameParam);
            
            // If we already have the username, load the submissions
            if (username) {
                loadPreviousSubmissions(username, examNameParam);
            }
        }
        
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setUsername(storedUsername);
            
            // If we already have the exam name, load the submissions
            if (examNameParam) {
                loadPreviousSubmissions(storedUsername, examNameParam);
            }
        }
    }, []);
    
    // Load previous submissions for this exam
    const loadPreviousSubmissions = (username, examName) => {
        console.log(`Loading submissions for user ${username} and exam ${examName}`);
        const allSubmissions = JSON.parse(localStorage.getItem(`submissions_${username}`) || '[]');
        console.log('All submissions:', allSubmissions);
        
        // Filter submissions for the current exam only
        const examSubmissions = allSubmissions.filter(sub => sub.examName === examName);
        console.log('Filtered submissions for this exam:', examSubmissions);
        
        setPreviousSubmissions(examSubmissions);
    };
    
    const handleScriptChange = (e) => {
        if (e.target.files[0]) {
            setScriptFile(e.target.files[0]);
        }
    };
    
    const handleRubricChange = (e) => {
        if (e.target.files[0]) {
            setRubricFile(e.target.files[0]);
        }
    };
    
    const handleExtractText = async () => {
        if (!scriptFile || !rubricFile) {
            toast({
                title: 'Missing files',
                description: 'Please select both a script and rubric file',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        
        setIsLoading(true);
        
        const formData = new FormData();
        formData.append('test_script', scriptFile);
        formData.append('rubric', rubricFile);
        
        try {
            const response = await fetch('http://localhost:5000/api/ocr/extract', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            setExtractedText({
                rubric: result.rubric_text || 'No text extracted',
                script: result.script_text || 'No text extracted'
            });
            
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: 'Error extracting text',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!scriptFile || !rubricFile) {
            toast({
                title: 'Missing files',
                description: 'Please select both a script and rubric file',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        
        setIsLoading(true);
        
        const formData = new FormData();
        formData.append('test_script', scriptFile);
        formData.append('rubric', rubricFile);

        try {
            console.log("Sending files to server:", {
                scriptFile: scriptFile?.name,
                rubricFile: rubricFile?.name
            });
            
            const response = await fetch('http://localhost:5000/api/ocr/process', {
                method: 'POST',
                body: formData,
            });

            console.log("Server response status:", response.status);
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server response error:', errorData);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
            }

            // Log the raw response text for debugging
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            // Parse the JSON response
            let result;
            try {
                result = JSON.parse(responseText);
                console.log('Parsed result:', result);
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                throw new Error('Invalid JSON response from server');
            }
            
            // Display the results to the user
            console.log('Setting score to:', result.score);
            setScore(result.score);
            console.log('Setting feedback to:', result.feedback);
            setFeedback(result.feedback);
            
            // If the server returned the extracted text, display it
            if (result.extracted_text) {
                console.log('Setting extracted text to:', result.extracted_text);
                setExtractedText({
                    rubric: result.extracted_text.rubric || 'No text extracted',
                    script: result.extracted_text.test_script || 'No text extracted'
                });
            }
            
            // Save the submission to localStorage
            saveSubmission(result);
            
            // Show success message
            toast({
                title: 'Grading complete',
                description: `Score: ${result.score}/${result.total_points || 10}`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            
        } catch (error) {
            console.error('Error processing files:', error);
            // Show error message to user
            toast({
                title: 'Error processing files',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Save submission to localStorage
    const saveSubmission = (result) => {
        if (!username || !examName) {
            console.error('Cannot save submission: missing username or exam name');
            return;
        }
        
        console.log(`Saving submission for exam: ${examName}`);
        
        // Get student name from the file name or use a default
        const studentName = scriptFile.name.split('.')[0] || 'Unknown Student';
        
        const newSubmission = {
            id: Date.now().toString(),
            examName: examName,
            date: new Date().toISOString(),
            studentName: studentName,
            scriptFileName: scriptFile.name,
            results: {
                score: result.score,
                feedback: result.feedback,
                total_points: result.total_points || 10
            }
        };
        
        console.log('New submission:', newSubmission);
        
        // Get existing submissions
        const existingSubmissions = JSON.parse(localStorage.getItem(`submissions_${username}`) || '[]');
        console.log('Existing submissions:', existingSubmissions);
        
        // Add new submission
        const updatedSubmissions = [...existingSubmissions, newSubmission];
        
        // Save back to localStorage
        localStorage.setItem(`submissions_${username}`, JSON.stringify(updatedSubmissions));
        console.log('Updated submissions saved to localStorage');
        
        // Update the state with filtered submissions for this exam only
        loadPreviousSubmissions(username, examName);
    };
    
    return (
        <Box maxW="800px" mx="auto" p={5}>
            <VStack spacing={6} align="stretch">
                <Heading size="lg">Upload Files for {examName}</Heading>
                
                {/* Rubric Upload Section */}
                <Box>
                    <Heading size="md" mb={3}>Rubric</Heading>
                    {rubricFile ? (
                        <HStack p={4} borderWidth={1} borderRadius="lg" bg="green.50">
                            <Icon as={FaFileAlt} color="green.500" />
                            <Text flex="1">{rubricFile.name}</Text>
                            <Badge colorScheme="green">Uploaded</Badge>
                            <CloseButton onClick={() => setRubricFile(null)} />
                        </HStack>
                    ) : (
                        <FormControl>
                            <FormLabel>Upload Rubric</FormLabel>
                            <Input type="file" onChange={handleRubricChange} accept="image/*,.pdf" />
                        </FormControl>
                    )}
                </Box>
                
                {/* Test Script Upload Section */}
                <Box>
                    <Heading size="md" mb={3}>Test Script</Heading>
                    {scriptFile ? (
                        <HStack p={4} borderWidth={1} borderRadius="lg" bg="green.50">
                            <Icon as={FaFileAlt} color="green.500" />
                            <Text flex="1">{scriptFile.name}</Text>
                            <Badge colorScheme="green">Uploaded</Badge>
                            <CloseButton onClick={() => setScriptFile(null)} />
                        </HStack>
                    ) : (
                        <FormControl>
                            <FormLabel>Upload Test Script</FormLabel>
                            <Input type="file" onChange={handleScriptChange} accept="image/*,.pdf" />
                        </FormControl>
                    )}
                </Box>
                
                <Box>
                    <Button colorScheme="blue" mr={3} onClick={handleExtractText} isLoading={isLoading} isDisabled={!rubricFile || !scriptFile}>
                        Extract Text Only
                    </Button>
                    <Button colorScheme="green" onClick={handleSubmit} isLoading={isLoading} isDisabled={!rubricFile || !scriptFile}>
                        Process and Grade
                    </Button>
                </Box>
                
                {extractedText.rubric || extractedText.script ? (
                    <Box borderWidth={1} borderRadius="lg" p={4}>
                        <Heading size="md" mb={2}>Extracted Text</Heading>
                        
                        <Text fontWeight="bold" mt={3}>Rubric:</Text>
                        <Box bg="gray.50" p={3} borderRadius="md" whiteSpace="pre-wrap">
                            {extractedText.rubric}
                        </Box>
                        
                        <Text fontWeight="bold" mt={3}>Student Answer:</Text>
                        <Box bg="gray.50" p={3} borderRadius="md" whiteSpace="pre-wrap">
                            {extractedText.script}
                        </Box>
                    </Box>
                ) : null}
                
                {isLoading && <Text>Processing...</Text>}
                
                {score !== null && (
                    <Box borderWidth={1} borderRadius="lg" p={4} mt={4}>
                        <Heading size="md" mb={2}>Grading Results</Heading>
                        <Text fontWeight="bold">Score: {score}/10</Text>
                        <Divider my={2} />
                        <Text fontWeight="bold">Feedback:</Text>
                        <Text whiteSpace="pre-wrap">{feedback}</Text>
                    </Box>
                )}
                
                {/* Previous Submissions Section */}
                {previousSubmissions.length > 0 && (
                    <Box mt={8}>
                        <Heading size="md" mb={4}>Previous Submissions for {examName}</Heading>
                        <VStack spacing={4} align="stretch">
                            {previousSubmissions.map((submission) => (
                                <Box key={submission.id} p={4} borderWidth={1} borderRadius="lg">
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontWeight="bold">{submission.studentName}</Text>
                                        <Text fontSize="sm" color="gray.500">
                                            {new Date(submission.date).toLocaleString()}
                                        </Text>
                                    </HStack>
                                    <Text fontSize="sm" mb={3}>File: {submission.scriptFileName}</Text>
                                    <Divider mb={3} />
                                    <Text fontWeight="bold">
                                        Score: {submission.results.score}/{submission.results.total_points || 10}
                                    </Text>
                                    <Text mt={2} whiteSpace="pre-wrap">{submission.results.feedback}</Text>
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                )}
            </VStack>
        </Box>
    );
};

export default Upload; 