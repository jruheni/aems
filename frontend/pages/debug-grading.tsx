import { useState } from 'react';
import { 
  Box, Button, Text, Textarea, VStack, HStack, Code, 
  Heading, Alert, AlertIcon, Container, Spinner,
  FormControl, FormLabel, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper
} from '@chakra-ui/react';
import config from '../src/config';

export default function DebugGrading() {
  const [answerText, setAnswerText] = useState('');
  const [rubricText, setRubricText] = useState('');
  const [strictnessLevel, setStrictnessLevel] = useState(2);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const testGrading = async () => {
    if (!answerText.trim()) {
      setError('Please enter answer text');
      return;
    }
    
    if (!rubricText.trim()) {
      setError('Please enter rubric text');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Try primary URL
      try {
        console.log(`Sending grading request to ${config.apiUrl}/api/grade`);
        const response = await fetch(`${config.apiUrl}/api/grade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answer_text: answerText,
            rubric_text: rubricText,
            strictness_level: strictnessLevel
          }),
          signal: AbortSignal.timeout(60000) // 60 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          setResult(data);
          return;
        } else {
          const errorText = await response.text();
          throw new Error(`API error (${response.status}): ${errorText}`);
        }
      } catch (err) {
        console.warn(`Failed with primary URL: ${err}`);
        
        // Try backup URL
        console.log(`Sending grading request to ${config.backupApiUrl}/api/grade`);
        const backupResponse = await fetch(`${config.backupApiUrl}/api/grade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answer_text: answerText,
            rubric_text: rubricText,
            strictness_level: strictnessLevel
          }),
          signal: AbortSignal.timeout(60000) // 60 second timeout
        });
        
        if (backupResponse.ok) {
          const data = await backupResponse.json();
          setResult(data);
        } else {
          const errorText = await backupResponse.text();
          throw new Error(`API error (${backupResponse.status}): ${errorText}`);
        }
      }
    } catch (err) {
      console.error('Grading error:', err);
      setError(`Failed to grade: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={6} align="stretch">
        <Heading>Debug Grading API</Heading>
        
        <Text>This page allows you to test the grading API directly.</Text>
        
        <HStack spacing={4} align="start">
          <FormControl flex="1">
            <FormLabel>Student Answer</FormLabel>
            <Textarea 
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Enter the student's answer text here..."
              height="200px"
            />
          </FormControl>
          
          <FormControl flex="1">
            <FormLabel>Rubric</FormLabel>
            <Textarea 
              value={rubricText}
              onChange={(e) => setRubricText(e.target.value)}
              placeholder="Enter the rubric text here..."
              height="200px"
            />
          </FormControl>
        </HStack>
        
        <FormControl maxW="200px">
          <FormLabel>Strictness Level (1-4)</FormLabel>
          <NumberInput 
            min={1} 
            max={4} 
            value={strictnessLevel}
            onChange={(_, value) => setStrictnessLevel(value)}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
        
        <Button 
          colorScheme="blue" 
          onClick={testGrading}
          isLoading={isLoading}
          loadingText="Grading..."
          width="200px"
        >
          Test Grading
        </Button>
        
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        {isLoading && (
          <Box textAlign="center" py={4}>
            <Spinner size="xl" />
            <Text mt={2}>Grading in progress... This may take up to 30 seconds.</Text>
          </Box>
        )}
        
        {result && (
          <Box>
            <Heading size="md" mb={2}>Grading Result:</Heading>
            <Box p={4} bg="gray.50" borderRadius="md">
              <Text mb={2}><strong>Score:</strong> {result.score} / {result.total_points}</Text>
              <Text mb={2}><strong>Feedback:</strong></Text>
              <Box p={3} bg="white" borderRadius="md" whiteSpace="pre-wrap">
                {result.feedback}
              </Box>
              
              <Text mt={4} mb={2}><strong>Raw Response:</strong></Text>
              <Code display="block" whiteSpace="pre" overflowX="auto">
                {JSON.stringify(result, null, 2)}
              </Code>
            </Box>
          </Box>
        )}
      </VStack>
    </Container>
  );
} 