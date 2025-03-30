import { useState, useEffect } from 'react';
import { Box, Button, Text, VStack, Code, Heading, Alert, AlertIcon, Container, Spinner } from '@chakra-ui/react';
import config from '../src/config';

export default function TestAPI() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const testApiConnection = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      // Try primary URL
      try {
        console.log(`Testing connection to ${config.apiUrl}/api/test`);
        const response = await fetch(`${config.apiUrl}/api/test`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          setTestResult(JSON.stringify(data, null, 2));
          return;
        }
      } catch (err) {
        console.warn(`Failed to connect to primary URL: ${err}`);
      }
      
      // Try backup URL
      console.log(`Testing connection to ${config.backupApiUrl}/api/test`);
      const backupResponse = await fetch(`${config.backupApiUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (backupResponse.ok) {
        const data = await backupResponse.json();
        setTestResult(JSON.stringify(data, null, 2));
      } else {
        throw new Error(`API returned status ${backupResponse.status}`);
      }
    } catch (err) {
      console.error('API test error:', err);
      setError(`Failed to connect to API: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={6} align="stretch">
        <Heading>API Connection Test</Heading>
        
        <Box>
          <Text mb={2}>This page tests the connection to the backend API server.</Text>
          <Button 
            colorScheme="blue" 
            onClick={testApiConnection}
            isLoading={isLoading}
            loadingText="Testing..."
          >
            Test API Connection
          </Button>
        </Box>
        
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        {testResult && (
          <Box>
            <Text fontWeight="bold" mb={2}>API Response:</Text>
            <Box p={4} bg="gray.50" borderRadius="md">
              <Code display="block" whiteSpace="pre" overflowX="auto">
                {testResult}
              </Code>
            </Box>
          </Box>
        )}
        
        <Box mt={8}>
          <Heading size="md" mb={4}>Troubleshooting Steps</Heading>
          <VStack align="start" spacing={2}>
            <Text>1. Make sure the backend server is running on port 5000</Text>
            <Text>2. Check that CORS is properly configured on the backend</Text>
            <Text>3. Verify network connectivity between frontend and backend</Text>
            <Text>4. Check browser console for any JavaScript errors</Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
} 