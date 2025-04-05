import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    BookMarked,
    BookOpen,
    Building,
    Clock,
    Edit,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Users
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const ProgramsManagement = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const { user } = useAuth();
  
  // State variables for program management
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentProgram, setCurrentProgram] = useState({
    name: '',
    code: '',
    duration: '4',
    departmentId: '',
    departmentName: '',
    isActive: true,
    createdBy: '',
    createdAt: null,
    updatedAt: null
  });
  const [editMode, setEditMode] = useState(false);
  const [editProgramId, setEditProgramId] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // State for programs, departments, and courses
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programCourses, setProgramCourses] = useState([]);

  // Firebase functions for program management
  // Function to load all departments from Firestore
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const departmentsRef = collection(db, 'departments');
        const q = query(departmentsRef, where("isActive", "==", true), orderBy("name"));
        
        const snapshot = await getDocs(q);
        const departmentData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDepartments(departmentData);
      } catch (error) {
        console.error("Error loading departments:", error);
        toast.error("Failed to load departments");
      }
    };
    
    loadDepartments();
  }, []);
  
  // Function to load all programs from Firestore with real-time updates
  useEffect(() => {
    setIsLoading(true);
    
    let q;
    const programsRef = collection(db, 'programs');
    
    // If user is HoD, only show programs from their department
    if (userRole === 'hod') {
      const userDepartmentObj = departments.find(dept => dept.name === userDepartment);
      const userDepartmentId = userDepartmentObj ? userDepartmentObj.id : null;
      
      if (userDepartmentId) {
        q = query(programsRef, where("departmentId", "==", userDepartmentId), orderBy("createdAt", "desc"));
      } else {
        // If department ID not found, don't query yet
        setIsLoading(false);
        return;
      }
    } else {
      // For admin, show all programs
      q = query(programsRef, orderBy("createdAt", "desc"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const programData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPrograms(programData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading programs:", error);
      toast.error("Failed to load programs");
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, [userRole, userDepartment, departments]);
  
  // Function to load courses for a specific program
  const loadProgramCourses = async (programId) => {
    try {
      setIsLoading(true);
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, where("programId", "==", programId), orderBy("yearOfStudy"), orderBy("semester"));
      
      const snapshot = await getDocs(q);
      const courseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProgramCourses(courseData);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Failed to load program courses");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add a new program
  const handleAddProgram = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!currentProgram.name || !currentProgram.code || !currentProgram.duration) {
        toast.error("Please fill in all required fields");
        setIsLoading(false);
        return;
      }
      
      // For HoD, automatically set department
      let departmentId = currentProgram.departmentId;
      let departmentName = '';
      
      if (userRole === 'hod') {
        const userDepartmentObj = departments.find(dept => dept.name === userDepartment);
        if (userDepartmentObj) {
          departmentId = userDepartmentObj.id;
          departmentName = userDepartmentObj.name;
        } else {
          toast.error("Department not found. Please contact admin.");
          setIsLoading(false);
          return;
        }
      } else {
        // For admin, get department name from selected departmentId
        if (!departmentId) {
          toast.error("Please select a department");
          setIsLoading(false);
          return;
        }
        const selectedDept = departments.find(dept => dept.id === departmentId);
        departmentName = selectedDept ? selectedDept.name : '';
      }
      
      // Create or update program object
      const programData = {
        name: currentProgram.name,
        code: currentProgram.code.toUpperCase(),
        duration: parseInt(currentProgram.duration),
        departmentId: departmentId,
        departmentName: departmentName,
        isActive: currentProgram.isActive,
        updatedAt: serverTimestamp()
      };
      
      if (editMode) {
        // Update existing program
        const programRef = doc(db, 'programs', editProgramId);
        await updateDoc(programRef, programData);
        toast.success(`Program ${currentProgram.name} has been updated`);
      } else {
        // Add new program
        const newProgramRef = doc(collection(db, 'programs'));
        await setDoc(newProgramRef, {
          ...programData,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          students: 0,
          courses: 0,
          yearStarted: new Date().getFullYear()
        });
        toast.success(`Program ${currentProgram.name} has been added successfully`);
        
        // Update department to increment programs count
        try {
          const deptRef = doc(db, 'departments', departmentId);
          const deptDoc = await getDoc(deptRef);
          if (deptDoc.exists()) {
            const currentPrograms = deptDoc.data().programs || 0;
            await updateDoc(deptRef, {
              programs: currentPrograms + 1,
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Error updating department program count:", error);
        }
      }
      
      resetAndCloseModal();
    } catch (error) {
      console.error("Error adding/updating program:", error);
      toast.error("Failed to save program");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to delete a program
  const handleDeleteProgram = async () => {
    if (!editProgramId) return;
    
    try {
      setDeletingProgram(true);
      
      // Get program details to update department count after deletion
      const programRef = doc(db, 'programs', editProgramId);
      const programDoc = await getDoc(programRef);
      
      if (programDoc.exists()) {
        const programData = programDoc.data();
        
        // Delete the program
        await deleteDoc(programRef);
        
        // Update department to decrement programs count
        if (programData.departmentId) {
          try {
            const deptRef = doc(db, 'departments', programData.departmentId);
            const deptDoc = await getDoc(deptRef);
            if (deptDoc.exists()) {
              const currentPrograms = deptDoc.data().programs || 0;
              if (currentPrograms > 0) {
                await updateDoc(deptRef, {
                  programs: currentPrograms - 1,
                  updatedAt: serverTimestamp()
                });
              }
            }
          } catch (error) {
            console.error("Error updating department program count:", error);
          }
        }
        
        toast.success("Program has been deleted");
      }
      
      resetAndCloseModal();
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting program:", error);
      toast.error("Failed to delete program");
    } finally {
      setDeletingProgram(false);
    }
  };
  
  // Function to toggle program active status
  const toggleProgramStatus = async (programId, currentStatus) => {
    try {
      const programRef = doc(db, 'programs', programId);
      await updateDoc(programRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Program ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error("Error toggling program status:", error);
      toast.error("Failed to update program status");
    }
  };

  const handleFormChange = (field, value) => {
    setCurrentProgram(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditProgram = (programId) => {
    const programToEdit = programs.find(program => program.id === programId);
    if (programToEdit) {
      setCurrentProgram({
        name: programToEdit.name,
        code: programToEdit.code,
        duration: programToEdit.duration.toString(),
        departmentId: programToEdit.departmentId.toString(),
        departmentName: programToEdit.departmentName,
        isActive: programToEdit.isActive,
        createdBy: programToEdit.createdBy,
        createdAt: programToEdit.createdAt,
        updatedAt: programToEdit.updatedAt
      });
      setEditMode(true);
      setEditProgramId(programId);
      setShowAddProgramModal(true);
    }
  };
  
  const handleViewProgram = (programId) => {
    const program = programs.find(prog => prog.id === programId);
    setSelectedProgram(program);
  };
  
  const handleBackToPrograms = () => {
    setSelectedProgram(null);
  };

  const resetAndCloseModal = () => {
    setCurrentProgram({
      name: '',
      code: '',
      duration: '4',
      departmentId: '',
      departmentName: '',
      isActive: true,
      createdBy: '',
      createdAt: null,
      updatedAt: null
    });
    setEditMode(false);
    setEditProgramId(null);
    setShowAddProgramModal(false);
  };

  // Render program details view when a program is selected
  if (selectedProgram) {
    return (
      <div className="p-6">
        {/* Back button and header */}
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={handleBackToPrograms}
            className={`p-2 rounded-md ${
              darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {selectedProgram.name}
          </h1>
        </div>
        
        {/* Program details card */}
        <div className={`mb-8 p-6 rounded-lg ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        } shadow-sm`}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'} mr-4`}>
                  <BookMarked className={`h-6 w-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Program Code</p>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedProgram.code}
                  </h3>
                </div>
              </div>
              
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department</p>
                  <div className="flex items-center mt-1">
                    <Building className={`h-4 w-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedProgram.departmentName}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Duration</p>
                  <div className="flex items-center mt-1">
                    <Clock className={`h-4 w-4 mr-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedProgram.duration} {selectedProgram.duration === 1 ? 'Year' : 'Years'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>This program was established in {selectedProgram.yearStarted} and is currently
                {selectedProgram.isActive ? ' active' : ' not active'}. It has a total of {selectedProgram.courses} courses
                distributed across {selectedProgram.duration * 2} semesters.</p>
              </div>
            </div>
            
            <div className="md:w-64 flex flex-col">
              <div className={`p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Program Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Students</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedProgram.students}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Courses</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedProgram.courses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedProgram.isActive
                        ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                        : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                    }`}>
                      {selectedProgram.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleEditProgram(selectedProgram.id)} 
                className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                  darkMode 
                    ? 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40 border border-indigo-800/30' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <Edit className="h-4 w-4" />
                <span>Edit Program</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Course units table */}
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Program Course Units
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
                  <th className="px-4 py-3 text-center">Credit Units</th>
                  <th className="px-4 py-3 text-center">Year</th>
                  <th className="px-4 py-3 text-center">Semester</th>
                  <th className="px-4 py-3 text-left">Lecturer</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {programCourses.map(course => (
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
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {course.creditUnits}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                        Year {course.yearOfStudy}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                        Semester {course.semester}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {course.lecturer !== 'Not Assigned' ? (
                          <>
                            <div className={`p-1 rounded-full ${darkMode ? 'bg-green-900/30' : 'bg-green-100'} mr-2`}>
                              <Users className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                            </div>
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                              {course.lecturer}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">Not Assigned</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Programs Management
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {userRole === 'admin' 
              ? 'Register and manage programs across all departments' 
              : `Register and manage programs under ${userDepartment} department`}
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddProgramModal(true)}
          className={`inline-flex items-center px-5 py-3 rounded-lg text-lg ${
            darkMode 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <Plus className="h-6 w-6 mr-2" /> 
          <span>Register Program</span>
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className={`p-5 rounded-lg ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'} flex items-start gap-3 max-w-lg`}>
          <div className={`p-3 rounded-full ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
            <BookMarked className={`h-6 w-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
              Program Registration
            </h3>
            <p className={`text-base ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
              Each program must have a unique code, defined duration, and belong to a specific department.
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
              placeholder="Search programs..."
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

      {/* Programs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 px-4">
        {programs.map(program => (
          <div 
            key={program.id} 
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
                    {program.code}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{program.departmentName}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  program.isActive
                    ? 'bg-green-900/20 text-green-500 border border-green-700/20' 
                    : 'bg-yellow-900/20 text-yellow-500 border border-yellow-700/20'
                }`}>
                  {program.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              <h4 className={`text-lg mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {program.name}
              </h4>

              <div className="text-3xl font-bold text-blue-500 mb-5">
                {program.duration} <span className="text-sm opacity-70">Years</span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    Students: <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{program.students}</span>
                  </span>
                </div>

                <div className="flex space-x-1">
                  <button 
                    onClick={() => handleEditProgram(program.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleViewProgram(program.id)}
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

      {/* Add/Edit program modal */}
      {showAddProgramModal && (
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
                    {editMode ? 'Edit Program' : 'Register New Program'}
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
                    <label className="block text-sm font-medium mb-1">Program Name</label>
                    <input 
                      type="text" 
                      value={currentProgram.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}
                      placeholder="e.g., Bachelor of Science in Computer Science"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Program Code</label>
                    <input 
                      type="text" 
                      value={currentProgram.code}
                      onChange={(e) => handleFormChange('code', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}
                      placeholder="e.g., BSc. CS"
                    />
                    <p className="text-xs mt-1 opacity-70">
                      A unique code for the program (typically an abbreviation)
                    </p>
                  </div>
                  
                  {userRole === 'admin' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Department</label>
                      <select 
                        value={currentProgram.departmentId}
                        onChange={(e) => handleFormChange('departmentId', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (Years)</label>
                    <select 
                      value={currentProgram.duration}
                      onChange={(e) => handleFormChange('duration', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="1">1 Year</option>
                      <option value="2">2 Years</option>
                      <option value="3">3 Years</option>
                      <option value="4">4 Years</option>
                      <option value="5">5 Years</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      checked={currentProgram.isActive}
                      onChange={(e) => handleFormChange('isActive', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="isActive" className="text-sm">
                      Program is active
                    </label>
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
                  onClick={handleAddProgram}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700`}
                >
                  {editMode ? 'Update Program' : 'Register Program'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ProgramsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  userDepartment: PropTypes.string
};

export default ProgramsManagement; 