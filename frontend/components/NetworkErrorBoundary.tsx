import React from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  VStack,
} from '@chakra-ui/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class NetworkErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Network Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('Cannot connect to the backend server');
      
      return (
        <Box p={4}>
          <Alert
            status="error"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="200px"
            borderRadius="md"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              {isNetworkError ? 'Connection Error' : 'Application Error'}
            </AlertTitle>
            <AlertDescription maxWidth="sm">
              {isNetworkError ? (
                <VStack spacing={4}>
                  <Box>
                    Cannot connect to the backend server. Please ensure:
                    <ul style={{ textAlign: 'left', marginTop: '1rem' }}>
                      <li>The backend server is running locally on port 5000</li>
                      <li>You have started the Flask application</li>
                      <li>There are no firewall issues blocking the connection</li>
                    </ul>
                  </Box>
                  <Button
                    colorScheme="blue"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </VStack>
              ) : (
                this.state.error?.message || 'An unexpected error occurred.'
              )}
            </AlertDescription>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default NetworkErrorBoundary; 