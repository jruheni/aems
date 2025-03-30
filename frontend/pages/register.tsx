import { useState } from 'react';
import { useRouter } from 'next/router';
import { registerUser } from '../src/services/supabaseClient';
import {
  Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast, Link,
  Alert, AlertIcon, AlertTitle, AlertDescription
} from '@chakra-ui/react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('Attempting to register user:', username);
      const user = await registerUser(username, password);
      console.log('Registration successful:', user);
      
      // Save user info to localStorage for persistence
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.username);
      
      toast({
        title: 'Registration successful',
        description: 'Your account has been created',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      router.push('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      toast({
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'Failed to create account',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <Box maxW="md" w="full" p={8} borderWidth={1} borderRadius="lg" boxShadow="lg">
        <VStack spacing={4} align="flex-start">
          <Heading as="h1" size="lg">Create an Account</Heading>
          
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertTitle mr={2}>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={4}>
              <FormControl id="username" isRequired>
                <FormLabel>Username</FormLabel>
                <Input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
              </FormControl>
              
              <FormControl id="password" isRequired>
                <FormLabel>Password</FormLabel>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </FormControl>
              
              <FormControl id="confirmPassword" isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </FormControl>
              
              <Button 
                type="submit" 
                colorScheme="blue" 
                width="full" 
                mt={4} 
                isLoading={isLoading}
              >
                Register
              </Button>
            </VStack>
          </form>
          
          <Text>
            Already have an account?{' '}
            <Link color="blue.500" onClick={() => router.push('/login')}>
              Login
            </Link>
          </Text>
        </VStack>
      </Box>
    </Box>
  );
} 