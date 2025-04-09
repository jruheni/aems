import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Stack,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorMode,
  Container,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/router';

interface HeaderProps {
  currentPage: string;
  username?: string;
  userRole?: string;
}

const Header: React.FC<HeaderProps> = ({ currentPage, username, userRole }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const router = useRouter();

  // Function to handle logout
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
    }
    router.push('/login');
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      as="nav"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      boxShadow="sm"
      zIndex={100}
      borderBottom="1px"
      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
    >
      <Container maxW="container.xl">
        <Flex
          w="100%"
          h="64px" // Explicit height
          px={2}
          align="center"
          justify="space-between"
        >
          {/* Logo/Brand */}
          <Text
            fontSize="lg"
            fontWeight="bold"
            cursor="pointer"
            onClick={() => router.push('/dashboard')}
          >
            AEMS
          </Text>

          {/* Right side items */}
          <HStack spacing={3}>
            {/* Color mode toggle */}
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              variant="ghost"
            />

            {/* User menu */}
            {username && (
              <Menu>
                <MenuButton
                  as={Button}
                  rounded="full"
                  variant="link"
                  cursor="pointer"
                  minW={0}
                >
                  <HStack spacing={2}>
                    <Avatar
                      size="sm"
                      name={username}
                      bg="blue.500"
                      color="white"
                    />
                    <Text display={{ base: 'none', md: 'block' }}>
                      {username}
                    </Text>
                  </HStack>
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </MenuList>
              </Menu>
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

export default Header; 