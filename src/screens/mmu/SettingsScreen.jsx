import {
  AlertCircle,
  Bell,
  ChevronRight,
  Globe,
  Key,
  Lock,
  Mail,
  Moon,
  Palette,
  Shield,
  Sliders,
  Sun,
  User,
  UserCog,
  Zap
} from 'lucide-react';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const SettingsScreen = ({ darkMode, userRole }) => {
  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    browser: true,
    schedule: true,
    system: true
  });
  
  const [appearance, setAppearance] = useState({
    theme: darkMode ? 'dark' : 'light',
    fontSize: 'small',
    colorAccent: 'blue',
    animations: true
  });
  
  const [privacy, setPrivacy] = useState({
    showEmail: false,
    showProfile: true,
    allowDataCollection: true
  });
  
  const [isResetting, setIsResetting] = useState(false);
  
  // Toggle notification settings
  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${notifications[key] ? 'disabled' : 'enabled'}`);
  };
  
  // Change appearance settings
  const updateAppearance = (key, value) => {
    setAppearance(prev => ({
      ...prev,
      [key]: value
    }));
    
    if (key === 'theme') {
      toast.success(`${value.charAt(0).toUpperCase() + value.slice(1)} theme applied`);
    }
  };
  
  // Toggle privacy settings
  const togglePrivacy = (key) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    toast.success(`Privacy setting updated`);
  };
  
  // Reset all settings
  const resetSettings = () => {
    setIsResetting(true);
    
    setTimeout(() => {
      setNotifications({
        email: true,
        browser: true,
        schedule: true,
        system: true
      });
      
      setAppearance({
        theme: darkMode ? 'dark' : 'light',
        fontSize: 'small',
        colorAccent: 'blue',
        animations: true
      });
      
      setPrivacy({
        showEmail: false,
        showProfile: true,
        allowDataCollection: true
      });
      
      setIsResetting(false);
      
      toast.success('All settings have been reset to defaults');
    }, 1000);
  };
  
  // Settings categories
  const settingsCategories = [
    {
      id: 'general',
      title: 'General Settings',
      icon: <Sliders size={14} />,
      description: 'Configure your basic preferences',
      isAdmin: false
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell size={14} />,
      description: 'Manage how you receive alerts',
      isAdmin: false
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: <Palette size={14} />,
      description: 'Customize how the dashboard looks',
      isAdmin: false
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: <Shield size={14} />,
      description: 'Control your security preferences',
      isAdmin: false
    },
    {
      id: 'system',
      title: 'System Settings',
      icon: <Zap size={14} />,
      description: 'Advanced application configuration',
      isAdmin: true
    }
  ];
  
  return (
    <div className="max-w-8xl mx-auto px-4 py-6 custom-scrollbar">
      <div className="mb-6">
        <h1 className={`text-2xl font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Settings
        </h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Manage your preferences and system configuration
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Categories Menu */}
        <div className={`rounded-lg border overflow-hidden ${
          darkMode ? 'bg-[var(--polaris-card-bg)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200'
        }`}>
          <div className={`p-4 border-b ${darkMode ? 'border-[var(--polaris-border-dark)]' : 'border-gray-200'}`}>
            <h2 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              PREFERENCES
            </h2>
          </div>
          
          <div className="p-2">
            {settingsCategories
              .filter(category => !category.isAdmin || userRole === 'admin')
              .map(category => (
                <button
                  key={category.id}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm mb-2 ${
                    darkMode 
                      ? 'hover:bg-[var(--polaris-bg-dark)] text-gray-200' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`p-2 rounded mr-3 ${
                      darkMode ? 'bg-[var(--polaris-bg-dark)]' : 'bg-gray-100'
                    }`}>
                      {React.cloneElement(category.icon, { size: 18 })}
                    </div>
                    <div>
                      <div className="font-medium">{category.title}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {category.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                </button>
              ))}
          </div>
          
          <div className={`p-4 border-t ${darkMode ? 'border-[var(--polaris-border-dark)]' : 'border-gray-200'}`}>
            <button 
              onClick={resetSettings}
              disabled={isResetting}
              className={`w-full text-center py-2 text-sm rounded-md ${
                darkMode 
                  ? 'bg-[var(--polaris-bg-dark)] hover:bg-gray-700 text-gray-200' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {isResetting ? 'Resetting...' : 'Reset All Settings'}
            </button>
          </div>
        </div>
        
        {/* Main Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appearance Settings Card */}
          <div className={`rounded-lg border overflow-hidden ${
            darkMode ? 'bg-[var(--polaris-card-bg)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-4 border-b ${darkMode ? 'border-[var(--polaris-border-dark)]' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <Palette size={18} className={`mr-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <h2 className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Appearance
                </h2>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Theme
                </label>
                <div className="flex items-center gap-2 mb-4 w-full">
                  <button
                    onClick={() => updateAppearance('theme', 'light')}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border text-sm ${
                      appearance.theme === 'light'
                        ? (darkMode ? 'bg-[var(--polaris-bg-dark)] border-indigo-500 text-white' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                        : (darkMode ? 'bg-[var(--polaris-bg-darker)] border-[var(--polaris-border-dark)] text-gray-400' : 'bg-white border-gray-200 text-gray-600')
                    }`}
                  >
                    <Sun size={18} />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => updateAppearance('theme', 'dark')}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border text-sm ${
                      appearance.theme === 'dark'
                        ? (darkMode ? 'bg-[var(--polaris-bg-dark)] border-indigo-500 text-white' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                        : (darkMode ? 'bg-[var(--polaris-bg-darker)] border-[var(--polaris-border-dark)] text-gray-400' : 'bg-white border-gray-200 text-gray-600')
                    }`}
                  >
                    <Moon size={18} />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => updateAppearance('theme', 'system')}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border text-sm ${
                      appearance.theme === 'system'
                        ? (darkMode ? 'bg-[var(--polaris-bg-dark)] border-indigo-500 text-white' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                        : (darkMode ? 'bg-[var(--polaris-bg-darker)] border-[var(--polaris-border-dark)] text-gray-400' : 'bg-white border-gray-200 text-gray-600')
                    }`}
                  >
                    <Globe size={18} />
                    <span>System</span>
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Font Size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['small', 'medium', 'large'].map(size => (
                    <button
                      key={size}
                      onClick={() => updateAppearance('fontSize', size)}
                      className={`p-3 rounded-md border text-sm ${
                        appearance.fontSize === size
                          ? (darkMode ? 'bg-[var(--polaris-bg-dark)] border-indigo-500 text-white' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                          : (darkMode ? 'bg-[var(--polaris-bg-darker)] border-[var(--polaris-border-dark)] text-gray-400' : 'bg-white border-gray-200 text-gray-600')
                      }`}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-5">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Color Accent
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {['blue', 'purple', 'green', 'orange'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateAppearance('colorAccent', color)}
                      className={`p-3 rounded-md border text-sm ${
                        appearance.colorAccent === color
                          ? (darkMode ? 'bg-[var(--polaris-bg-dark)] border-indigo-500 text-white' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                          : (darkMode ? 'bg-[var(--polaris-bg-darker)] border-[var(--polaris-border-dark)] text-gray-400' : 'bg-white border-gray-200 text-gray-600')
                      }`}
                    >
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Enable animations
                </label>
                <button
                  onClick={() => updateAppearance('animations', !appearance.animations)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 ${
                    appearance.animations
                      ? (darkMode ? 'border-indigo-500 bg-indigo-600' : 'border-indigo-600 bg-indigo-600')
                      : (darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-200')
                  } transition-colors duration-200 ease-in-out`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full ${
                      appearance.animations
                        ? 'translate-x-5 bg-white'
                        : 'translate-x-0 bg-gray-400'
                    } shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
            </div>
          </div>
          
          {/* Notifications Settings Card */}
          <div className={`rounded-lg border overflow-hidden ${
            darkMode ? 'bg-[var(--polaris-card-bg)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-4 border-b ${darkMode ? 'border-[var(--polaris-border-dark)]' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <Bell size={18} className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h2 className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Notifications
                </h2>
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <div className="flex-1 mr-4">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {key.charAt(0).toUpperCase() + key.slice(1)} notifications
                      </label>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {key === 'email' && 'Get notified via email'}
                        {key === 'browser' && 'Receive browser notifications'}
                        {key === 'schedule' && 'Updates about schedule changes'}
                        {key === 'system' && 'System maintenance alerts'}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleNotification(key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 ${
                        value
                          ? (darkMode ? 'border-blue-500 bg-blue-600' : 'border-blue-600 bg-blue-600')
                          : (darkMode ? 'border-gray-600 bg-[var(--polaris-bg-dark)]' : 'border-gray-300 bg-gray-200')
                      } transition-colors duration-200 ease-in-out`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full ${
                          value
                            ? 'translate-x-5 bg-white'
                            : 'translate-x-0 bg-gray-400'
                        } shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Security & Privacy Card */}
          <div className={`rounded-lg border overflow-hidden ${
            darkMode ? 'bg-[var(--polaris-card-bg)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-4 border-b ${darkMode ? 'border-[var(--polaris-border-dark)]' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <Shield size={18} className={`mr-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <h2 className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Security & Privacy
                </h2>
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Two-Factor Authentication
                  </label>
                  <button
                    className={`w-full flex items-center justify-between p-3 rounded-md border text-sm ${
                      darkMode ? 'bg-[var(--polaris-bg-dark)] border-[var(--polaris-border-dark)] text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Key size={18} className="mr-2" />
                      <span>Enable 2FA</span>
                    </div>
                    <ChevronRight size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  </button>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Password
                  </label>
                  <button
                    className={`w-full flex items-center justify-between p-3 rounded-md border text-sm ${
                      darkMode ? 'bg-[var(--polaris-bg-dark)] border-[var(--polaris-border-dark)] text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Lock size={18} className="mr-2" />
                      <span>Change password</span>
                    </div>
                    <ChevronRight size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  </button>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between py-1">
                    <div className="flex-1 mr-4">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Show email to others
                      </label>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Your email will be visible to other users
                      </span>
                    </div>
                    <button
                      onClick={() => togglePrivacy('showEmail')}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 ${
                        privacy.showEmail
                          ? (darkMode ? 'border-green-500 bg-green-600' : 'border-green-600 bg-green-600')
                          : (darkMode ? 'border-gray-600 bg-[var(--polaris-bg-dark)]' : 'border-gray-300 bg-gray-200')
                      } transition-colors duration-200 ease-in-out`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full ${
                          privacy.showEmail
                            ? 'translate-x-5 bg-white'
                            : 'translate-x-0 bg-gray-400'
                        } shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between py-1">
                    <div className="flex-1 mr-4">
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Show profile
                      </label>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Allow others to view your profile
                      </span>
                    </div>
                    <button
                      onClick={() => togglePrivacy('showProfile')}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 ${
                        privacy.showProfile
                          ? (darkMode ? 'border-green-500 bg-green-600' : 'border-green-600 bg-green-600')
                          : (darkMode ? 'border-gray-600 bg-[var(--polaris-bg-dark)]' : 'border-gray-300 bg-gray-200')
                      } transition-colors duration-200 ease-in-out`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full ${
                          privacy.showProfile
                            ? 'translate-x-5 bg-white'
                            : 'translate-x-0 bg-gray-400'
                        } shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                </div>
                
                {userRole === 'admin' && (
                  <div className={`p-4 rounded-md border ${
                    darkMode ? 'bg-yellow-900/20 border-yellow-800/30 text-yellow-200' : 'bg-yellow-50 border-yellow-100 text-yellow-800'
                  }`}>
                    <div className="flex items-start">
                      <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium">Admin Notice:</span> Additional security controls are available in the System Settings section.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* User Profile Card */}
          <div className={`rounded-lg border overflow-hidden ${
            darkMode ? 'bg-[var(--polaris-card-bg)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-4 border-b ${darkMode ? 'border-[var(--polaris-border-dark)]' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <User size={18} className={`mr-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <h2 className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Profile Settings
                </h2>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-[var(--polaris-bg-dark)]' : 'bg-gray-100'
                }`}>
                  <UserCog size={24} className={darkMode ? 'text-gray-300' : 'text-gray-500'} />
                </div>
                <div>
                  <h3 className={`text-base font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {userRole === 'admin' ? 'Administrator' : 'Department Head'}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    admin@mmu.ac.ug
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <button
                  className={`w-full flex items-center justify-between p-3 rounded-md border text-sm ${
                    darkMode ? 'bg-[var(--polaris-bg-dark)] border-[var(--polaris-border-dark)] text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <User size={18} className="mr-2" />
                    <span>Edit profile</span>
                  </div>
                  <ChevronRight size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                </button>
                
                <button
                  className={`w-full flex items-center justify-between p-3 rounded-md border text-sm ${
                    darkMode ? 'bg-[var(--polaris-bg-dark)] border-[var(--polaris-border-dark)] text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <Mail size={18} className="mr-2" />
                    <span>Update email</span>
                  </div>
                  <ChevronRight size={18} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

SettingsScreen.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired
};

export default SettingsScreen; 