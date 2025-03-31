import React from 'react';
import {
  Box,
  Flex,
  Container,
  Heading,
  Button,
  HStack,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  useColorMode,
  Icon,
  Text,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { FaUserShield, FaGraduationCap, FaChevronDown, FaChartLine, FaHistory, FaSignOutAlt } from 'react-icons/fa';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface HeaderProps {
  currentPage: 'login' | 'landing' | 'dashboard' | 'student-dashboard' | 'submissions';
  username?: string;
  userRole?: 'teacher' | 'student';
}

const Header: React.FC<HeaderProps> = ({ currentPage, username, userRole }) => {
  const router = useRouter();
  const { toggleColorMode, colorMode } = useColorMode();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      localStorage.clear();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderNavigationItems = () => {
    switch (currentPage) {
      case 'login':
        return (
          <HStack spacing={4}>
            <Button 
              variant="ghost" 
              onClick={toggleColorMode}
            >
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
          </HStack>
        );

      case 'landing':
        return (
          <HStack spacing={4}>
            <Button 
              colorScheme="blue" 
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
            <Button 
              variant="ghost" 
              onClick={toggleColorMode}
            >
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
          </HStack>
        );

      case 'dashboard':
        return (
          <HStack spacing={4}>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<FaChevronDown />}
                variant="ghost"
              >
                <HStack>
                  <Avatar size="sm" name={username} />
                  <Text>{username}</Text>
                </HStack>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FaUserShield />}>Profile</MenuItem>
                <MenuItem icon={<FaSignOutAlt />} onClick={handleLogout}>
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
            <Button 
              variant="ghost" 
              onClick={toggleColorMode}
            >
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
          </HStack>
        );

      case 'student-dashboard':
        return (
          <HStack spacing={4}>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<FaChevronDown />}
                variant="ghost"
              >
                <HStack>
                  <Avatar size="sm" name={username} />
                  <Text>{username}</Text>
                </HStack>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FaGraduationCap />}>Profile</MenuItem>
                <MenuItem icon={<FaSignOutAlt />} onClick={handleLogout}>
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
            <Button 
              variant="ghost" 
              onClick={toggleColorMode}
            >
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
          </HStack>
        );

      case 'submissions':
        return (
          <HStack spacing={4}>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<FaChevronDown />}
                variant="ghost"
              >
                <HStack>
                  <Avatar size="sm" name={username} />
                  <Text>{username}</Text>
                </HStack>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FaUserShield />}>Profile</MenuItem>
                <MenuItem icon={<FaSignOutAlt />} onClick={handleLogout}>
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
            <Button 
              variant="ghost" 
              onClick={toggleColorMode}
            >
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
          </HStack>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      zIndex={1000}
    >
      <Container maxW="container.xl">
        <Flex
          h="16"
          alignItems="center"
          justifyContent="space-between"
        >
          <Link href="/" passHref>
            <Heading
              as="h1"
              size="md"
              cursor="pointer"
              _hover={{ opacity: 0.8 }}
            >
              AEMS
            </Heading>
          </Link>
          {renderNavigationItems()}
        </Flex>
      </Container>
    </Box>
  );
};

export default Header; 