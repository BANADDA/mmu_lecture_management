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
  CheckCircle,
  Clock,
  Edit,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const ProgramsManagement = ({ 
  darkMode, 
  userRole, 
  userDepartment = 'Computer Science',
  selectedDepartmentId = null,
  onDepartmentSelected = () => {}
}) => {
  const { user } = useAuth();
  
  // State variables for program management
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [currentProgram, setCurrentProgram] = useState({
    name: '',
    code: '',
    duration: '4',
    departmentId: '',
    departmentName: '',
    facultyId: '',
    facultyName: '',
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
  const [faculties, setFaculties] = useState([]);
  const [programCourses, setProgramCourses] = useState([]);

  // Add these new state variables at the beginning of the component with other state variables
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editedCourseCodes, setEditedCourseCodes] = useState({});

  // Add this state for delete confirmation
  const [courseToDelete, setCourseToDelete] = useState(null);

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
      let facultyId = '';
      let facultyName = '';
      
      if (userRole === 'hod') {
        const userDepartmentObj = departments.find(dept => dept.name === userDepartment);
        if (userDepartmentObj) {
          departmentId = userDepartmentObj.id;
          departmentName = userDepartmentObj.name;
          facultyId = userDepartmentObj.facultyId;
          facultyName = userDepartmentObj.facultyName;
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
        facultyId = selectedDept ? selectedDept.facultyId : '';
        facultyName = selectedDept ? selectedDept.facultyName : '';
      }
      
      // Create or update program object
      const programData = {
        name: currentProgram.name,
        code: currentProgram.code.toUpperCase(),
        duration: parseInt(currentProgram.duration),
        departmentId: departmentId,
        departmentName: departmentName,
        facultyId: facultyId,
        facultyName: facultyName,
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
    loadProgramCourses(programId);
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

  // Function to load all faculties from Firestore
  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const facultiesRef = collection(db, 'faculties');
        const q = query(facultiesRef, where("isActive", "==", true), orderBy("name"));
        
        const snapshot = await getDocs(q);
        const facultiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFaculties(facultiesData);
      } catch (error) {
        console.error("Error loading faculties:", error);
        toast.error("Failed to load faculties");
      }
    };
    
    loadFaculties();
  }, []);

  // Filter by search query and filtering options
  const filteredPrograms = programs.filter(program => {
    // Filter by search query
    const matchesSearch = 
      program.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.departmentName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by department
    const matchesDepartment = 
      selectedDepartment === 'all' || 
      program.departmentId === selectedDepartment;
    
    // Filter by faculty - through department's faculty
    const matchesFaculty = 
      selectedFaculty === 'all' || 
      program.facultyId === selectedFaculty;
    
    return matchesSearch && matchesDepartment && matchesFaculty;
  });

  // Function to get color scheme based on program code
  const getProgramColorScheme = (programCode) => {
    // Define a variety of color schemes for different program types
    const colorSchemes = [
      { bg: 'bg-blue-100', accent: 'text-blue-600', dark: 'bg-blue-900/20', darkAccent: 'text-blue-400', gradient: 'from-blue-500 to-indigo-600' },
      { bg: 'bg-purple-100', accent: 'text-purple-600', dark: 'bg-purple-900/20', darkAccent: 'text-purple-400', gradient: 'from-purple-500 to-indigo-600' },
      { bg: 'bg-emerald-100', accent: 'text-emerald-600', dark: 'bg-emerald-900/20', darkAccent: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-600' },
      { bg: 'bg-amber-100', accent: 'text-amber-600', dark: 'bg-amber-900/20', darkAccent: 'text-amber-400', gradient: 'from-amber-500 to-orange-600' },
      { bg: 'bg-rose-100', accent: 'text-rose-600', dark: 'bg-rose-900/20', darkAccent: 'text-rose-400', gradient: 'from-rose-500 to-pink-600' },
      { bg: 'bg-indigo-100', accent: 'text-indigo-600', dark: 'bg-indigo-900/20', darkAccent: 'text-indigo-400', gradient: 'from-indigo-500 to-blue-600' },
      { bg: 'bg-cyan-100', accent: 'text-cyan-600', dark: 'bg-cyan-900/20', darkAccent: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-600' },
      { bg: 'bg-teal-100', accent: 'text-teal-600', dark: 'bg-teal-900/20', darkAccent: 'text-teal-400', gradient: 'from-teal-500 to-emerald-600' }
    ];
    
    // Use program code to determine color scheme (for consistency across renders)
    const hash = programCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % colorSchemes.length;
    
    return colorSchemes[colorIndex];
  };

  // Handle external department selection
  useEffect(() => {
    if (selectedDepartmentId) {
      setSelectedDepartment(selectedDepartmentId);
      
      // If we have a department ID but not its faculty, find the parent faculty
      const dept = departments.find(d => d.id === selectedDepartmentId);
      if (dept && dept.facultyId) {
        setSelectedFaculty(dept.facultyId);
      }
    }
  }, [selectedDepartmentId, departments]);

  // Update parent component when department selection changes
  const handleDepartmentChange = (deptId) => {
    setSelectedDepartment(deptId);
    if (onDepartmentSelected && deptId !== 'all') {
      onDepartmentSelected(deptId);
    }
  };

  // Fix the faculty filter by making it filter departments based on faculty
  useEffect(() => {
    // This effect updates the department filter list when faculty changes
    if (selectedFaculty !== 'all') {
      // If faculty is selected but department is from a different faculty, reset it
      const selectedDept = departments.find(dept => dept.id === selectedDepartment);
      if (selectedDepartment !== 'all' && selectedDept && selectedDept.facultyId !== selectedFaculty) {
        setSelectedDepartment('all');
      }
    }
  }, [selectedFaculty, selectedDepartment, departments]);

  // Function to delete a course
  const handleDeleteCourse = async (courseId) => {
    try {
      setIsLoading(true);
      const courseRef = doc(db, 'courses', courseId);
      await deleteDoc(courseRef);
      
      // Update program to decrement course count
      if (selectedProgram && selectedProgram.id) {
        const programRef = doc(db, 'programs', selectedProgram.id);
        const programDoc = await getDoc(programRef);
        if (programDoc.exists()) {
          const currentCourses = programDoc.data().courses || 0;
          if (currentCourses > 0) {
            await updateDoc(programRef, {
              courses: currentCourses - 1,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
      
      // Reload courses
      loadProgramCourses(selectedProgram.id);
      toast.success("Course unit deleted successfully");
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course unit");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add function to update course code
  const handleUpdateCourseCode = async (courseId, newCode) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        code: newCode,
        updatedAt: serverTimestamp()
      });
      toast.success("Course code updated");
    } catch (error) {
      console.error("Error updating course code:", error);
      toast.error("Failed to update course code");
    }
  };
  
  // Add function to update cross-cutting program
  const handleCrossCuttingUpdate = async (courseId, programId, year) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        crossCuttingPrograms: programId ? [{ programId, yearOffered: parseInt(year) }] : [],
        updatedAt: serverTimestamp()
      });
      toast.success("Cross-cutting information updated");
    } catch (error) {
      console.error("Error updating cross-cutting information:", error);
      toast.error("Failed to update cross-cutting information");
    }
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
              <button
                onClick={() => {
                  setEditProgramId(selectedProgram.id);
                  setShowDeleteConfirmation(true);
                }} 
                className={`mt-2 flex items-center justify-center gap-2 p-2 rounded-lg ${
                  darkMode 
                    ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-800/30' 
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Program</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Course units section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Program Course Units
        </h2>
        
          <div className="flex gap-2">
            <button 
              onClick={() => window.open(`/api/reports/courses?programId=${selectedProgram.id}`, '_blank')}
              className={`flex items-center px-3 py-1.5 rounded-lg text-sm ${
                darkMode 
                  ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 border border-blue-800/30' 
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <BookOpen className="h-4 w-4 mr-2" /> 
              <span>Download Report</span>
            </button>
            
            <button 
              onClick={() => {
                // Open modal to add new course
                // Implementation would go here
              }}
              className={`flex items-center px-3 py-1.5 rounded-lg text-sm ${
                darkMode 
                  ? 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40 border border-indigo-800/30' 
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Plus className="h-4 w-4 mr-2" /> 
              <span>Add Course Unit</span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <input 
                type="text"
                placeholder="Search courses..."
                className={`pl-10 pr-4 py-2 w-full rounded-lg border text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
          
          <select
            className={`px-3 py-2 rounded-lg border text-sm ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Years</option>
            {[...Array(selectedProgram.duration)].map((_, i) => (
              <option key={i} value={i+1}>Year {i+1}</option>
            ))}
          </select>
          
          <select
            className={`px-3 py-2 rounded-lg border text-sm ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {programCourses.length === 0 ? (
            <div className={`col-span-full p-8 text-center rounded-lg border ${
              darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <BookOpen className={`h-10 w-10 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                No Course Units Found
              </h3>
              <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This program does not have any course units registered yet
              </p>
              <button 
                className={`inline-flex items-center px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Plus className="h-4 w-4 mr-2" /> 
                <span>Add First Course</span>
              </button>
            </div>
          ) : (
            <>
              {programCourses.map(course => {
                // Determine color based on year
                const yearColors = [
                  { bg: 'bg-blue-100', accent: 'text-blue-600', dark: 'bg-blue-900/20', darkAccent: 'text-blue-400' },
                  { bg: 'bg-purple-100', accent: 'text-purple-600', dark: 'bg-purple-900/20', darkAccent: 'text-purple-400' },
                  { bg: 'bg-emerald-100', accent: 'text-emerald-600', dark: 'bg-emerald-900/20', darkAccent: 'text-emerald-400' },
                  { bg: 'bg-amber-100', accent: 'text-amber-600', dark: 'bg-amber-900/20', darkAccent: 'text-amber-400' },
                  { bg: 'bg-rose-100', accent: 'text-rose-600', dark: 'bg-rose-900/20', darkAccent: 'text-rose-400' },
                ];
                const colorScheme = yearColors[(course.yearOfStudy - 1) % yearColors.length];
                
                // Get available cross-cutting programs
                const crossCuttingPrograms = programs.filter(p => p.id !== selectedProgram.id);
                
                // Get existing cross-cutting program if any
                const currentCrossCutting = course.crossCuttingPrograms && course.crossCuttingPrograms.length > 0 
                  ? course.crossCuttingPrograms[0] 
                  : null;
                
                const isEditing = editingCourseId === course.id;
                const courseCode = editedCourseCodes[course.id] || course.code;
                
                return (
                  <div 
                    key={course.id} 
                    className={`rounded-lg overflow-hidden border ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                    } flex flex-col`}
                  >
                    <div className={`p-4 ${darkMode ? colorScheme.dark : colorScheme.bg}`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className={`font-medium text-sm ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                          {isEditing ? (
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              handleUpdateCourseCode(course.id, courseCode);
                              setEditingCourseId(null);
                            }}>
                              <input 
                                className={`w-full px-2 py-1 rounded ${
                                  darkMode 
                                    ? 'bg-gray-700/50 border-gray-600 text-white' 
                                    : 'bg-white/80 border-gray-200 text-gray-800'
                                } text-center border`}
                                value={courseCode}
                                onChange={(e) => {
                                  setEditedCourseCodes({
                                    ...editedCourseCodes,
                                    [course.id]: e.target.value
                                  });
                                }}
                                autoFocus
                                onBlur={() => {
                                  if (courseCode !== course.code) {
                                    handleUpdateCourseCode(course.id, courseCode);
                                  }
                                  setEditingCourseId(null);
                                }}
                              />
                            </form>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingCourseId(course.id);
                                setEditedCourseCodes({
                                  ...editedCourseCodes,
                                  [course.id]: course.code
                                });
                              }}
                              className="text-center cursor-pointer px-2 py-1 hover:bg-opacity-50 rounded"
                              title="Click to edit course code"
                            >
                        {course.code}
                            </div>
                          )}
                        </div>
                        
                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                          darkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {course.creditUnits} {course.creditUnits === 1 ? 'unit' : 'units'}
                        </div>
                      </div>
                      
                      <h3 className={`font-bold text-base leading-tight mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {course.name}
                      </h3>
                      </div>
                    
                    <div className={`px-4 py-3 flex-1 flex flex-col`}>
                      <div className="mb-2">
                        <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Year & Semester</div>
                      <div className="flex items-center">
                          <div className={`flex items-center mr-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <Clock className={`h-3 w-3 mr-1 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} />
                            <span>Year {course.yearOfStudy}</span>
                          </div>
                          <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <BookMarked className={`h-3 w-3 mr-1 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} />
                            <span>Sem {course.semester}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lecturer</div>
                        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {course.lecturer !== 'Not Assigned' ? (
                          <>
                              <Users className={`h-3 w-3 mr-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                              <span className="text-sm truncate">{course.lecturer}</span>
                          </>
                        ) : (
                            <span className="text-sm text-gray-400">Not Assigned</span>
                        )}
                      </div>
                      </div>
                      
                      <div className="mt-auto">
                        <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cross-Cutting</div>
                        <div className="flex gap-2">
                          <select 
                            id={`program-${course.id}`}
                            className={`flex-1 px-2 py-1 text-xs rounded border ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-gray-300' 
                                : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                            value={currentCrossCutting?.programId || ""}
                            onChange={(e) => {
                              const programId = e.target.value;
                              const year = document.getElementById(`year-${course.id}`).value;
                              handleCrossCuttingUpdate(course.id, programId, year);
                            }}
                          >
                            <option value="">Not cross-cutting</option>
                            {crossCuttingPrograms.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          
                          <select 
                            id={`year-${course.id}`}
                            className={`w-20 px-2 py-1 text-xs rounded border ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-gray-300' 
                                : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                            value={currentCrossCutting?.yearOffered || "1"}
                            onChange={(e) => {
                              const select = document.getElementById(`program-${course.id}`);
                              const programId = select ? select.value : (currentCrossCutting?.programId || "");
                              if (programId) {
                                handleCrossCuttingUpdate(course.id, programId, e.target.value);
                              }
                            }}
                          >
                            {[...Array(4)].map((_, i) => (
                              <option key={i} value={i+1}>Year {i+1}</option>
                            ))}
                          </select>
          </div>
                      </div>
                    </div>
                    
                    <div className={`flex border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <button
                        onClick={() => {/* Edit course implementation */}}
                        className={`flex-1 py-2 text-xs font-medium border-r ${
                          darkMode 
                            ? 'border-gray-700 hover:bg-gray-700 text-gray-300' 
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <Edit className="h-3.5 w-3.5 mx-auto" />
                      </button>
                      
                      {(userRole === 'admin' || userRole === 'hod') && (
                        <button
                          onClick={() => setCourseToDelete(course)}
                          className={`flex-1 py-2 text-xs font-medium ${
                            darkMode 
                              ? 'hover:bg-red-900/20 text-red-400' 
                              : 'hover:bg-red-50 text-red-600'
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
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
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
            <input 
              type="text"
              placeholder="Search programs by name, code or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          </div>
          
        <div className="flex gap-4">
          <div className="min-w-[180px]">
            <select
              value={selectedFaculty}
              onChange={(e) => {
                setSelectedFaculty(e.target.value);
                // Reset department selection when faculty changes
                if (e.target.value !== selectedFaculty) {
                  setSelectedDepartment('all');
                }
              }}
              className={`px-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Faculties</option>
              {faculties.map(faculty => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="min-w-[200px]">
            <select
              value={selectedDepartment}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className={`px-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Departments</option>
              {departments
                .filter(dept => selectedFaculty === 'all' || dept.facultyId === selectedFaculty)
                .map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Row */}
      <div className={`p-4 mb-6 rounded-lg grid grid-cols-3 gap-4 ${
        darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white/50 border border-gray-200 shadow-sm'
      }`}>
        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Programs</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{filteredPrograms.length}</p>
        </div>
        
        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Programs</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
            {filteredPrograms.filter(p => p.isActive).length}
          </p>
        </div>
        
        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Departments</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {new Set(filteredPrograms.map(p => p.departmentId)).size}
          </p>
        </div>
      </div>

      {/* Programs grid */}
      {isLoading && (
        <div className="col-span-full flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
      {filteredPrograms.length === 0 ? (
        <div className={`p-12 text-center rounded-lg border ${
          darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <BookMarked size={48} className={`mx-auto mb-4 opacity-20 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            No programs found
          </h3>
          <p className={`max-w-md mx-auto mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {searchQuery || selectedFaculty !== 'all' || selectedDepartment !== 'all' 
              ? "Try adjusting your search criteria or filters."
              : "Add your first program to get started."}
          </p>
          {!searchQuery && selectedFaculty === 'all' && selectedDepartment === 'all' && (
            <button 
              onClick={() => setShowAddProgramModal(true)}
              className={`inline-flex items-center px-5 py-3 rounded-lg text-lg ${
                darkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Plus className="h-5 w-5 mr-2" /> 
              <span>Register First Program</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          {filteredPrograms.map((program) => {
            const colorScheme = getProgramColorScheme(program.code);
            
            return (
          <div 
            key={program.id} 
                className={`rounded-lg overflow-hidden transition-all hover:shadow-lg transform hover:-translate-y-1 ${
              darkMode 
                    ? 'bg-gray-800 border border-gray-700' 
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <div className={`h-2 w-full bg-gradient-to-r ${colorScheme.gradient}`}></div>
                
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                      <div className={`inline-flex px-2 py-1 rounded text-sm font-semibold mb-2 ${
                        darkMode ? colorScheme.dark : colorScheme.bg
                      } ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                    {program.code}
                      </div>
                      <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {program.name}
                  </h3>
                      <div className="flex items-center">
                        <Building className={`h-3 w-3 mr-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {program.departmentName}
                        </p>
                </div>
                    </div>
                    <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                  program.isActive
                        ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                        : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                }`}>
                  {program.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

                  <div className={`mt-4 p-3 rounded-lg ${
                    darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
                  }`}>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Duration
                        </span>
                        <div className="flex items-center justify-center">
                          <Clock className={`h-3 w-3 mr-1 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} />
                          <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                            {program.duration} {program.duration === 1 ? 'Year' : 'Years'}
                          </span>
              </div>
                      </div>
                      <div className="text-center">
                        <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Students
                        </span>
                        <div className="flex items-center justify-center">
                          <Users className={`h-3 w-3 mr-1 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} />
                          <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                            {program.students || 0}
                  </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Courses
                        </span>
                        <div className="flex items-center justify-center">
                          <BookOpen className={`h-3 w-3 mr-1 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} />
                          <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                            {program.courses || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`flex border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button 
                    onClick={() => handleEditProgram(program.id)}
                    className={`flex-1 py-2 text-sm font-medium border-r ${
                      darkMode 
                        ? 'border-gray-700 hover:bg-gray-700 text-gray-300' 
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Edit className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => toggleProgramStatus(program.id, program.isActive)}
                    className={`flex-1 py-2 text-sm font-medium border-r ${
                      darkMode 
                        ? 'border-gray-700 hover:bg-gray-700 text-gray-300' 
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {program.isActive ? (
                      <XCircle className="h-4 w-4 mx-auto text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mx-auto text-green-500" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleViewProgram(program.id)}
                    className={`flex-1 py-2 text-sm font-medium ${
                      darkMode 
                        ? `${colorScheme.dark} ${colorScheme.darkAccent}` 
                        : `${colorScheme.bg} ${colorScheme.accent}`
                    }`}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
            </div>
      )}

      {/* Add/Edit program modal */}
      {showAddProgramModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={resetAndCloseModal}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editMode ? 'Edit Program' : 'Register New Program'}
                  </h3>
                  <button 
                    onClick={resetAndCloseModal}
                    className={`p-1 rounded-full ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
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
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Program Name</label>
                    <input 
                      type="text" 
                      value={currentProgram.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      placeholder="e.g., Bachelor of Science in Computer Science"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Program Code</label>
                    <input 
                      type="text" 
                      value={currentProgram.code}
                      onChange={(e) => handleFormChange('code', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      placeholder="e.g., BSc. CS"
                    />
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      A unique code for the program (typically an abbreviation)
                    </p>
                  </div>
                  
                  {userRole === 'admin' && (
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Department</label>
                      <select 
                        value={currentProgram.departmentId}
                        onChange={(e) => handleFormChange('departmentId', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
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
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Duration (Years)</label>
                    <select 
                      value={currentProgram.duration}
                      onChange={(e) => handleFormChange('duration', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
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
                      className={`mr-2 rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    />
                    <label htmlFor="isActive" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

      {/* Delete confirmation dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteConfirmation(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            }`}>
              <div className="p-6">
                <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Delete Program
                </h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Are you sure you want to delete this program? All associated data, including course units, will be permanently removed. This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirmation(false)}
                    className={`px-4 py-2 rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProgram}
                    className={`px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center ${
                      deletingProgram ? 'opacity-50' : ''
                    }`}
                    disabled={deletingProgram}
                  >
                    {deletingProgram ? (
                      'Deleting...'
                    ) : (
                      <>
                        <Trash2 size={16} className="mr-2" />
                        Delete Program
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete course confirmation dialog */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setCourseToDelete(null)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            }`}>
              <div className="p-6">
                <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Delete Course Unit
                </h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Are you sure you want to delete the course unit &ldquo;{courseToDelete?.name}&rdquo;? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setCourseToDelete(null)}
                    className={`px-4 py-2 rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteCourse(courseToDelete.id);
                      setCourseToDelete(null);
                    }}
                    className={`px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center ${
                      isLoading ? 'opacity-50' : ''
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      'Deleting...'
                    ) : (
                      <>
                        <Trash2 size={16} className="mr-2" />
                        Delete Course
                      </>
                    )}
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

ProgramsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  userDepartment: PropTypes.string,
  selectedDepartmentId: PropTypes.string,
  onDepartmentSelected: PropTypes.func
};

export default ProgramsManagement; 