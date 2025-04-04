// App.jsx
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, Routes } from 'react-router-dom';
import PageTransitionProvider from './components/PageTransitionProvider';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './screens/auth/LoginPage';
import WelcomePage from './screens/auth/WelcomePage';
import MMUDashboard from './screens/MMUDashboard';

// SVG background patterns
const lightPatternBg = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;
const darkPatternBg = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFFFFF' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

function App() {
  // Initialize dark mode based on system preference or saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return savedTheme === 'dark';
  });

  // Update dark mode when system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme || savedTheme === 'system') {
        setDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Function to update dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  // Set user role to admin only
  const userRole = 'admin';

  return (
    <AuthProvider>
      <PageTransitionProvider>
        <div 
          className={`flex flex-col min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-[#FDFBF7] text-gray-900'}`}
          style={{
            backgroundImage: `url("${darkMode ? darkPatternBg : lightPatternBg}")`,
            backgroundRepeat: 'repeat',
            backgroundAttachment: 'fixed',
            backgroundSize: 'auto'
          }}
        >
          <Toaster
            position="bottom-right"
            toastOptions={{
              // Default options for all toasts
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              // Custom success styles
              success: {
                style: {
                  background: '#1F2937',
                  border: '1px solid #374151',
                },
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              // Custom error styles
              error: {
                style: {
                  background: '#1F2937',
                  border: '1px solid #374151',
                },
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          {/* Admin mode indicator */}
          <div className={`fixed top-4 right-4 z-50 p-2 rounded-lg shadow-lg ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center">
              <span
                className={`px-3 py-1 text-sm rounded-md ${
                  darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
                }`}
              >
                Admin View
              </span>
            </div>
          </div>
          
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<WelcomePage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
            <Route path="/login" element={<LoginPage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <MMUDashboard darkMode={darkMode} updateDarkMode={toggleDarkMode} userRole={userRole} />
              </ProtectedRoute>
            } />
            
            {/* Fallback redirect for any unknown routes */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </PageTransitionProvider>
    </AuthProvider>
  );
}

export default App;