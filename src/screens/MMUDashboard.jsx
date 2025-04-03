import {
    BarChart,
    BookMarked,
    BookOpen,
    Building,
    Calendar,
    Circle,
    Clock,
    Home,
    Menu,
    Moon,
    Settings,
    Sun,
    User,
    UserCog,
    UserPlus,
    Users
} from 'lucide-react';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import AllocationsManagement from './mmu/AllocationsManagement';
import CoursesManagement from './mmu/CoursesManagement';
import DepartmentsManagement from './mmu/DepartmentsManagement';
import ProgramsManagement from './mmu/ProgramsManagement';
import ScheduleCalendar from './mmu/ScheduleCalendar';
import UsersManagement from './mmu/UsersManagement';

const MMUDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [userRole, setUserRole] = useState('admin'); // 'admin' or 'hod'

  // Define admin and HoD menus
  const adminMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'users', label: 'Users Management', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building },
    { id: 'programs', label: 'Programs', icon: BookMarked },
    { id: 'courses', label: 'Course Units', icon: BookOpen },
    { id: 'allocations', label: 'Allocate Courses', icon: UserCog },
    { id: 'schedule', label: 'Schedule Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // HoD menu with specific department focus
  const hodDepartment = 'Computer Science'; // Specific department for the HoD
  const hodMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'programs', label: 'Programs', icon: BookMarked },
    { id: 'courses', label: 'Course Units', icon: BookOpen },
    { id: 'allocations', label: 'Allocate Courses', icon: UserCog },
    { id: 'schedule', label: 'Schedule Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Select appropriate menu based on user role
  const menuItems = userRole === 'admin' ? adminMenu : hodMenu;

  // For demonstration purposes - you'd replace this with actual data
  const stats = {
    departments: 8,
    programs: 24,
    courses: 156,
    lecturers: 42,
    students: 1250,
    activeClasses: 78,
    collisions: 3,
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const toggleRole = () => {
    setUserRole(prev => prev === 'admin' ? 'hod' : 'admin');
  };

  const renderContent = () => {
    switch(activeSection) {
      case 'users':
        return <UsersManagement darkMode={darkMode} userRole={userRole} />;
      case 'departments':
        return <DepartmentsManagement darkMode={darkMode} userRole={userRole} />;
      case 'programs':
        return <ProgramsManagement darkMode={darkMode} userRole={userRole} userDepartment={userRole === 'hod' ? hodDepartment : undefined} />;
      case 'courses':
        return <CoursesManagement darkMode={darkMode} userRole={userRole} userDepartment={userRole === 'hod' ? hodDepartment : undefined} />;
      case 'allocations':
        return <AllocationsManagement darkMode={darkMode} userRole={userRole} userDepartment={userRole === 'hod' ? hodDepartment : undefined} />;
      case 'schedule':
        return <ScheduleCalendar darkMode={darkMode} userRole={userRole} userDepartment={userRole === 'hod' ? hodDepartment : undefined} />;
      default:
        return userRole === 'admin' ? renderAdminDashboard() : renderHodDashboard();
    }
  };

  // Admin Dashboard View with university-wide focus
  const renderAdminDashboard = () => (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          University Lecture Management System
        </h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Administrative Dashboard - University-wide Overview
        </p>
      </div>

      {/* University-wide Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard 
          title="Departments" 
          value={stats.departments}
          icon={<Building className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />}
          darkMode={darkMode}
          color="blue"
        />
        <StatsCard 
          title="Programs" 
          value={stats.programs}
          icon={<BookMarked className={`h-6 w-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />}
          darkMode={darkMode}
          color="indigo"
        />
        <StatsCard 
          title="Course Units" 
          value={stats.courses}
          icon={<BookOpen className={`h-6 w-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />}
          darkMode={darkMode}
          color="amber"
        />
        <StatsCard 
          title="Lecturers" 
          value={stats.lecturers}
          icon={<Users className={`h-6 w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />}
          darkMode={darkMode}
          color="emerald"
        />
      </div>

      {/* System-wide Metrics */}
      <div className={`p-6 rounded-lg shadow-sm mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          System Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Total Students
              </span>
              <UserPlus className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {stats.students}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                +12% ↑
              </span>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Active Classes
              </span>
              <Calendar className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {stats.activeClasses}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                Currently Running
              </span>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                System Status
              </span>
              <Settings className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                All Systems Online
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                100% Uptime
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Admin Actions */}
      <div className={`p-6 rounded-lg shadow-sm mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Administrative Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            label="Register User"
            icon={<UserPlus size={20} />}
            onClick={() => setActiveSection('users')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="Add Department"
            icon={<Building size={20} />}
            onClick={() => setActiveSection('departments')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="System Analytics"
            icon={<BarChart size={20} />}
            onClick={() => setActiveSection('analytics')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="View Schedule"
            icon={<Calendar size={20} />}
            onClick={() => setActiveSection('schedule')}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Collision alerts */}
      {stats.collisions > 0 && (
        <div className={`p-6 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-100'} mb-8`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <Clock className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div>
              <h3 className={`font-medium text-lg mb-1 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                University-wide Lecture Collision Alert
              </h3>
              <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'} mb-3`}>
                There are currently {stats.collisions} lecture collisions across departments that need to be resolved.
              </p>
              <button 
                onClick={() => setActiveSection('schedule')}
                className={`text-sm px-3 py-1.5 rounded-md ${
                  darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60' : 
                  'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                View & Resolve Collisions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // HoD Dashboard View with department-specific focus
  const renderHodDashboard = () => {
    // Department-specific stats
    const departmentStats = {
      programs: 3,
      courses: 24,
      lecturers: 8,
      students: 245,
      activeClasses: 12,
      collisions: 1,
      upcomingExams: 3
    };
    
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {hodDepartment} Department Dashboard
          </h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Head of Department View - Department-specific Management
          </p>
        </div>

        {/* Department Banner */}
        <div className={`p-6 rounded-lg mb-8 bg-gradient-to-r ${
          darkMode 
            ? 'from-indigo-900/30 to-blue-900/30 border border-indigo-800/50' 
            : 'from-indigo-50 to-blue-50 border border-indigo-100'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
              <Building className={`h-8 w-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {hodDepartment}
              </h2>
              <p className={`text-sm ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                Faculty of Computing and Engineering
              </p>
            </div>
          </div>
        </div>

        {/* Department Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatsCard 
            title="Programs" 
            value={departmentStats.programs}
            icon={<BookMarked className={`h-6 w-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />}
            darkMode={darkMode}
            color="indigo"
          />
          <StatsCard 
            title="Course Units" 
            value={departmentStats.courses}
            icon={<BookOpen className={`h-6 w-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />}
            darkMode={darkMode}
            color="amber"
          />
          <StatsCard 
            title="Lecturers" 
            value={departmentStats.lecturers}
            icon={<Users className={`h-6 w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />}
            darkMode={darkMode}
            color="emerald"
          />
        </div>

        {/* Quick HOD Actions */}
        <div className={`p-6 rounded-lg shadow-sm mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Department Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionButton
              label="Manage Programs"
              icon={<BookMarked size={20} />}
              onClick={() => setActiveSection('programs')}
              darkMode={darkMode}
            />
            <QuickActionButton
              label="Manage Courses"
              icon={<BookOpen size={20} />}
              onClick={() => setActiveSection('courses')}
              darkMode={darkMode}
            />
            <QuickActionButton
              label="Allocate Courses"
              icon={<UserCog size={20} />}
              onClick={() => setActiveSection('allocations')}
              darkMode={darkMode}
            />
            <QuickActionButton
              label="Department Schedule"
              icon={<Calendar size={20} />}
              onClick={() => setActiveSection('schedule')}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* Department Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Students & Classes Card */}
          <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Department Overview
            </h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{departmentStats.students}</p>
                </div>
                <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <UserPlus className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Classes</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{departmentStats.activeClasses}</p>
                </div>
                <div className={`p-3 rounded-full ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                  <Calendar className={`h-6 w-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Upcoming Exams</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{departmentStats.upcomingExams}</p>
                </div>
                <div className={`p-3 rounded-full ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                  <Clock className={`h-6 w-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Collision Card */}
          {departmentStats.collisions > 0 ? (
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-100'}`}>
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-full ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
                  <Clock className={`h-6 w-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <div>
                  <h3 className={`font-medium text-lg mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                    Department Lecture Collision
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'} mb-4`}>
                    There is {departmentStats.collisions} lecture collision in your department that needs immediate attention.
                  </p>
                  <div className={`p-4 rounded-lg mb-4 ${darkMode ? 'bg-red-900/30' : 'bg-red-100/80'}`}>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Collision Details:</p>
                    <ul className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'} space-y-2 list-disc pl-4`}>
                      <li>Database Systems (CS 2104) - Tuesday 14:00</li>
                      <li>Web Development (CS 2302) - Tuesday 14:00</li>
                      <li>Room: LR 305</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => setActiveSection('schedule')}
                    className={`text-sm px-4 py-2 rounded-lg ${
                      darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60' : 
                      'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    Resolve Collision Now
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-100'}`}>
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-full ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                  <Calendar className={`h-6 w-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <div>
                  <h3 className={`font-medium text-lg mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                    Schedule Status
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-600'} mb-3`}>
                    All lectures in your department are properly scheduled. No collisions detected.
                  </p>
                  <button 
                    onClick={() => setActiveSection('schedule')}
                    className={`text-sm px-3 py-1.5 rounded-md ${
                      darkMode ? 'bg-green-900/40 text-green-300 hover:bg-green-900/60' : 
                      'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    View Department Schedule
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-[var(--polaris-bg-darker)]' : 'bg-gray-50'} text-gray-900 dark:text-gray-100`}>
      {/* Top Navigation */}
      <header className={`border-b ${darkMode ? 'border-[var(--polaris-border-dark)]' : 'border-gray-200'} py-3 px-6 flex items-center justify-between`}>
        <div className="flex items-center">
          <button
            onClick={toggleMenu}
            className={`p-2 rounded-md ${darkMode ? 'hover:bg-[var(--polaris-card-bg)]' : 'hover:bg-gray-100'} mr-3`}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-9 h-9 rounded bg-[var(--polaris-accent-blue)] text-white font-bold text-base mr-3">
              MMU
            </div>
            <h1 className="text-xl font-semibold">MMU Lecture Management</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-md ${darkMode ? 'bg-[var(--polaris-card-bg)]' : 'bg-gray-100'}`}
          >
            {darkMode ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-700" />}
          </button>
          <button
            onClick={toggleRole}
            className={`${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded text-base font-medium`}
          >
            {userRole === 'admin' ? 'Administrator' : 'Head of Department'}
          </button>
          <div className={`p-2 rounded-full ${darkMode ? 'bg-[var(--polaris-card-bg)]' : 'bg-gray-100'}`}>
            <User className="h-5 w-5" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${menuOpen ? 'w-60' : 'w-16'} transition-all duration-300 ease-in-out border-r ${
            darkMode ? 'bg-[var(--polaris-bg-dark)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200'
          } flex flex-col overflow-y-auto custom-scrollbar`}
        >
          <div className="p-3">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <div key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center ${
                      !menuOpen ? 'justify-center' : ''
                    } p-2.5 rounded text-base ${
                      activeSection === item.id
                        ? `${darkMode ? 'bg-[var(--polaris-card-bg)]' : 'bg-gray-100'} font-medium`
                        : `${darkMode ? 'hover:bg-[var(--polaris-card-bg)]' : 'hover:bg-gray-100'} text-gray-500`
                    } transition-colors`}
                  >
                    {item.icon && React.createElement(item.icon, {
                      className: `h-5 w-5 ${!menuOpen ? 'mx-auto' : 'mr-3'}`
                    })}
                    {menuOpen && <span>{item.label}</span>}
                  </button>

                  {menuOpen && item.items && activeSection === item.id && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.items.map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={() => setActiveSection(subItem.id)}
                          className={`w-full flex items-center p-2 rounded text-base ${
                            activeSection === subItem.id
                              ? `font-medium`
                              : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-800'}`
                          }`}
                        >
                          <Circle className={`h-2 w-2 mr-2.5 ${activeSection === subItem.id ? 'fill-current' : ''}`} />
                          <span>{subItem.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content header with expand/minimize toggle */}
          <div className={`py-3 px-6 border-b ${darkMode ? 'border-[var(--polaris-border-dark)] bg-[var(--polaris-bg-dark)]' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">
                {menuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`p-2 rounded ${darkMode ? 'hover:bg-[var(--polaris-card-bg)] text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                  title={menuOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {menuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="15" y1="3" x2="15" y2="21"></line>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => document.documentElement.requestFullscreen()}
                  className={`p-2 rounded ${darkMode ? 'hover:bg-[var(--polaris-card-bg)] text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                  title="Fullscreen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="flex-1 overflow-auto w-full pb-16">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 z-10 border-t ${
        darkMode ? 'bg-[var(--polaris-bg-dark)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200'
      } py-2 px-4`}>
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          {/* Quick Links */}
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setActiveSection('dashboard')}
              className={`flex flex-col items-center p-1 ${
                activeSection === 'dashboard' 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800')
              }`}
            >
              <Home className="h-5 w-5 mb-1" />
              <span className="text-xs">Home</span>
            </button>
            
            <button 
              onClick={() => setActiveSection('users')}
              className={`flex flex-col items-center p-1 ${
                activeSection === 'users' 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800')
              }`}
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-xs">Users</span>
            </button>
            
            <button 
              onClick={() => setActiveSection('courses')}
              className={`flex flex-col items-center p-1 ${
                activeSection === 'courses' 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800')
              }`}
            >
              <BookOpen className="h-5 w-5 mb-1" />
              <span className="text-xs">Courses</span>
            </button>
            
            <button 
              onClick={() => setActiveSection('schedule')}
              className={`flex flex-col items-center p-1 ${
                activeSection === 'schedule' 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800')
              }`}
            >
              <Calendar className="h-5 w-5 mb-1" />
              <span className="text-xs">Schedule</span>
            </button>
          </div>

          {/* Mode & Role */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${darkMode ? 'bg-[var(--polaris-card-bg)]' : 'bg-gray-100'}`}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-700" />}
            </button>
            
            <button
              onClick={toggleRole}
              className={`${
                darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
              } px-3 py-1 rounded text-sm`}
            >
              {userRole === 'admin' ? 'Admin' : 'HoD'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, darkMode, color }) => {
  return (
    <div className={`p-3 rounded border ${
      darkMode 
        ? 'bg-[var(--polaris-card-bg)] border-[var(--polaris-border-dark)]' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded ${
          darkMode ? `bg-${color}-900/20` : `bg-${color}-50`
        }`}>
          {React.cloneElement(icon, { className: `h-3.5 w-3.5 ${darkMode ? `text-${color}-400` : `text-${color}-600`}` })}
        </div>
        <span className={`text-xl font-semibold ${
          darkMode ? `text-${color}-400` : `text-${color}-600`
        }`}>{value}</span>
      </div>
      <h3 className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</h3>
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ label, icon, onClick, darkMode }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded border ${
        darkMode 
          ? 'bg-[var(--polaris-card-bg)] hover:bg-gray-800 border-[var(--polaris-border-dark)]' 
          : 'bg-white hover:bg-gray-50 border-gray-200'
      }`}
    >
      <div className={`p-1.5 rounded mb-1 ${
        darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'
      }`}>
        {icon}
      </div>
      <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
    </button>
  );
};

MMUDashboard.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  updateDarkMode: PropTypes.func.isRequired,
  userRole: PropTypes.oneOf(['admin', 'hod']),
};

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.node.isRequired,
  darkMode: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
};

QuickActionButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
};

export default MMUDashboard; 