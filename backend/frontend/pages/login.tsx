import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
  Flex,
  Image,
  useToast,
  VStack,
  HStack,
} from '@chakra-ui/react';
import fs from 'fs';
import path from 'path';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const toast = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          action: isLogin ? 'login' : 'signup',
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('username', username);
        router.push('/dashboard');
      } else {
        toast({
          title: data.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex minH="100vh" direction={{ base: 'column', md: 'row' }}>
      <Box
        flex="1"
        p={8}
        bg={useColorModeValue('white', 'gray.800')}
        boxShadow="lg"
        rounded="lg"
        display="flex"
        flexDirection="column"
        justifyContent="center"
      >
        <VStack spacing={6} align="stretch">
          <Heading as="h1" size="xl" textAlign="left">
            Automated Exam Marking System
          </Heading>
          <Text fontSize="lg" textAlign="left">
            {isLogin ? 'Welcome back!' : 'Create a new account'}
          </Text>
          <form onSubmit={handleAuth}>
            <Stack spacing={4}>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                bg={useColorModeValue('gray.100', 'gray.700')}
                variant="filled"
                size="lg"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                bg={useColorModeValue('gray.100', 'gray.700')}
                variant="filled"
                size="lg"
              />
              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                w="full"
              >
                {isLogin ? 'Login' : 'Sign Up'}
              </Button>
            </Stack>
          </form>
          <HStack justify="center" pt={4}>
            <Text>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <Button
              variant="link"
              color="blue.500"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </Button>
          </HStack>
        </VStack>
      </Box>
      <Box flex="1" display={{ base: 'none', md: 'block' }}>
        <Image
          src="/images/backsplash.jpg"
          alt="Background Image"
          objectFit="cover"
          w="100%"
          h="100vh"
          opacity={0.8}
        />
      </Box>
    </Flex>
  );
};

export default LoginPage; 