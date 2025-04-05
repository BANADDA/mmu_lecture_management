import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import {
  BookOpen,
  Building,
  CheckCircle,
  Edit,
  Filter,
  MoreHorizontal,
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

const CoursesManagement = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const { user } = useAuth();
  
  // State variables for course management
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [currentCourse, setCurrentCourse] = useState({
    name: '',
    code: '',
    creditUnits: '3',
    programId: '',
    programName: '',
    departmentId: '',
    departmentName: '',
    yearOfStudy: '1',
    semester: '1',
    courseNumber: '01',
    isActive: true,
    isCrossCutting: false,
    createdBy: '',
    createdAt: null,
    updatedAt: null
  });
  const [editMode, setEditMode] = useState(false);
  const [editCourseId, setEditCourseId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  
  // State for courses and programs
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);

  // Load departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const departmentsSnapshot = await getDocs(collection(db, 'departments'));
        const departmentsData = departmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDepartments(departmentsData);
      } catch (error) {
        console.error("Error loading departments:", error);
        toast.error("Failed to load departments");
      }
    };
    
    fetchDepartments();
  }, []);

  // Function to load all programs from Firestore
  useEffect(() => {
    const loadPrograms = async () => {
      try {
        setIsLoading(true);
        const programsRef = collection(db, 'programs');
        let q;
        
        // If user is HoD, only show programs from their department
        if (userRole === 'hod') {
          const departmentsRef = collection(db, 'departments');
          const deptQuery = query(departmentsRef, where("name", "==", userDepartment), where("isActive", "==", true));
          const deptSnapshot = await getDocs(deptQuery);
          
          if (!deptSnapshot.empty) {
            const departmentId = deptSnapshot.docs[0].id;
            q = query(programsRef, where("departmentId", "==", departmentId), where("isActive", "==", true), orderBy("name"));
          } else {
            // If department not found, don't query programs
            setIsLoading(false);
            return;
          }
        } else {
          // For admin, show all active programs
          q = query(programsRef, where("isActive", "==", true), orderBy("name"));
        }
        
        const snapshot = await getDocs(q);
        const programData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPrograms(programData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading programs:", error);
        toast.error("Failed to load programs");
        setIsLoading(false);
      }
    };
    
    loadPrograms();
  }, [userRole, userDepartment]);
  
  // Function to load all courses from Firestore with real-time updates
  useEffect(() => {
    if (programs.length === 0) return; // Don't query if programs haven't loaded
    
    setIsLoading(true);
    let q;
    const coursesRef = collection(db, 'courses');
    
    // If user is HoD, only show courses from their department or cross-cutting courses
    if (userRole === 'hod') {
      const departmentPrograms = programs.map(program => program.id);
      
      if (departmentPrograms.length > 0) {
        q = query(
          coursesRef, 
          where("programId", "in", departmentPrograms),
          orderBy("createdAt", "desc")
        );
      } else {
        // If no programs in department, don't query
        setIsLoading(false);
        return;
      }
    } else if (userRole === 'admin' && selectedDepartment !== 'all') {
      // For admin with selected department
      q = query(
        coursesRef,
        where("departmentName", "==", selectedDepartment),
        orderBy("createdAt", "desc")
      );
    } else {
      // For admin showing all courses
      q = query(coursesRef, orderBy("createdAt", "desc"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(courseData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading courses:", error);
      toast.error("Failed to load courses");
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, [programs, userRole, selectedDepartment]);
  
  // Filter courses based on search query and user role
  const filteredCourses = courses.filter(course => {
    // Text search filter
    const matchesSearch = 
      course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.programName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.lecturer?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Role-based filter
    if (userRole === 'hod') {
      // HoDs can see courses from their department or cross-cutting courses
      return matchesSearch && (course.departmentName === userDepartment || course.isCrossCutting);
    }
    
    // Department filter for admin users
    if (userRole === 'admin' && selectedDepartment !== 'all') {
      return matchesSearch && (course.departmentName === selectedDepartment || course.isCrossCutting);
    }
    
    return matchesSearch;
  });

  const handleFormChange = (field, value) => {
    if (field === 'programId') {
      // When program changes, update the course code prefix and department
      const selectedProgram = programs.find(p => p.id === value);
      
      if (selectedProgram) {
        const codePrefix = selectedProgram.code.split('.')[0];
        
        setCurrentCourse(prev => ({
          ...prev,
          [field]: value,
          programName: selectedProgram.name,
          departmentId: selectedProgram.departmentId,
          departmentName: selectedProgram.departmentName,
          code: `${codePrefix} ${prev.yearOfStudy}${prev.semester}${prev.courseNumber || '01'}`
        }));
      } else {
        setCurrentCourse(prev => ({
          ...prev,
          [field]: value,
          programName: '',
          departmentId: '',
          departmentName: ''
        }));
      }
    } else if (['yearOfStudy', 'semester', 'courseNumber'].includes(field)) {
      // When year, semester or course number changes, update the course code
      const updatedValues = {
        ...currentCourse,
        [field]: value
      };
      
      const programId = updatedValues.programId;
      if (programId) {
        const selectedProgram = programs.find(p => p.id === programId);
        if (selectedProgram) {
          const codePrefix = selectedProgram.code.split('.')[0];
          const courseNum = field === 'courseNumber' ? value : (updatedValues.courseNumber || '01');
          
          setCurrentCourse({
            ...updatedValues,
            code: `${codePrefix} ${updatedValues.yearOfStudy}${updatedValues.semester}${courseNum}`
          });
        } else {
          setCurrentCourse(updatedValues);
        }
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

  const handleAddCourse = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!currentCourse.name || !currentCourse.code || !currentCourse.programId) {
        toast.error('Please fill all required fields');
        setIsLoading(false);
        return;
      }
      
      // For HoD role, validate department restrictions
      if (userRole === 'hod') {
        const selectedProgram = programs.find(p => p.id === currentCourse.programId);
        
        // Ensure the program belongs to HoD's department
        if (selectedProgram && selectedProgram.departmentName !== userDepartment) {
          toast.error(`As a Head of Department, you can only create courses for programs in your department (${userDepartment}).`);
          setIsLoading(false);
          return;
        }
        
        // If editing, ensure HoD can only edit their department's courses unless cross-cutting
        if (editMode) {
          const originalCourse = courses.find(course => course.id === editCourseId);
          
          if (originalCourse && originalCourse.departmentName !== userDepartment && !originalCourse.isCrossCutting) {
            toast.error(`As a Head of Department, you can only edit courses for your department (${userDepartment}) or cross-cutting courses.`);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Create course data object
      const courseData = {
        name: currentCourse.name,
        code: currentCourse.code.toUpperCase(),
        creditUnits: parseInt(currentCourse.creditUnits),
        programId: currentCourse.programId,
        programName: currentCourse.programName,
        departmentId: currentCourse.departmentId,
        departmentName: currentCourse.departmentName,
        yearOfStudy: parseInt(currentCourse.yearOfStudy),
        semester: parseInt(currentCourse.semester),
        courseNumber: currentCourse.courseNumber,
        isActive: currentCourse.isActive,
        isCrossCutting: currentCourse.isCrossCutting,
        students: editMode ? (currentCourse.students || 0) : 0,
        lecturer: currentCourse.lecturer || 'Not Assigned',
        updatedAt: serverTimestamp()
      };
      
      if (editMode) {
        // Update existing course
        const courseRef = doc(db, 'courses', editCourseId);
        await updateDoc(courseRef, courseData);
        toast.success(`Course ${currentCourse.name} has been updated`);
      } else {
        // Add new course
        const newCourseRef = doc(collection(db, 'courses'));
        await setDoc(newCourseRef, {
          ...courseData,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          students: 0
        });
        toast.success(`Course ${currentCourse.name} has been added successfully`);
        
        // Update program to increment courses count
        try {
          const programRef = doc(db, 'programs', currentCourse.programId);
          const programDoc = await getDoc(programRef);
          if (programDoc.exists()) {
            const currentCourses = programDoc.data().courses || 0;
            await updateDoc(programRef, {
              courses: currentCourses + 1,
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Error updating program course count:", error);
        }
      }
      
      resetAndCloseModal();
    } catch (error) {
      console.error("Error adding/updating course:", error);
      toast.error("Failed to save course");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteCourse = async () => {
    if (!editCourseId) return;
    
    try {
      setDeletingCourse(true);
      
      // Get course details to update program count after deletion
      const courseRef = doc(db, 'courses', editCourseId);
      const courseDoc = await getDoc(courseRef);
      
      if (courseDoc.exists()) {
        const courseData = courseDoc.data();
        
        // Delete the course
        await deleteDoc(courseRef);
        
        // Update program to decrement courses count
        if (courseData.programId) {
          try {
            const programRef = doc(db, 'programs', courseData.programId);
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
          } catch (error) {
            console.error("Error updating program course count:", error);
          }
        }
        
        toast.success("Course has been deleted");
      }
      
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    } finally {
      setDeletingCourse(false);
    }
  };
  
  const toggleCourseStatus = async (courseId, currentStatus) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Course ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error("Error toggling course status:", error);
      toast.error("Failed to update course status");
    }
  };

  const handleEditCourse = (courseId) => {
    const courseToEdit = courses.find(course => course.id === courseId);
    if (courseToEdit) {
      setCurrentCourse({
        name: courseToEdit.name,
        code: courseToEdit.code,
        creditUnits: courseToEdit.creditUnits.toString(),
        programId: courseToEdit.programId,
        programName: courseToEdit.programName,
        departmentId: courseToEdit.departmentId,
        departmentName: courseToEdit.departmentName,
        yearOfStudy: courseToEdit.yearOfStudy.toString(),
        semester: courseToEdit.semester.toString(),
        courseNumber: courseToEdit.courseNumber,
        isActive: courseToEdit.isActive,
        isCrossCutting: courseToEdit.isCrossCutting,
        lecturer: courseToEdit.lecturer,
        students: courseToEdit.students,
        createdBy: courseToEdit.createdBy,
        createdAt: courseToEdit.createdAt,
        updatedAt: courseToEdit.updatedAt
      });
      setEditMode(true);
      setEditCourseId(courseId);
      setShowAddCourseModal(true);
    }
  };

  const handleViewCourse = (courseId) => {
    const course = courses.find(c => c.id === courseId);
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
      programName: '',
      departmentId: '',
      departmentName: '',
      yearOfStudy: '1',
      semester: '1',
      courseNumber: '01',
      isActive: true,
      isCrossCutting: false,
      createdBy: '',
      createdAt: null,
      updatedAt: null
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
    return (
      <div className="p-6">
        {/* Back button and header */}
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={handleBackToCourses}
            className={`p-2 rounded-md ${
              darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {selectedCourse.name}
          </h1>
        </div>
        
        {/* Course details card */}
        <div className={`mb-8 p-6 rounded-lg ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        } shadow-sm`}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-amber-900/30' : 'bg-amber-100'} mr-4`}>
                  <BookOpen className={`h-6 w-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Course Code</p>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedCourse.code}
                  </h3>
                </div>
              </div>
              
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Program</p>
                  <div className="flex items-center mt-1">
                    <Building className={`h-4 w-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedCourse.programName}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department</p>
                  <div className="flex items-center mt-1">
                    <Building className={`h-4 w-4 mr-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedCourse.departmentName}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-3 gap-4 p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Year of Study</p>
                  <div className="flex items-center mt-1">
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Year {selectedCourse.yearOfStudy}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Semester</p>
                  <div className="flex items-center mt-1">
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Semester {selectedCourse.semester}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Credit Units</p>
                  <div className="flex items-center mt-1">
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedCourse.creditUnits} Units
                    </span>
                  </div>
                </div>
              </div>

              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>
                  This course is {selectedCourse.isActive ? 'active' : 'not active'}{selectedCourse.isCrossCutting ? ' and is a cross-cutting course' : ''}.
                  {selectedCourse.students > 0 ? ` It currently has ${selectedCourse.students} student${selectedCourse.students !== 1 ? 's' : ''} enrolled.` : ' It has no students enrolled yet.'}
                </p>
              </div>
            </div>
            
            <div className="md:w-64 flex flex-col">
              <div className={`p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Course Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Students</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedCourse.students || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lecturer</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedCourse.lecturer || 'Not Assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedCourse.isActive
                        ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                        : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                    }`}>
                      {selectedCourse.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleEditCourse(selectedCourse.id)} 
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                    darkMode 
                      ? 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40 border border-indigo-800/30' 
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Course</span>
                </button>
                
                <button
                  onClick={() => toggleCourseStatus(selectedCourse.id, selectedCourse.isActive)} 
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                    selectedCourse.isActive
                    ? (darkMode 
                        ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/40 border border-yellow-800/30' 
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200')
                    : (darkMode 
                        ? 'bg-green-900/20 text-green-400 hover:bg-green-900/40 border border-green-800/30' 
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200')
                  }`}
                >
                  {selectedCourse.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  <span>{selectedCourse.isActive ? 'Deactivate Course' : 'Activate Course'}</span>
                </button>
              </div>
            </div>
          </div>
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
            Course Units Management
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {userRole === 'admin' 
              ? 'Register and manage course units across all departments' 
              : `Register and manage course units within ${userDepartment} department`}
          </p>
        </div>
        
        {/* Only show add button if not viewing a specific course */}
        {!selectedCourse && (
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
        )}
      </div>

      {/* Search and filters - updated with department selector */}
      {!selectedCourse && (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Search course units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 p-2 w-full rounded-md border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
              />
            </div>
            
            {userRole === 'admin' && (
              <div className="relative min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className={`pl-10 p-2 w-full rounded-md border appearance-none ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="all" className={darkMode ? 'bg-gray-700' : 'bg-white'}>All Departments</option>
                  {departments.map(dept => (
                    <option
                      key={dept.id}
                      value={dept.name}
                      className={darkMode ? 'bg-gray-700' : 'bg-white'}
                    >
                      {dept.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading and empty states */}
      {isLoading && (
        <div className={`p-12 flex flex-col items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-lg">Loading courses...</p>
        </div>
      )}

      {!isLoading && programs.length === 0 && (
        <div className={`p-12 flex flex-col items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className={`p-4 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} mb-4`}>
            <BookOpen className="h-10 w-10 text-indigo-500" />
          </div>
          <p className="text-lg mb-2">No programs available</p>
          <p className="text-center max-w-md">You need to register programs before you can add course units. Please register programs first.</p>
        </div>
      )}

      {!isLoading && programs.length > 0 && filteredCourses.length === 0 && (
        <div className={`p-12 flex flex-col items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className={`p-4 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} mb-4`}>
            <BookOpen className="h-10 w-10 text-indigo-500" />
          </div>
          <p className="text-lg mb-2">No courses found</p>
          <p className="text-center max-w-md">
            {searchQuery ? 'No courses match your search criteria. Try a different search term.' : 'There are no courses registered yet. Click "Register Course Unit" to add your first course.'}
          </p>
        </div>
      )}

      {/* Courses grid */}
      {!isLoading && filteredCourses.length > 0 && (
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
                    <p className="text-sm text-gray-500 mt-1">{course.departmentName}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    course.isActive
                      ? 'bg-green-900/20 text-green-500 border border-green-700/20' 
                      : 'bg-yellow-900/20 text-yellow-500 border border-yellow-700/20'
                  }`}>
                    {course.isActive ? 'Active' : 'Inactive'}
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
      )}

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
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editMode ? 'Edit Course Unit' : 'Register New Course Unit'}
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
                      Course Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={currentCourse.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      placeholder="e.g., Introduction to Programming"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Program <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={currentCourse.programId}
                      onChange={(e) => handleFormChange('programId', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                    >
                      <option value="" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Select Program</option>
                      {programs.map(program => (
                        <option key={program.id} value={program.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                          {program.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Year
                      </label>
                      <select 
                        value={currentCourse.yearOfStudy}
                        onChange={(e) => handleFormChange('yearOfStudy', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        <option value="1" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Year 1</option>
                        <option value="2" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Year 2</option>
                        <option value="3" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Year 3</option>
                        <option value="4" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Year 4</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Semester
                      </label>
                      <select 
                        value={currentCourse.semester}
                        onChange={(e) => handleFormChange('semester', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        <option value="1" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Semester 1</option>
                        <option value="2" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Semester 2</option>
                        <option value="3" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Semester 3</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Credit Units
                      </label>
                      <select 
                        value={currentCourse.creditUnits}
                        onChange={(e) => handleFormChange('creditUnits', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        <option value="1" className={darkMode ? 'bg-gray-800' : 'bg-white'}>1 Unit</option>
                        <option value="2" className={darkMode ? 'bg-gray-800' : 'bg-white'}>2 Units</option>
                        <option value="3" className={darkMode ? 'bg-gray-800' : 'bg-white'}>3 Units</option>
                        <option value="4" className={darkMode ? 'bg-gray-800' : 'bg-white'}>4 Units</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Course Code <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <input 
                        type="text" 
                        value={currentCourse.code}
                        onChange={(e) => handleFormChange('code', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                        } ${currentCourse.programId ? 'bg-gray-100 dark:bg-gray-900' : ''}`}
                        placeholder="e.g., CS 1101"
                        readOnly={!!currentCourse.programId}
                      />
                    </div>
                    {currentCourse.code && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {getCodeExplanation(currentCourse.code)}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="isActive"
                        checked={currentCourse.isActive}
                        onChange={(e) => handleFormChange('isActive', e.target.checked)}
                        className="mr-2 h-4 w-4"
                      />
                      <label htmlFor="isActive" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Course is approved
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="isCrossCutting"
                        checked={currentCourse.isCrossCutting}
                        onChange={(e) => handleFormChange('isCrossCutting', e.target.checked)}
                        className="mr-2 h-4 w-4"
                      />
                      <label htmlFor="isCrossCutting" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Cross-cutting course
                      </label>
                    </div>
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
                  onClick={handleAddCourse}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : (editMode ? 'Update Course Unit' : 'Register Course Unit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteConfirmation(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="px-6 py-4">
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-3 rounded-full ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
                    <Trash2 className={`h-6 w-6 ${darkMode ? 'text-red-500' : 'text-red-600'}`} />
                  </div>
                </div>
                
                <h3 className={`text-lg font-medium text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Confirm Delete
                </h3>
                
                <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Are you sure you want to delete this course? This action cannot be undone.
                </p>
              </div>
              
              <div className={`px-6 py-4 flex justify-center gap-4`}>
                <button 
                  onClick={() => setShowDeleteConfirmation(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleDeleteCourse}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700`}
                  disabled={deletingCourse}
                >
                  {deletingCourse ? 'Deleting...' : 'Delete Course'}
                </button>
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