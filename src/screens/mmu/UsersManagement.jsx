import {
  BookOpen,
  Edit,
  Search,
  Trash,
  User,
  UserCog,
  Users
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useState } from 'react';

const UsersManagement = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserType, setNewUserType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentForm, setCurrentForm] = useState({
    userType: '',
    fullName: '',
    email: '',
    department: userRole === 'hod' ? userDepartment : '',
    studentNumber: '',
    isFirstTimeLogin: true
  });
  
  // Mock departments for dropdown
  const departments = [
    { id: 1, name: 'Computer Science' },
    { id: 2, name: 'Business Information Technology' },
    { id: 3, name: 'Business Administration' },
    { id: 4, name: 'Software Engineering' },
    { id: 5, name: 'Mechanical Engineering' },
    { id: 6, name: 'Electrical Engineering' },
  ];

  // Mock users for display
  const mockUsers = [
    { id: 1, name: 'Dr. John Smith', role: 'hod', department: 'Computer Science', email: 'john.smith@mmu.edu', status: 'active' },
    { id: 2, name: 'Prof. Mary Johnson', role: 'lecturer', department: 'Computer Science', email: 'mary.johnson@mmu.edu', status: 'active' },
    { id: 3, name: 'Jane Williams', role: 'lecturer', department: 'Business Information Technology', email: 'jane.williams@mmu.edu', status: 'active' },
    { id: 4, name: 'Robert Brown', role: 'student', department: 'Computer Science', email: 'robert.brown@mmu.edu', studentId: 'CS2023001', status: 'active' },
    { id: 5, name: 'Susan Miller', role: 'student', department: 'Business Administration', email: 'susan.miller@mmu.edu', studentId: 'BA2023032', status: 'active' },
    { id: 6, name: 'Michael Davis', role: 'student', department: 'Software Engineering', email: 'michael.davis@mmu.edu', studentId: 'SE2023011', status: 'pending' },
    { id: 7, name: 'Admin User', role: 'admin', department: '', email: 'admin@mmu.edu', status: 'active' },
  ];

  // Filter users based on the active tab, search query, and user role
  const filteredUsers = mockUsers.filter(user => {
    // Basic filters for tab and search
    const matchesTab = activeTab === 'all' || user.role === activeTab;
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (user.studentId && user.studentId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Role-based filters
    if (userRole === 'hod') {
      // HoDs can only see users in their department (except admins)
      return matchesTab && matchesSearch && (user.department === userDepartment || user.role === 'admin');
    }
    
    // Admin can see all users
    return matchesTab && matchesSearch;
  });

  const handleFormChange = (field, value) => {
    // For HoD users, department should always be their own department
    if (userRole === 'hod' && field === 'department') {
      return; // Don't allow HoDs to change department
    }
    
    setCurrentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpenAddUser = (userType) => {
    setNewUserType(userType);
    setCurrentForm({
      userType,
      fullName: '',
      email: '',
      department: userRole === 'hod' ? userDepartment : '', // HoDs can only add users to their department
      studentNumber: '',
      isFirstTimeLogin: true
    });
    setShowAddUserModal(true);
  };

  const handleAddUser = () => {
    // In a real app, you would handle the API call to register the user here
    
    // Validate form based on role
    if (userRole === 'hod') {
      // HoDs can only add users to their department
      if (currentForm.userType === 'admin') {
        alert('As a Head of Department, you cannot create admin users.');
        return;
      }
      
      if (currentForm.department !== userDepartment) {
        alert(`As a Head of Department for ${userDepartment}, you can only add users to your department.`);
        return;
      }
    }
    
    // Perform basic validation
    if (!currentForm.fullName || !currentForm.email || !currentForm.department || 
        (currentForm.userType === 'student' && !currentForm.studentNumber)) {
      alert('Please fill all required fields');
      return;
    }
    
    console.log('Adding new user:', currentForm);
    // Simulate adding the user to the list
    alert(`User ${currentForm.fullName} will be created as ${currentForm.userType}`);
    setShowAddUserModal(false);
  };

  const renderUserForm = () => {
    const userType = newUserType || currentForm.userType;
    
    switch(userType) {
      case 'hod':
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Register Head of Department
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Heads of Department are able to manage programs, courses, and lecturer allocations.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={currentForm.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={currentForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select 
                  value={currentForm.department}
                  onChange={(e) => handleFormChange('department', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="firstTimeLogin"
                  checked={currentForm.isFirstTimeLogin}
                  onChange={(e) => handleFormChange('isFirstTimeLogin', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="firstTimeLogin" className="text-sm">
                  Require password creation on first login
                </label>
              </div>
            </div>
          </div>
        );
      
      case 'lecturer':
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Register Lecturer
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Lecturers can be allocated to course units by the Head of Department.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={currentForm.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={currentForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select 
                  value={currentForm.department}
                  onChange={(e) => handleFormChange('department', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="firstTimeLogin"
                  checked={currentForm.isFirstTimeLogin}
                  onChange={(e) => handleFormChange('isFirstTimeLogin', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="firstTimeLogin" className="text-sm">
                  Require password creation on first login
                </label>
              </div>
            </div>
          </div>
        );
      
      case 'student':
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Register Student
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Students will be validated by email and can create a password after validation.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={currentForm.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Student Number</label>
                <input 
                  type="text" 
                  value={currentForm.studentNumber}
                  onChange={(e) => handleFormChange('studentNumber', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter student number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={currentForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Program</label>
                <select 
                  value={currentForm.department}
                  onChange={(e) => handleFormChange('department', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Select program</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="firstTimeLogin"
                  checked={currentForm.isFirstTimeLogin}
                  onChange={(e) => handleFormChange('isFirstTimeLogin', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="firstTimeLogin" className="text-sm">
                  Send validation email immediately
                </label>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Select User Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => setCurrentForm({...currentForm, userType: 'hod'})}
                className={`p-4 rounded-lg border text-left ${
                  darkMode 
                    ? 'border-gray-700 hover:border-blue-500 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-blue-500 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <UserCog className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className="font-medium">Head of Department</span>
                </div>
                <p className="text-xs opacity-70">
                  Manages department programs and course allocations
                </p>
              </button>
              
              <button 
                onClick={() => setCurrentForm({...currentForm, userType: 'lecturer'})}
                className={`p-4 rounded-lg border text-left ${
                  darkMode 
                    ? 'border-gray-700 hover:border-indigo-500 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-indigo-500 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                    <BookOpen className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <span className="font-medium">Lecturer</span>
                </div>
                <p className="text-xs opacity-70">
                  Teaches courses and manages course materials
                </p>
              </button>
              
              <button 
                onClick={() => setCurrentForm({...currentForm, userType: 'student'})}
                className={`p-4 rounded-lg border text-left ${
                  darkMode 
                    ? 'border-gray-700 hover:border-amber-500 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-amber-500 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
                    <Users className={`h-5 w-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <span className="font-medium">Student</span>
                </div>
                <p className="text-xs opacity-70">
                  Enrolls in courses and views schedules
                </p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            User Management
          </h1>
          <p className={`text-lg mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {userRole === 'admin' 
              ? 'Manage all users across the university' 
              : `Manage users in the ${userDepartment} department`}
          </p>
        </div>
        
        {/* Only show full user management buttons for admin */}
        <div className="flex gap-2">
          {userRole === 'admin' && (
            <button 
              onClick={() => handleOpenAddUser('admin')}
              className={`px-4 py-2 text-base rounded-lg ${
                darkMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <span className="flex items-center">
                <UserCog className="h-5 w-5 mr-2" />
                Add Admin
              </span>
            </button>
          )}
          
          {/* Both admin and HoD can add HoDs, but HoD can only add for their department */}
          {userRole === 'admin' && (
            <button 
              onClick={() => handleOpenAddUser('hod')}
              className={`px-4 py-2 text-base rounded-lg ${
                darkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <span className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Add HoD
              </span>
            </button>
          )}
          
          <button 
            onClick={() => handleOpenAddUser('lecturer')}
            className={`px-4 py-2 text-base rounded-lg ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <span className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Add Lecturer
            </span>
          </button>
          
          <button 
            onClick={() => handleOpenAddUser('student')}
            className={`px-4 py-2 text-base rounded-lg ${
              darkMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <span className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Add Student
            </span>
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
        <div className="flex overflow-x-auto rounded-lg border shadow-sm divide-x">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'all'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            All Users
          </button>
          
          {userRole === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-3 font-medium text-base ${
                activeTab === 'admin'
                  ? darkMode 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 text-gray-800'
                  : darkMode 
                    ? 'bg-gray-800 text-gray-400' 
                    : 'bg-white text-gray-500'
              }`}
            >
              Admins
            </button>
          )}
          
          <button 
            onClick={() => setActiveTab('hod')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'hod'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            HoDs
          </button>
          
          <button 
            onClick={() => setActiveTab('lecturer')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'lecturer'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            Lecturers
          </button>
          
          <button 
            onClick={() => setActiveTab('student')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'student'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            Students
          </button>
        </div>
        
        <div className="flex-grow max-w-lg">
          <div className={`flex items-center rounded-lg border px-4 py-3 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          }`}>
            <Search className="h-6 w-6 text-gray-500 mr-2" />
            <input 
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full outline-none text-base ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className={darkMode ? 'bg-gray-900' : 'bg-gray-50'}>
            <tr>
              <th className={`px-6 py-4 text-left text-base font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              } uppercase tracking-wider`}>
                Name
              </th>
              <th className={`px-6 py-4 text-left text-base font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              } uppercase tracking-wider`}>
                Role
              </th>
              <th className={`px-6 py-4 text-left text-base font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              } uppercase tracking-wider`}>
                Department
              </th>
              <th className={`px-6 py-4 text-left text-base font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              } uppercase tracking-wider`}>
                Email
              </th>
              <th className={`px-6 py-4 text-left text-base font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              } uppercase tracking-wider`}>
                Status
              </th>
              <th className={`px-6 py-4 text-right text-base font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              } uppercase tracking-wider`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className={`px-6 py-8 text-center text-lg ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No users found matching your criteria
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className={darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}>
                  <td className={`px-6 py-5 whitespace-nowrap text-base font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user.name}
                    {user.studentId && (
                      <span className="block text-sm text-gray-500 dark:text-gray-400">
                        ID: {user.studentId}
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap text-base ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      user.role === 'admin'
                        ? darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                        : user.role === 'hod'
                          ? darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                          : user.role === 'lecturer'
                            ? darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                            : darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 
                       user.role === 'hod' ? 'Head of Department' : 
                       user.role === 'lecturer' ? 'Lecturer' : 'Student'}
                    </span>
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap text-base ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {user.department || '-'}
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap text-base ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {user.email}
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap`}>
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      user.status === 'active'
                        ? darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                        : darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-base font-medium">
                    {/* Only allow editing if the user has permission */}
                    {(userRole === 'admin' || 
                     (userRole === 'hod' && user.department === userDepartment && user.role !== 'admin' && user.role !== 'hod')) && (
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          className={`p-2 rounded-lg ${
                            darkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-gray-100'
                          }`}
                        >
                          <Edit className="h-5 w-5" />
                        </button>

                        {/* Only admin can delete users or HoD can delete lecturers/students in their department */}
                        {(userRole === 'admin' || 
                         (userRole === 'hod' && user.department === userDepartment && 
                          (user.role === 'lecturer' || user.role === 'student'))) && (
                          <button 
                            className={`p-2 rounded-lg ${
                              darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'
                            }`}
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddUserModal(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Add New User
                  </h3>
                  <button 
                    onClick={() => setShowAddUserModal(false)}
                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Modal body */}
              <div className="px-6 py-4">
                {renderUserForm()}
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  className={`px-4 py-2 rounded-md text-base font-medium ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleAddUser}
                  className={`px-4 py-2 rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700`}
                >
                  Register User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

UsersManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  userDepartment: PropTypes.string
};

export default UsersManagement; 