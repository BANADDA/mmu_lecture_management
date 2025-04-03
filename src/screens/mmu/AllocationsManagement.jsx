import {
    BookOpen,
    CheckSquare,
    Edit,
    Filter,
    Plus,
    Search,
    User,
    UserCog,
    X
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useState } from 'react';

const AllocationsManagement = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentAllocation, setCurrentAllocation] = useState({
    courseId: '',
    lecturerId: '',
    notes: ''
  });
  const [editMode, setEditMode] = useState(false);

  // Mock lecturers for dropdown
  const allLecturers = [
    { id: 1, name: 'Dr. John Smith', department: 'Computer Science', expertise: 'Programming, Database Systems', courseLoad: 2 },
    { id: 2, name: 'Prof. Mary Johnson', department: 'Business Information Technology', expertise: 'Web Development, IT Project Management', courseLoad: 3 },
    { id: 3, name: 'Dr. Elizabeth Brown', department: 'Software Engineering', expertise: 'Software Design, Testing', courseLoad: 2 },
    { id: 4, name: 'Jane Williams', department: 'Computer Science', expertise: 'Web Development, UI/UX', courseLoad: 3 },
    { id: 5, name: 'Prof. Michael Wilson', department: 'Computer Science', expertise: 'AI, Machine Learning', courseLoad: 1 },
  ];
  
  // Filter lecturers based on user role
  const lecturers = userRole === 'admin' 
    ? allLecturers 
    : allLecturers.filter(lecturer => lecturer.department === userDepartment);

  // Filter unallocated courses based on user role
  const allUnallocatedCourses = [
    { id: 5, name: 'Operating Systems', code: 'CS 3105', program: 'Bachelor of Science in Computer Science', department: 'Computer Science', yearSemester: 'Year 3, Semester 1', creditUnits: 3, isCrossCutting: false },
    { id: 6, name: 'Business Statistics', code: 'BBA 2103', program: 'Bachelor of Business Administration', department: 'Business Administration', yearSemester: 'Year 2, Semester 1', creditUnits: 3, isCrossCutting: false },
    { id: 8, name: 'Advanced Programming', code: 'CS 2203', program: 'Bachelor of Science in Computer Science', department: 'Computer Science', yearSemester: 'Year 2, Semester 2', creditUnits: 4, isCrossCutting: false },
  ];
  
  // Filter unallocated courses based on user role and department
  const unallocatedCourses = userRole === 'admin'
    ? allUnallocatedCourses
    : allUnallocatedCourses.filter(course => course.department === userDepartment || course.isCrossCutting);

  // Mock allocated courses
  const allAllocatedCourses = [
    { id: 1, courseId: 1, course: 'Introduction to Programming', code: 'BIT 1201', program: 'Bachelor of Business Information Technology', department: 'Business Information Technology', yearSemester: 'Year 1, Semester 1', lecturerId: 2, lecturer: 'Prof. Mary Johnson', allocatedOn: '2023-08-15', notes: 'Lecturer has previous experience with this course', isCrossCutting: true },
    { id: 2, courseId: 2, course: 'Database Systems', code: 'CS 2104', program: 'Bachelor of Science in Computer Science', department: 'Computer Science', yearSemester: 'Year 2, Semester 1', lecturerId: 1, lecturer: 'Dr. John Smith', allocatedOn: '2023-08-10', notes: '', isCrossCutting: false },
    { id: 3, courseId: 3, course: 'Software Engineering', code: 'SE 3201', program: 'Bachelor of Software Engineering', department: 'Software Engineering', yearSemester: 'Year 3, Semester 2', lecturerId: 3, lecturer: 'Dr. Elizabeth Brown', allocatedOn: '2023-08-12', notes: 'Primary area of expertise', isCrossCutting: false },
    { id: 4, courseId: 4, course: 'Web Development', code: 'CS 2302', program: 'Bachelor of Science in Computer Science', department: 'Computer Science', yearSemester: 'Year 2, Semester 2', lecturerId: 4, lecturer: 'Jane Williams', allocatedOn: '2023-08-14', notes: '', isCrossCutting: false },
  ];

  // Filter allocations based on the search query and user role
  const filteredAllocations = allAllocatedCourses
    .filter(allocation => {
      // Text search filter
      const matchesSearch = allocation.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        allocation.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        allocation.lecturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        allocation.program.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Role-based filter
      if (userRole === 'hod') {
        return matchesSearch && (allocation.department === userDepartment || allocation.isCrossCutting);
      }
      
      return matchesSearch;
    });

  const handleFormChange = (field, value) => {
    setCurrentAllocation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAllocate = () => {
    // In a real app, you would make an API call to add/update the allocation
    
    // First, validate that required fields are filled
    if (!currentAllocation.courseId || !currentAllocation.lecturerId) {
      alert('Please select both a course and a lecturer');
      return;
    }
    
    // For HoD role, ensure the course and lecturer belong to their department
    if (userRole === 'hod') {
      // Get the selected course
      const selectedCourse = [...unallocatedCourses, ...allAllocatedCourses.map(a => ({
        id: a.courseId,
        department: a.department,
        isCrossCutting: a.isCrossCutting
      }))].find(c => c.id.toString() === currentAllocation.courseId);
      
      // Get the selected lecturer
      const selectedLecturer = lecturers.find(l => l.id.toString() === currentAllocation.lecturerId);
      
      // Check if course belongs to the HoD's department or is cross-cutting
      if (selectedCourse && !selectedCourse.isCrossCutting && selectedCourse.department !== userDepartment) {
        alert(`As a Head of Department, you can only allocate courses from your department (${userDepartment}) or cross-cutting courses.`);
        return;
      }
      
      // Check if lecturer belongs to the HoD's department
      if (selectedLecturer && selectedLecturer.department !== userDepartment) {
        alert(`As a Head of Department, you can only allocate to lecturers from your department (${userDepartment}).`);
        return;
      }
    }
    
    console.log('Allocating course:', currentAllocation);
    
    if (editMode) {
      alert(`Course allocation has been updated`);
    } else {
      alert(`Course has been allocated successfully`);
    }
    
    resetAndCloseModal();
  };

  const handleEditAllocation = (allocationId) => {
    const allocationToEdit = allAllocatedCourses.find(a => a.id === allocationId);
    if (allocationToEdit) {
      setCurrentAllocation({
        courseId: allocationToEdit.courseId.toString(),
        lecturerId: allocationToEdit.lecturerId.toString(),
        notes: allocationToEdit.notes
      });
      setEditMode(true);
      setShowAllocateModal(true);
    }
  };

  const resetAndCloseModal = () => {
    setCurrentAllocation({
      courseId: '',
      lecturerId: '',
      notes: ''
    });
    setEditMode(false);
    setShowAllocateModal(false);
  };

  return (
    <div className="p-6">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Course Allocations
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {userRole === 'admin' 
              ? 'Allocate course units to lecturers across all departments'
              : 'Allocate course units to lecturers within your department'}
          </p>
        </div>
        
        <button 
          onClick={() => setShowAllocateModal(true)}
          className={`inline-flex items-center px-4 py-2 rounded-lg ${
            darkMode 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Plus className="h-5 w-5 mr-2" /> 
          <span>Allocate Course</span>
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'} flex items-start gap-3 max-w-lg`}>
          <div className={`p-2 rounded-full ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
            <UserCog className={`h-5 w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div>
            <h3 className={`font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Course Allocation
            </h3>
            <p className={`text-sm ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
              Assign course units to qualified lecturers to balance teaching loads.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center rounded-lg border px-3 py-1.5 min-w-[240px] ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          }`}>
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input 
              type="text"
              placeholder="Search allocations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`outline-none border-none ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            />
          </div>
          
          <button className={`p-2 rounded-lg border ${
            darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'
          }`}>
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Unallocated courses section */}
      <div className="mb-8">
        <h2 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Unallocated Courses
        </h2>
        
        <div className={`border rounded-lg overflow-hidden ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`text-xs uppercase ${
                darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                <tr>
                  <th className="px-4 py-3 text-left">Course Code</th>
                  <th className="px-4 py-3 text-left">Course Name</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-center">Year/Semester</th>
                  <th className="px-4 py-3 text-center">Credits</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {unallocatedCourses.length > 0 ? (
                  unallocatedCourses.map(course => (
                    <tr key={course.id} className={`${
                      darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          darkMode ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {course.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <BookOpen className={`h-4 w-4 mr-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {course.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                          {course.program}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                          {course.yearSemester}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {course.creditUnits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => {
                            setCurrentAllocation(prev => ({ ...prev, courseId: course.id.toString() }));
                            setShowAllocateModal(true);
                          }}
                          className={`px-3 py-1 rounded-md text-xs ${
                            darkMode 
                              ? 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40' 
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          Allocate
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      All courses have been allocated to lecturers
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Allocated courses section */}
      <div>
        <h2 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Current Allocations
        </h2>
        
        <div className={`border rounded-lg overflow-hidden ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`text-xs uppercase ${
                darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                <tr>
                  <th className="px-4 py-3 text-left">Course</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-left">Lecturer</th>
                  <th className="px-4 py-3 text-center">Allocated On</th>
                  <th className="px-4 py-3 text-center">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {filteredAllocations.length > 0 ? (
                  filteredAllocations.map(allocation => (
                    <tr key={allocation.id} className={`${
                      darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center">
                            <BookOpen className={`h-4 w-4 mr-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {allocation.course}
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              darkMode ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {allocation.code}
                            </span>
                            <span className={`ml-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {allocation.yearSemester}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                          {allocation.program}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className={`p-1 rounded-full ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'} mr-2`}>
                            <User className={`h-4 w-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          </div>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            {allocation.lecturer}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {allocation.allocatedOn}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {allocation.notes ? (
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {allocation.notes.length > 20 
                              ? `${allocation.notes.substring(0, 20)}...` 
                              : allocation.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <button 
                            onClick={() => handleEditAllocation(allocation.id)}
                            className={`p-1.5 rounded-lg ${
                              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className={`p-1.5 rounded-lg ${
                            darkMode ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-100 text-red-600'
                          }`}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No allocations found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Allocate course modal */}
      {showAllocateModal && (
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
                    {editMode ? 'Edit Course Allocation' : 'Allocate Course to Lecturer'}
                  </h3>
                  <button 
                    onClick={resetAndCloseModal}
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Course</label>
                    <select 
                      value={currentAllocation.courseId}
                      onChange={(e) => handleFormChange('courseId', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}
                      disabled={editMode}
                    >
                      <option value="">Select Course</option>
                      {unallocatedCourses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.name} ({course.yearSemester})
                        </option>
                      ))}
                      {editMode && allAllocatedCourses
                        .filter(a => a.courseId.toString() === currentAllocation.courseId)
                        .map(a => (
                          <option key={a.courseId} value={a.courseId}>
                            {a.code} - {a.course} ({a.yearSemester})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Lecturer</label>
                    <select 
                      value={currentAllocation.lecturerId}
                      onChange={(e) => handleFormChange('lecturerId', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="">Select Lecturer</option>
                      {lecturers.map(lecturer => (
                        <option key={lecturer.id} value={lecturer.id}>
                          {lecturer.name} ({lecturer.courseLoad} courses currently)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                    <textarea 
                      value={currentAllocation.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}
                      placeholder="Add any notes about this allocation"
                      rows={3}
                    />
                  </div>

                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CheckSquare className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                        Allocation Guidelines
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      Ensure lecturers are assigned courses that match their expertise. The recommended course load is 2-3 courses per lecturer per semester.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={resetAndCloseModal}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleAllocate}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700`}
                >
                  {editMode ? 'Update Allocation' : 'Allocate Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

AllocationsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  userDepartment: PropTypes.string
};

export default AllocationsManagement; 