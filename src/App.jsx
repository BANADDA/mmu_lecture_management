// App.jsx
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Route, Routes } from 'react-router-dom';
import PageTransitionProvider from './components/PageTransitionProvider';
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
  const updateDarkMode = (isDark) => {
    setDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  // State for user role selection (for demo purposes)
  const [userRole, setUserRole] = useState('admin');

  // Handler for switching user roles
  const handleRoleSwitch = (role) => {
    setUserRole(role);
  };

  return (
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
        
        {/* Role selector toggle (for demo purposes) */}
        <div className={`fixed top-4 right-4 z-50 p-2 rounded-lg shadow-lg ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRoleSwitch('admin')}
              className={`px-3 py-1 text-sm rounded-md ${
                userRole === 'admin' 
                  ? (darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800') 
                  : (darkMode ? 'text-gray-400' : 'text-gray-600')
              }`}
            >
              Admin View
            </button>
            <button
              onClick={() => handleRoleSwitch('hod')}
              className={`px-3 py-1 text-sm rounded-md ${
                userRole === 'hod' 
                  ? (darkMode ? 'bg-indigo-900 text-indigo-100' : 'bg-indigo-100 text-indigo-800') 
                  : (darkMode ? 'text-gray-400' : 'text-gray-600')
              }`}
            >
              HoD View
            </button>
          </div>
        </div>
        
        <Routes>
          <Route path="/" element={<MMUDashboard darkMode={darkMode} updateDarkMode={updateDarkMode} userRole={userRole} />} />
        </Routes>
      </div>
    </PageTransitionProvider>
  );
}

export default App;