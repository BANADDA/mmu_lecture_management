import {
    BookMarked,
    Building,
    Clock,
    Edit,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    UserCog,
    Users
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useState } from 'react';

const DepartmentsManagement = ({ darkMode, userRole }) => {
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDepartment, setCurrentDepartment] = useState({
    name: '',
    code: '',
    hodId: '',
    isApproved: true
  });
  const [editMode, setEditMode] = useState(false);
  const [editDeptId, setEditDeptId] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Mock heads of departments for dropdown
  const hods = [
    { id: 1, name: 'Dr. John Smith', department: 'Computer Science' },
    { id: 2, name: 'Dr. Sarah Johnson', department: 'Business Information Technology' },
    { id: 3, name: 'Prof. Michael Williams', department: 'Mechanical Engineering' },
    { id: 4, name: 'Dr. Elizabeth Brown', department: 'Software Engineering' },
    { id: 5, name: 'Prof. Robert Davis', department: 'Electrical Engineering' },
  ];

  // Mock departments for display
  const mockDepartments = [
    { id: 1, name: 'Computer Science', code: 'CS', hodId: 1, hod: 'Dr. John Smith', programs: 4, courses: 24, students: 365, isApproved: true, faculty: 'Computing and Engineering' },
    { id: 2, name: 'Business Information Technology', code: 'BIT', hodId: 2, hod: 'Dr. Sarah Johnson', programs: 3, courses: 18, students: 280, isApproved: true, faculty: 'Computing and Engineering' },
    { id: 3, name: 'Business Administration', code: 'BA', hodId: null, hod: 'Position Vacant', programs: 5, courses: 30, students: 450, isApproved: true, faculty: 'Business and Management' },
    { id: 4, name: 'Software Engineering', code: 'SE', hodId: 4, hod: 'Dr. Elizabeth Brown', programs: 2, courses: 16, students: 180, isApproved: true, faculty: 'Computing and Engineering' },
    { id: 5, name: 'Mechanical Engineering', code: 'ME', hodId: 3, hod: 'Prof. Michael Williams', programs: 3, courses: 22, students: 240, isApproved: true, faculty: 'Computing and Engineering' },
    { id: 6, name: 'Electrical Engineering', code: 'EE', hodId: 5, hod: 'Prof. Robert Davis', programs: 3, courses: 20, students: 210, isApproved: false, faculty: 'Computing and Engineering' },
  ];

  // Filter departments based on the search query
  const filteredDepartments = mockDepartments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.hod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock programs for the department view
  const mockDepartmentPrograms = [
    { id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSc. CS', department: 'Computer Science', duration: 4, students: 245, courses: 38, isActive: true, yearStarted: 2018 },
    { id: 2, name: 'Bachelor of Business Information Technology', code: 'BBIT', department: 'Business Information Technology', duration: 4, students: 180, courses: 32, isActive: true, yearStarted: 2019 },
    { id: 3, name: 'Master of Science in Computer Science', code: 'MSc. CS', department: 'Computer Science', duration: 2, students: 45, courses: 12, isActive: true, yearStarted: 2020 },
    { id: 4, name: 'Diploma in Computer Science', code: 'DCS', department: 'Computer Science', duration: 2, students: 75, courses: 18, isActive: true, yearStarted: 2021 },
    { id: 5, name: 'Bachelor of Software Engineering', code: 'BSE', department: 'Software Engineering', duration: 4, students: 120, courses: 36, isActive: true, yearStarted: 2019 },
    { id: 6, name: 'Bachelor of Business Administration', code: 'BBA', department: 'Business Administration', duration: 3, students: 210, courses: 28, isActive: true, yearStarted: 2017 },
    { id: 7, name: 'Higher Diploma in Networking', code: 'HDN', department: 'Computer Science', duration: 1, students: 30, courses: 10, isActive: false, yearStarted: 2022 },
  ];
  
  // Get programs that belong to a specific department
  const getDepartmentPrograms = (deptName) => {
    return mockDepartmentPrograms.filter(program => program.department === deptName);
  };

  const handleFormChange = (field, value) => {
    setCurrentDepartment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddDepartment = () => {
    // In a real app, you would make an API call to add the department
    console.log('Adding/updating department:', currentDepartment);
    
    if (editMode) {
      alert(`Department ${currentDepartment.name} has been updated`);
    } else {
      alert(`Department ${currentDepartment.name} has been added successfully`);
    }
    
    resetAndCloseModal();
  };

  const handleEditDepartment = (deptId) => {
    const deptToEdit = mockDepartments.find(dept => dept.id === deptId);
    if (deptToEdit) {
      setCurrentDepartment({
        name: deptToEdit.name,
        code: deptToEdit.code,
        hodId: deptToEdit.hodId || '',
        isApproved: deptToEdit.isApproved
      });
      setEditMode(true);
      setEditDeptId(deptId);
      setShowAddDeptModal(true);
    }
  };
  
  const handleViewDepartment = (deptId) => {
    const department = mockDepartments.find(dept => dept.id === deptId);
    setSelectedDepartment(department);
  };
  
  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
  };

  const resetAndCloseModal = () => {
    setCurrentDepartment({
      name: '',
      code: '',
      hodId: '',
      isApproved: true
    });
    setEditMode(false);
    setEditDeptId(null);
    setShowAddDeptModal(false);
  };

  // Render department details view when a department is selected
  if (selectedDepartment) {
    return (
      <div className="p-6">
        {/* Back button and header */}
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={handleBackToDepartments}
            className={`p-2 rounded-md ${
              darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {selectedDepartment.name} Department
          </h1>
        </div>
        
        {/* Department details card */}
        <div className={`mb-8 p-6 rounded-lg ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        } shadow-sm`}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mr-4`}>
                  <Building className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department Code</p>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedDepartment.code}
                  </h3>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Head of Department
                </h3>
                <div className="flex items-center">
                  {selectedDepartment.hodId ? (
                    <>
                      <div className={`p-2 rounded-full ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'} mr-3`}>
                        <UserCog className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedDepartment.hod}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Managing {selectedDepartment.programs} programs and overseeing {selectedDepartment.courses} courses
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className={`p-4 rounded-lg border ${
                      darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Position Vacant
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>This department is currently {selectedDepartment.isApproved ? 'active | approved' : 'inactive | pending'} and offers {selectedDepartment.programs} academic programs with a total of {selectedDepartment.courses} course units.</p>
              </div>
            </div>
            
            <div className="md:w-64 flex flex-col">
              <div className={`p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Department Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Programs</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedDepartment.programs}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Courses</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedDepartment.courses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedDepartment.isApproved
                        ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                        : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                    }`}>
                      {selectedDepartment.isApproved ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleEditDepartment(selectedDepartment.id)} 
                className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                  darkMode 
                    ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 border border-blue-800/30' 
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <Edit className="h-4 w-4" />
                <span>Edit Department</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Department programs */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Department Programs
          </h2>
          
          <button 
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm ${
              darkMode 
                ? 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30 border border-indigo-800/30' 
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" /> 
            <span>Add Program</span>
          </button>
        </div>
        
        {/* Programs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {getDepartmentPrograms(selectedDepartment.name).map(program => (
            <div 
              key={program.id} 
              className={`border rounded-lg p-5 ${
                darkMode 
                  ? 'border-gray-700 hover:border-indigo-500/50 bg-gray-800/50' 
                  : 'border-gray-200 hover:border-indigo-300 bg-white'
              } transition-all`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'} mr-3`}>
                    <BookMarked className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <div>
                    <h3 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {program.code}
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {program.duration} {program.duration === 1 ? 'Year' : 'Years'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button className={`p-1.5 rounded-lg ${
                    darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                  }`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h4 className={`text-base mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {program.name}
              </h4>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className={`rounded-lg p-2 text-center ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                }`}>
                  <div className="text-xs opacity-70 mb-1">Students</div>
                  <div className="text-sm font-medium">{program.students}</div>
                </div>
                <div className={`rounded-lg p-2 text-center ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                }`}>
                  <div className="text-xs opacity-70 mb-1">Courses</div>
                  <div className="text-sm font-medium">{program.courses}</div>
                </div>
                <div className={`rounded-lg p-2 text-center ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                }`}>
                  <div className="text-xs opacity-70 mb-1">Since</div>
                  <div className="flex items-center justify-center">
                    <Clock className="h-3 w-3 mr-1 opacity-70" />
                    <span className="text-sm font-medium">{program.yearStarted}</span>
                  </div>
                </div>
              </div>
              
              <button 
                className={`w-full mt-2 py-1.5 rounded-lg text-sm font-medium ${
                  darkMode 
                    ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                View Program Details
              </button>
            </div>
          ))}
          
          {getDepartmentPrograms(selectedDepartment.name).length === 0 && (
            <div className={`col-span-3 p-8 text-center rounded-lg border ${
              darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <Building className={`h-10 w-10 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                No Programs Found
              </h3>
              <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This department doesn't have any programs registered yet
              </p>
              <button 
                className={`inline-flex items-center px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Plus className="h-4 w-4 mr-2" /> 
                <span>Add First Program</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Departments Management
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Register and manage departments, assign Heads of Department
          </p>
        </div>
        
        {userRole === 'admin' && (
          <button 
            onClick={() => setShowAddDeptModal(true)}
            className={`inline-flex items-center px-5 py-3 rounded-lg text-lg ${
              darkMode 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Plus className="h-5 w-5 mr-2" /> 
            <span>Register Department</span>
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className={`p-5 rounded-lg ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'} flex items-start gap-3 max-w-lg`}>
          <div className={`p-3 rounded-full ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
            <Building className={`h-6 w-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
              Department Registration
            </h3>
            <p className={`text-base ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
              Each department must have a unique name, faculty, and can have an assigned Head of Department.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center rounded-lg border px-4 py-2 min-w-[240px] ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          }`}>
            <Search className="h-5 w-5 text-gray-400 mr-2" />
            <input 
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`outline-none border-none text-base ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            />
          </div>
          
          <button className={`p-3 rounded-lg border ${
            darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'
          }`}>
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Departments grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6 px-4">
        {filteredDepartments.map(dept => (
          <div 
            key={dept.id} 
            className={`rounded-lg overflow-hidden ${
              darkMode 
                ? 'bg-gray-900 border border-gray-800' 
                : 'bg-white border border-gray-200'
            } transition-all shadow-lg`}
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {dept.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{dept.faculty}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  dept.isApproved
                    ? 'bg-green-900/20 text-green-500 border border-green-700/20' 
                    : 'bg-yellow-900/20 text-yellow-500 border border-yellow-700/20'
                }`}>
                  {dept.isApproved ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="text-3xl font-bold text-blue-500 mb-5">
                {dept.programs} <span className="text-sm opacity-70">Programs</span>
              </div>

              <div className={`p-3 mb-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center mb-2">
                  <UserCog className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-500">HoD:</span>
                </div>
                <div className={`text-sm font-medium ${
                  dept.hod !== 'Position Vacant' 
                    ? (darkMode ? 'text-white' : 'text-gray-800') 
                    : 'text-yellow-500'
                }`}>
                  {dept.hod !== 'Position Vacant' ? dept.hod : 'Position Vacant'}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    Students: <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{dept.students}</span>
                  </span>
                </div>

                <div className="flex space-x-1">
                  {userRole === 'admin' && (
                    <button 
                      onClick={() => handleEditDepartment(dept.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={resetAndCloseModal}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editMode ? 'Edit Department' : 'Register New Department'}
                  </h3>
                  <button 
                    onClick={resetAndCloseModal}
                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Modal body */}
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Department Name
                    </label>
                    <input 
                      type="text" 
                      value={currentDepartment.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Department Code
                    </label>
                    <input 
                      type="text" 
                      value={currentDepartment.code}
                      onChange={(e) => handleFormChange('code', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      placeholder="e.g., CS"
                    />
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      A short unique code for the department (2-5 characters)
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Head of Department
                    </label>
                    <select 
                      value={currentDepartment.hodId}
                      onChange={(e) => handleFormChange('hodId', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                    >
                      <option value="" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Not Assigned</option>
                      {hods.map(hod => (
                        <option key={hod.id} value={hod.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                          {hod.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="isApproved"
                      checked={currentDepartment.isApproved}
                      onChange={(e) => handleFormChange('isApproved', e.target.checked)}
                      className="mr-2 h-4 w-4"
                    />
                    <label htmlFor="isApproved" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Department is approved
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={resetAndCloseModal}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleAddDepartment}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700`}
                >
                  {editMode ? 'Update Department' : 'Register Department'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DepartmentsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired
};

export default DepartmentsManagement; 