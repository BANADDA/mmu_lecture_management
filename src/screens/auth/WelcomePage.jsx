import { ArrowRight, Book, Clock, Moon, Sun, Users } from 'lucide-react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const WelcomePage = ({ darkMode, toggleDarkMode }) => {
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-[#FDFBF7] text-gray-900'}`}>
      {/* Theme toggle button */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 shadow-md'
        }`}
        aria-label="Toggle theme"
      >
        {darkMode ? (
          <Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          <Moon className="h-5 w-5 text-gray-700" />
        )}
      </button>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center">
                <div className="flex justify-center mb-8">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-indigo-600 text-white text-2xl font-bold">
                    MMU
                  </div>
                </div>
                <h1 className={`text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span className="block">MMU Lecture</span>
                  <span className="block text-indigo-600">Management System</span>
                </h1>
                <p className={`mt-3 max-w-md mx-auto text-base sm:text-lg md:mt-5 md:text-xl md:max-w-3xl ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Streamline your academic operations with our comprehensive lecture management platform, designed specifically for universities.
                </p>
                <div className="mt-10 max-w-md mx-auto sm:flex sm:justify-center md:mt-12">
                  <div className="rounded-md shadow">
                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                    >
                      Get Started <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </div>
                  <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                    <a
                      href="#features"
                      className={`w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md ${
                        darkMode 
                          ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                          : 'bg-white text-indigo-600 hover:bg-gray-50'
                      } md:py-4 md:text-lg md:px-10`}
                    >
                      Learn More
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className={`py-12 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className={`text-base text-indigo-600 font-semibold tracking-wide uppercase`}>Features</h2>
            <p className={`mt-2 text-3xl leading-8 font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'} sm:text-4xl`}>
              A better way to manage university lectures
            </p>
            <p className={`mt-4 max-w-2xl text-xl ${darkMode ? 'text-gray-300' : 'text-gray-500'} lg:mx-auto`}>
              Our platform offers comprehensive tools for managing departments, programs, courses, and lecture schedules.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className={`relative p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white">
                    <Book className="h-6 w-6" />
                  </div>
                  <p className={`ml-16 text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Course Management</p>
                </dt>
                <dd className={`mt-2 ml-16 text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Easily register and manage course units, including credit allocation and department assignments.
                </dd>
              </div>

              <div className={`relative p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white">
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className={`ml-16 text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Scheduling</p>
                </dt>
                <dd className={`mt-2 ml-16 text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Intelligent scheduling system that optimizes room allocation and prevents lecture collisions.
                </dd>
              </div>

              <div className={`relative p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className={`ml-16 text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Management</p>
                </dt>
                <dd className={`mt-2 ml-16 text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Role-based access control for administrators and department heads with appropriate permissions.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gray-900 border-t border-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
          <p className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            &copy; {new Date().getFullYear()} MMU. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

WelcomePage.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired
};

export default WelcomePage; 