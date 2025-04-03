import {
    BookOpen,
    Edit,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Users
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useState } from 'react';

const CoursesManagement = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCourse, setCurrentCourse] = useState({
    name: '',
    code: '',
    creditUnits: '3',
    programId: '',
    yearOfStudy: '1',
    semester: '1',
    isApproved: true,
    isCrossCutting: false
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Get programs based on user role
  // Admin can see all programs, HoD only sees their department's programs
  const allPrograms = [
    { id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSc. CS', department: 'Computer Science' },
    { id: 2, name: 'Bachelor of Business Information Technology', code: 'BBIT', department: 'Business Information Technology' },
    { id: 3, name: 'Bachelor of Business Administration', code: 'BBA', department: 'Business Administration' },
    { id: 4, name: 'Diploma in Computer Science', code: 'DCS', department: 'Computer Science' },
    { id: 5, name: 'Bachelor of Software Engineering', code: 'BSE', department: 'Software Engineering' },
  ];

  // Filter programs based on user role
  const programs = userRole === 'admin' 
    ? allPrograms 
    : allPrograms.filter(program => program.department === userDepartment);

  // Mock courses for display
  const mockCourses = [
    { id: 1, name: 'Introduction to Programming', code: 'BIT 1201', program: 'Bachelor of Business Information Technology', department: 'Business Information Technology', programId: 2, creditUnits: 4, yearOfStudy: 1, semester: 2, courseNumber: '01', students: 68, lecturer: 'Prof. Mary Johnson', isApproved: true, isCrossCutting: true },
    { id: 2, name: 'Database Systems', code: 'CS 2104', program: 'Bachelor of Science in Computer Science', department: 'Computer Science', programId: 1, creditUnits: 3, yearOfStudy: 2, semester: 1, courseNumber: '04', students: 42, lecturer: 'Dr. John Smith', isApproved: true, isCrossCutting: false },
    { id: 3, name: 'Software Engineering', code: 'SE 3201', program: 'Bachelor of Software Engineering', department: 'Software Engineering', programId: 5, creditUnits: 4, yearOfStudy: 3, semester: 2, courseNumber: '01', students: 35, lecturer: 'Dr. Elizabeth Brown', isApproved: true, isCrossCutting: false },
    { id: 4, name: 'Web Development', code: 'CS 2302', program: 'Bachelor of Science in Computer Science', department: 'Computer Science', programId: 1, creditUnits: 3, yearOfStudy: 2, semester: 3, courseNumber: '02', students: 48, lecturer: 'Jane Williams', isApproved: true, isCrossCutting: false },
    { id: 5, name: 'Operating Systems', code: 'CS 3105', program: 'Bachelor of Science in Computer Science', department: 'Computer Science', programId: 1, creditUnits: 3, yearOfStudy: 3, semester: 1, courseNumber: '05', students: 38, lecturer: 'Not Assigned', isApproved: true, isCrossCutting: false },
    { id: 6, name: 'Business Statistics', code: 'BBA 2103', program: 'Bachelor of Business Administration', department: 'Business Administration', programId: 3, creditUnits: 3, yearOfStudy: 2, semester: 1, courseNumber: '03', students: 76, lecturer: 'Not Assigned', isApproved: true, isCrossCutting: false },
    { id: 7, name: 'Computer Networks', code: 'CS 3201', program: 'Bachelor of Science in Computer Science', department: 'Computer Science', programId: 1, creditUnits: 4, yearOfStudy: 3, semester: 2, courseNumber: '01', students: 32, lecturer: 'Dr. John Smith', isApproved: false, isCrossCutting: false },
  ];

  // Filter courses based on search query and user role
  const filteredCourses = mockCourses.filter(course => {
    // Text search filter
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.lecturer && course.lecturer.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Role-based filter
    if (userRole === 'hod') {
      // HoDs can only see their department's courses or cross-cutting courses
      return matchesSearch && (course.department === userDepartment || course.isCrossCutting);
    }
    
    return matchesSearch;
  });

  const handleFormChange = (field, value) => {
    if (field === 'programId') {
      // When program changes, update the course code prefix
      const selectedProgram = programs.find(p => p.id.toString() === value);
      const codePrefix = selectedProgram ? selectedProgram.code.split('.')[0] : '';
      
      setCurrentCourse(prev => ({
        ...prev,
        [field]: value,
        code: value ? `${codePrefix} ${prev.yearOfStudy}${prev.semester}${prev.courseNumber || '01'}` : prev.code
      }));
    } else if (['yearOfStudy', 'semester', 'courseNumber'].includes(field)) {
      // When year, semester or course number changes, update the course code
      const updatedValues = {
        ...currentCourse,
        [field]: value
      };
      
      const programId = updatedValues.programId;
      if (programId) {
        const selectedProgram = programs.find(p => p.id.toString() === programId);
        const codePrefix = selectedProgram ? selectedProgram.code.split('.')[0] : '';
        const courseNum = field === 'courseNumber' ? value : (updatedValues.courseNumber || '01');
        
        setCurrentCourse({
          ...updatedValues,
          code: `${codePrefix} ${updatedValues.yearOfStudy}${updatedValues.semester}${courseNum}`
        });
      } else {
        setCurrentCourse(updatedValues);
      }
    } else {
      setCurrentCourse(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAddCourse = () => {
    // Validate required fields
    if (!currentCourse.name || !currentCourse.code || !currentCourse.programId) {
      alert('Please fill all required fields');
      return;
    }
    
    // For HoD role, validate department restrictions
    if (userRole === 'hod') {
      const selectedProgram = programs.find(p => p.id.toString() === currentCourse.programId);
      
      // Ensure the program belongs to HoD's department
      if (selectedProgram && selectedProgram.department !== userDepartment) {
        alert(`As a Head of Department, you can only create courses for programs in your department (${userDepartment}).`);
        return;
      }
      
      // If editing, ensure HoD can only edit their department's courses unless cross-cutting
      if (editMode) {
        const originalCourse = mockCourses.find(course => 
          course.name === currentCourse.name || course.code === currentCourse.code
        );
        
        if (originalCourse && originalCourse.department !== userDepartment && !originalCourse.isCrossCutting) {
          alert(`As a Head of Department, you can only edit courses for your department (${userDepartment}) or cross-cutting courses.`);
          return;
        }
      }
    }
    
    // In a real app, you would make an API call to add the course
    console.log('Adding/updating course:', currentCourse);
    
    if (editMode) {
      alert(`Course ${currentCourse.name} has been updated`);
    } else {
      alert(`Course ${currentCourse.name} has been added successfully`);
    }
    
    resetAndCloseModal();
  };

  const handleEditCourse = (courseId) => {
    const courseToEdit = mockCourses.find(course => course.id === courseId);
    if (courseToEdit) {
      setCurrentCourse({
        name: courseToEdit.name,
        code: courseToEdit.code,
        creditUnits: courseToEdit.creditUnits.toString(),
        programId: courseToEdit.programId.toString(),
        yearOfStudy: courseToEdit.yearOfStudy.toString(),
        semester: courseToEdit.semester.toString(),
        courseNumber: courseToEdit.courseNumber,
        isApproved: courseToEdit.isApproved,
        isCrossCutting: courseToEdit.isCrossCutting
      });
      setEditMode(true);
      setShowAddCourseModal(true);
    }
  };

  const handleViewCourse = (courseId) => {
    const course = mockCourses.find(c => c.id === courseId);
    setSelectedCourse(course);
  };
  
  const handleBackToCourses = () => {
    setSelectedCourse(null);
  };

  const resetAndCloseModal = () => {
    setCurrentCourse({
      name: '',
      code: '',
      creditUnits: '3',
      programId: '',
      yearOfStudy: '1',
      semester: '1',
      courseNumber: '01',
      isApproved: true,
      isCrossCutting: false
    });
    setEditMode(false);
    setShowAddCourseModal(false);
  };

  const getCodeExplanation = (code) => {
    // For a code like "BIT 1201", this would return "[1201] - Year 1, semester 2 course 01"
    if (!code || code.length < 5) return '';
    
    const numericPart = code.split(' ')[1]; // Get "1201" from "BIT 1201"
    if (!numericPart || numericPart.length < 4) return '';
    
    const year = numericPart[0];
    const semester = numericPart[1];
    const courseNum = numericPart.substring(2);
    
    return `[${numericPart}] - Year ${year}, semester ${semester} course ${courseNum}`;
  };

  // Render course details view when a course is selected
  if (selectedCourse) {
    // Course details view code omitted for brevity
    return (
      <div className="p-6">
        {/* Back button and details */}
        <button onClick={handleBackToCourses}>Back to Courses</button>
        <h1>{selectedCourse.name}</h1>
        <p>Code: {selectedCourse.code}</p>
        <p>Department: {selectedCourse.department}</p>
        <p>Credit Units: {selectedCourse.creditUnits}</p>
        <p>Year of Study: {selectedCourse.yearOfStudy}</p>
        <p>Semester: {selectedCourse.semester}</p>
        <p>Lecturer: {selectedCourse.lecturer}</p>
        <p>Status: {selectedCourse.isApproved ? 'Active | approved' : 'Inactive | pending'}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Course Units Management
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {userRole === 'admin' 
              ? 'Register and manage course units across all departments' 
              : `Register and manage course units within ${userDepartment} department`}
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddCourseModal(true)}
          className={`inline-flex items-center px-5 py-3 rounded-lg text-lg ${
            darkMode 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <Plus className="h-6 w-6 mr-2" /> 
          <span>Register Course Unit</span>
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className={`p-5 rounded-lg ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'} flex items-start gap-3 max-w-lg`}>
          <div className={`p-3 rounded-full ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
            <BookOpen className={`h-6 w-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
              Course Unit Registration
            </h3>
            <p className={`text-base ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
              Each course unit must have a unique code, credit units value, and belong to a specific department.
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
              placeholder="Search courses..."
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

      {/* Courses grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6 px-4">
        {filteredCourses.map(course => (
          <div 
            key={course.id} 
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
                    {course.code}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{course.department}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  course.isApproved
                    ? 'bg-green-900/20 text-green-500 border border-green-700/20' 
                    : 'bg-yellow-900/20 text-yellow-500 border border-yellow-700/20'
                }`}>
                  {course.isApproved ? 'Active' : 'Inactive'}
                </div>
              </div>

              <h4 className={`text-lg mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {course.name}
              </h4>

              <div className="text-3xl font-bold text-blue-500 mb-5">
                {course.creditUnits} <span className="text-sm opacity-70">Units</span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    Lecturer: {course.lecturer !== 'Not Assigned' ? 
                      <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{course.lecturer.split(' ')[1]}</span> : 
                      <span className="text-yellow-500">Not Assigned</span>}
                  </span>
                </div>

                <div className="flex space-x-1">
                  <button 
                    onClick={() => handleEditCourse(course.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleViewCourse(course.id)}
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

      {/* Add/Edit course modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={resetAndCloseModal}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Modal content here */}
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">
                  {editMode ? 'Edit Course Unit' : 'Register New Course Unit'}
                </h3>
                {/* Form fields would go here */}
                <div className="mt-4 flex justify-end gap-2">
                  <button 
                    onClick={resetAndCloseModal}
                    className="px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddCourse}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white"
                  >
                    {editMode ? 'Update Course Unit' : 'Register Course Unit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

CoursesManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  userDepartment: PropTypes.string
};

export default CoursesManagement; 