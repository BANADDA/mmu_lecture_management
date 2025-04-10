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
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const CoursesManagement = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const { user } = useAuth();
  
  // State variables for course management
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
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

  // First, add a new state for editable course codes
  const [editingCourseCode, setEditingCourseCode] = useState(null);
  const [editedCode, setEditedCode] = useState('');

  // Add new state variables for cross-cutting modal
  const [selectedCrossCuttingPrograms, setSelectedCrossCuttingPrograms] = useState([]);

  // Update state for multi-select dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load faculties
  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const facultiesSnapshot = await getDocs(collection(db, 'faculties'));
        const facultiesData = facultiesSnapshot.docs
          .filter(doc => doc.data().isActive)
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        setFaculties(facultiesData);
      } catch (error) {
        console.error("Error loading faculties:", error);
        toast.error("Failed to load faculties");
      }
    };
    
    fetchFaculties();
  }, []);

  // Load departments, filtered by selected faculty if applicable
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const departmentsRef = collection(db, 'departments');
        let q;
        
        if (selectedFaculty !== 'all') {
          q = query(departmentsRef, where("facultyId", "==", selectedFaculty), where("isActive", "==", true));
        } else {
          q = query(departmentsRef, where("isActive", "==", true));
        }
        
        const departmentsSnapshot = await getDocs(q);
        const departmentsData = departmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDepartments(departmentsData);
        
        // Reset department selection if current selection is no longer valid
        if (selectedFaculty !== 'all' && selectedDepartment !== 'all') {
          const deptExists = departmentsData.some(dept => dept.id === selectedDepartment);
          if (!deptExists) {
            setSelectedDepartment('all');
          }
        }
      } catch (error) {
        console.error("Error loading departments:", error);
        toast.error("Failed to load departments");
      }
    };
    
    fetchDepartments();
  }, [selectedFaculty]);

  // Function to load all programs from Firestore, filtered by department if applicable
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
        } else if (selectedDepartment !== 'all') {
          // Filter by selected department
          q = query(programsRef, where("departmentId", "==", selectedDepartment), where("isActive", "==", true), orderBy("name"));
        } else {
          // For admin, show all active programs or filter by faculty
          if (selectedFaculty !== 'all') {
            // We need to get departments in this faculty first
            const deptIds = departments
              .filter(dept => dept.facultyId === selectedFaculty)
              .map(dept => dept.id);
            
            if (deptIds.length > 0) {
              q = query(programsRef, where("departmentId", "in", deptIds), where("isActive", "==", true), orderBy("name"));
            } else {
              // No departments in faculty
              setPrograms([]);
              setIsLoading(false);
              return;
            }
          } else {
            // All programs
            q = query(programsRef, where("isActive", "==", true), orderBy("name"));
          }
        }
        
        const snapshot = await getDocs(q);
        const programData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPrograms(programData);
        
        // Reset program selection if current selection is no longer valid
        if (selectedProgram !== 'all') {
          const programExists = programData.some(prog => prog.id === selectedProgram);
          if (!programExists) {
            setSelectedProgram('all');
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading programs:", error);
        toast.error("Failed to load programs");
        setIsLoading(false);
      }
    };
    
    loadPrograms();
  }, [userRole, userDepartment, selectedDepartment, selectedFaculty, departments]);
  
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
    } else if (userRole === 'admin' && selectedFaculty !== 'all') {
      // For admin with selected faculty
      // Get department IDs in this faculty
      const deptIds = departments
        .filter(dept => dept.facultyId === selectedFaculty)
        .map(dept => dept.id);
      
      if (deptIds.length > 0) {
        q = query(
          coursesRef, 
          where("departmentId", "in", deptIds),
          orderBy("createdAt", "desc")
        );
      } else {
        // No departments in faculty
        setCourses([]);
        setIsLoading(false);
        return;
      }
    } else if (userRole === 'admin' && selectedDepartment !== 'all') {
      // For admin with selected department
      q = query(
        coursesRef,
        where("departmentId", "==", selectedDepartment),
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
  }, [programs, userRole, selectedDepartment, selectedFaculty, departments]);
  
  // Filter courses based on search query, selected faculty, department, program, and user role
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
    
    // Program filter
    if (selectedProgram !== 'all') {
      return matchesSearch && (course.programId === selectedProgram);
    }
    
    // Department filter
    if (selectedDepartment !== 'all') {
      return matchesSearch && (course.departmentId === selectedDepartment || course.isCrossCutting);
    }
    
    // Faculty filter for cross-cutting courses (since we already filter by department in the query)
    if (selectedFaculty !== 'all') {
      // Only need to check for cross-cutting courses here as department filtering is done at DB level
      return matchesSearch && course.isCrossCutting;
    }
    
    return matchesSearch;
  });

  const handleFormChange = (field, value) => {
    if (field === 'isCrossCutting' && value === true) {
      // When checking the cross-cutting checkbox, open the modal
      setShowAddCourseModal(true);
    }
    
    if (field === 'programId') {
      // When program changes, update the course code prefix and department
      const selectedProgram = programs.find(p => p.id === value);
      
      if (selectedProgram) {
        const codePrefix = selectedProgram.code.split('.')[0];
        
        setCurrentCourse(prev => {
          // Only update the code if it hasn't been manually edited
          const newCode = prev.codeManuallyEdited 
            ? prev.code 
            : `${codePrefix} ${prev.yearOfStudy}${prev.semester}${prev.courseNumber || '01'}`;
          
          return {
            ...prev,
            [field]: value,
            programName: selectedProgram.name,
            departmentId: selectedProgram.departmentId,
            departmentName: selectedProgram.departmentName,
            code: newCode
          };
        });
      } else {
        setCurrentCourse(prev => ({
          ...prev,
          [field]: value,
          programName: '',
          departmentId: '',
          departmentName: ''
        }));
      }
    } else if (field === 'yearOfStudy' || field === 'semester' || field === 'courseNumber') {
      // When year, semester or course number changes, suggest updating the course code
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
          const suggestedCode = `${codePrefix} ${updatedValues.yearOfStudy}${updatedValues.semester}${courseNum}`;
          
          // Check if user has manually edited the code before
          if (!currentCourse.codeManuallyEdited) {
            setCurrentCourse({
              ...updatedValues,
              code: suggestedCode
            });
          } else {
            // Just update the field but don't change the code
            setCurrentCourse(updatedValues);
          }
        } else {
          setCurrentCourse(updatedValues);
        }
      } else {
        setCurrentCourse(updatedValues);
      }
    } else if (field === 'code') {
      // Mark code as manually edited
      setCurrentCourse(prev => ({
        ...prev,
        [field]: value,
        codeManuallyEdited: true
      }));
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
        crossCuttingPrograms: currentCourse.isCrossCutting ? selectedCrossCuttingPrograms : [],
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
      
      // Load cross-cutting programs for editing
      if (courseToEdit.crossCuttingPrograms && courseToEdit.crossCuttingPrograms.length) {
        setSelectedCrossCuttingPrograms(courseToEdit.crossCuttingPrograms);
      } else {
        setSelectedCrossCuttingPrograms([]);
      }
      
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
    setSelectedCrossCuttingPrograms([]);
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

  // Add a function to update course code
  const handleUpdateCourseCode = async (courseId, newCode) => {
    try {
      setIsLoading(true);
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        code: newCode.toUpperCase(),
        updatedAt: serverTimestamp()
      });
      toast.success("Course code updated successfully");
      setEditingCourseCode(null);
    } catch (error) {
      console.error("Error updating course code:", error);
      toast.error("Failed to update course code");
    } finally {
      setIsLoading(false);
    }
  };

  // Add a download report function
  const downloadCourseReport = (filters = {}) => {
    // In a real implementation, this would generate a report
    // For now we'll just simulate it
    toast.success("Downloading course report...");
    const queryParams = new URLSearchParams(filters).toString();
    window.open(`/api/reports/courses?${queryParams}`, '_blank');
  };

  // Update the addCrossCuttingProgram function to toggle program selection
  const toggleCrossCuttingProgram = (programId) => {
    // Check if the program is already selected
    const existingIndex = selectedCrossCuttingPrograms.findIndex(p => p.programId === programId);
    
    if (existingIndex >= 0) {
      // Program exists, remove it
      setSelectedCrossCuttingPrograms(
        selectedCrossCuttingPrograms.filter(p => p.programId !== programId)
      );
    } else {
      // Program doesn't exist, add it with default year 1
      const program = programs.find(p => p.id === programId);
      if (program) {
        setSelectedCrossCuttingPrograms([
          ...selectedCrossCuttingPrograms,
          { programId, yearOffered: 1 }
        ]);
      }
    }
  };

  // Update handler for year change
  const updateCrossCuttingYear = (programId, year) => {
    setSelectedCrossCuttingPrograms(
      selectedCrossCuttingPrograms.map(p => 
        p.programId === programId 
          ? { ...p, yearOffered: parseInt(year) } 
          : p
      )
    );
  };

  // Add click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add missing removeCrossCuttingProgram function
  const removeCrossCuttingProgram = (programId) => {
    setSelectedCrossCuttingPrograms(
      selectedCrossCuttingPrograms.filter(p => p.programId !== programId)
    );
  };

  // Add useEffect for scrollbar styles
  useEffect(() => {
    const scrollbarStyles = document.createElement('style');
    scrollbarStyles.innerHTML = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      .scrollbar-light::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      .scrollbar-light::-webkit-scrollbar-thumb {
        background: #aaa;
        border-radius: 5px;
      }
      .scrollbar-dark::-webkit-scrollbar-track {
        background: #333;
      }
      .scrollbar-dark::-webkit-scrollbar-thumb {
        background: #666;
        border-radius: 5px;
      }
    `;
    document.head.appendChild(scrollbarStyles);
    
    return () => {
      document.head.removeChild(scrollbarStyles);
    };
  }, []);

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

      {/* Search and filters - updated with comprehensive filtering */}
      {!selectedCourse && (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
          <div className="flex flex-col gap-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Search course units by name, code, or lecturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 p-2 w-full rounded-md border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                }`}
              />
            </div>
            
            {/* Filter dropdowns */}
            {userRole === 'admin' && (
              <div className="flex flex-col md:flex-row gap-3">
                {/* Faculty filter */}
                <div className="relative flex-1">
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Faculty
                  </label>
                  <div className="relative">
                    <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={selectedFaculty}
                      onChange={(e) => {
                        setSelectedFaculty(e.target.value);
                        setSelectedDepartment('all'); // Reset department when faculty changes
                        setSelectedProgram('all'); // Reset program when faculty changes
                      }}
                      className={`pl-8 p-2 w-full rounded-md border appearance-none ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-800'
                      }`}
                    >
                      <option value="all" className={darkMode ? 'bg-gray-700' : 'bg-white'}>All Faculties</option>
                      {faculties.map(faculty => (
                        <option
                          key={faculty.id}
                          value={faculty.id}
                          className={darkMode ? 'bg-gray-700' : 'bg-white'}
                        >
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Department filter */}
                <div className="relative flex-1">
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Department
                  </label>
                  <div className="relative">
                    <Building className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setSelectedProgram('all'); // Reset program when department changes
                      }}
                      className={`pl-8 p-2 w-full rounded-md border appearance-none ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      disabled={departments.length === 0}
                    >
                      <option value="all" className={darkMode ? 'bg-gray-700' : 'bg-white'}>All Departments</option>
                      {departments.map(dept => (
                        <option
                          key={dept.id}
                          value={dept.id}
                          className={darkMode ? 'bg-gray-700' : 'bg-white'}
                        >
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Program filter */}
                <div className="relative flex-1">
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Program
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={selectedProgram}
                      onChange={(e) => setSelectedProgram(e.target.value)}
                      className={`pl-8 p-2 w-full rounded-md border appearance-none ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      disabled={programs.length === 0}
                    >
                      <option value="all" className={darkMode ? 'bg-gray-700' : 'bg-white'}>All Programs</option>
                      {programs.map(program => (
                        <option
                          key={program.id}
                          value={program.id}
                          className={darkMode ? 'bg-gray-700' : 'bg-white'}
                        >
                          {program.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Clear filters button */}
                {(selectedFaculty !== 'all' || selectedDepartment !== 'all' || selectedProgram !== 'all' || searchQuery) && (
                  <div className="self-end md:self-center mt-auto flex-shrink-0">
                    <button
                      onClick={() => {
                        setSelectedFaculty('all');
                        setSelectedDepartment('all');
                        setSelectedProgram('all');
                        setSearchQuery('');
                      }}
                      className={`px-3 py-2 rounded-md flex items-center text-xs ${
                        darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Active filters display */}
            {(selectedFaculty !== 'all' || selectedDepartment !== 'all' || selectedProgram !== 'all') && (
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedFaculty !== 'all' && (
                  <div className={`text-xs px-2 py-1 rounded-full flex items-center ${
                    darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <span>Faculty: {faculties.find(f => f.id === selectedFaculty)?.name}</span>
                    <button 
                      onClick={() => setSelectedFaculty('all')}
                      className="ml-1 p-0.5 rounded-full hover:bg-blue-800/20"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                )}
                
                {selectedDepartment !== 'all' && (
                  <div className={`text-xs px-2 py-1 rounded-full flex items-center ${
                    darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    <span>Department: {departments.find(d => d.id === selectedDepartment)?.name}</span>
                    <button 
                      onClick={() => setSelectedDepartment('all')}
                      className="ml-1 p-0.5 rounded-full hover:bg-indigo-800/20"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                )}
                
                {selectedProgram !== 'all' && (
                  <div className={`text-xs px-2 py-1 rounded-full flex items-center ${
                    darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <span>Program: {programs.find(p => p.id === selectedProgram)?.name}</span>
                    <button 
                      onClick={() => setSelectedProgram('all')}
                      className="ml-1 p-0.5 rounded-full hover:bg-purple-800/20"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                )}
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
        <>
          {/* Report and Actions Bar */}
          <div className="flex flex-wrap justify-between items-center mb-4 px-4">
            <div className="text-sm flex gap-2 items-center my-2">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                <span className="font-semibold">{filteredCourses.length}</span> course {filteredCourses.length === 1 ? 'unit' : 'units'} found
              </span>
              
              <button
                onClick={() => downloadCourseReport({ department: selectedDepartment })}
                className={`flex items-center text-xs px-3 py-1.5 rounded-full ${
                  darkMode 
                    ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 border border-blue-800/30' 
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Report
              </button>
            </div>
          </div>
          
          {/* Fixed height cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6 px-4">
            {filteredCourses.map(course => {
              // Get color based on year
              const yearColors = [
                { bg: 'bg-blue-100', accent: 'text-blue-600', dark: 'bg-blue-900/20', darkAccent: 'text-blue-400' },
                { bg: 'bg-purple-100', accent: 'text-purple-600', dark: 'bg-purple-900/20', darkAccent: 'text-purple-400' },
                { bg: 'bg-emerald-100', accent: 'text-emerald-600', dark: 'bg-emerald-900/20', darkAccent: 'text-emerald-400' },
                { bg: 'bg-amber-100', accent: 'text-amber-600', dark: 'bg-amber-900/20', darkAccent: 'text-amber-400' },
                { bg: 'bg-rose-100', accent: 'text-rose-600', dark: 'bg-rose-900/20', darkAccent: 'text-rose-400' },
              ];
              const colorIndex = (course.yearOfStudy - 1) % yearColors.length;
              const colorScheme = yearColors[colorIndex];
              
              return (
                <div 
                  key={course.id} 
                  className={`rounded-lg overflow-hidden flex flex-col h-52 ${
                    darkMode 
                      ? 'bg-gray-800 border border-gray-700' 
                      : 'bg-white border border-gray-200'
                  } transition-all shadow-sm hover:shadow-md`}
                >
                  {/* Header - More compact */}
                  <div className={`p-2 ${darkMode ? colorScheme.dark : colorScheme.bg}`}>
                    <div className="flex justify-between items-center">
                      <div className={`font-medium text-sm ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                        {editingCourseCode === course.id ? (
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdateCourseCode(course.id, editedCode);
                          }}>
                            <input 
                              type="text" 
                              value={editedCode}
                              onChange={(e) => setEditedCode(e.target.value)}
                              className={`w-full px-2 py-1 rounded text-center ${
                                darkMode 
                                  ? 'bg-gray-700/50 border-gray-600 text-white' 
                                  : 'bg-white/80 border-gray-200 text-gray-800'
                              } border`}
                              autoFocus
                              onBlur={() => {
                                if (editedCode !== course.code) {
                                  handleUpdateCourseCode(course.id, editedCode);
                                } else {
                                  setEditingCourseCode(null);
                                }
                              }}
                            />
                          </form>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingCourseCode(course.id);
                              setEditedCode(course.code);
                            }}
                            className="cursor-pointer text-center px-2 hover:bg-opacity-50 rounded"
                            title="Click to edit course code"
                          >
                            {course.code}
                          </div>
                        )}
                      </div>
                      
                      <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        darkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {course.creditUnits} {course.creditUnits === 1 ? 'unit' : 'units'}
                      </div>
                    </div>
                    
                    <h4 className={`font-bold text-sm leading-tight truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {course.name}
                    </h4>
                  </div>
                  
                  {/* Body - More compact */}
                  <div className="p-2 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between text-xs">
                      <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 mr-1 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Year {course.yearOfStudy}</span>
                      </div>
                      <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 mr-1 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Sem {course.semester}</span>
                      </div>
                    </div>
                    
                    <div className="mt-1 text-xs">
                      <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {course.lecturer !== 'Not Assigned' ? (
                          <>
                            <Users className={`h-3 w-3 mr-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                            <span className="truncate">{course.lecturer}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Not Assigned</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Cross-cutting programs section with scrollable area - improved */}
                    {course.crossCuttingPrograms && course.crossCuttingPrograms.length > 0 && (
                      <div className="mt-1 flex-1 min-h-0 flex flex-col">
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Cross-Cutting Programs
                        </div>
                        <div className={`mt-0.5 flex-1 overflow-y-auto custom-scrollbar ${
                          darkMode ? 'scrollbar-dark' : 'scrollbar-light'
                        }`}>
                          {course.crossCuttingPrograms.map(cp => {
                            const program = programs.find(p => p.id === cp.programId);
                            if (!program) return null;
                            
                            return (
                              <div 
                                key={cp.programId} 
                                className={`flex items-center justify-between py-0.5 px-1 mb-0.5 rounded text-xs ${
                                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center truncate pr-1">
                                  <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>•</span>
                                  <span className={`ml-1 truncate ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                                    {program.name}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <span className={`px-1 text-xs rounded ${
                                    darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'
                                  }`}>
                                    Y{cp.yearOffered}
                                  </span>
                                  <button
                                    onClick={() => {
                                      // Add program ID to state that tracks programs to remove
                                      const updatedCourse = {
                                        ...course,
                                        crossCuttingPrograms: course.crossCuttingPrograms.filter(
                                          p => p.programId !== cp.programId
                                        )
                                      };
                                      // Update course with removed program
                                      const courseRef = doc(db, 'courses', course.id);
                                      updateDoc(courseRef, {
                                        crossCuttingPrograms: updatedCourse.crossCuttingPrograms,
                                        updatedAt: serverTimestamp()
                                      }).then(() => {
                                        toast.success("Program removed from cross-cutting list");
                                      }).catch(error => {
                                        console.error("Error removing program:", error);
                                        toast.error("Failed to remove program");
                                      });
                                    }}
                                    className="ml-1 p-0.5 rounded-full hover:bg-gray-600 text-gray-400 hover:text-red-400"
                                    title="Remove program"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Card footer with actions */}
                  <div className={`flex border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button
                      onClick={() => handleEditCourse(course.id)}
                      className={`flex-1 py-1.5 text-xs font-medium border-r ${
                        darkMode 
                          ? 'border-gray-700 hover:bg-gray-700 text-gray-300' 
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <Edit className="h-3 w-3 mx-auto" />
                    </button>
                    
                    <button
                      onClick={() => handleViewCourse(course.id)}
                      className={`flex-1 py-1.5 text-xs font-medium border-r ${
                        darkMode 
                          ? 'border-gray-700 hover:bg-gray-700 text-gray-300' 
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <MoreHorizontal className="h-3 w-3 mx-auto" />
                    </button>
                    
                    {(userRole === 'admin' || userRole === 'hod') && (
                      <button
                        onClick={() => {
                          setEditCourseId(course.id);
                          setShowDeleteConfirmation(true);
                        }}
                        className={`flex-1 py-1.5 text-xs font-medium ${
                          darkMode 
                            ? 'hover:bg-red-900/20 text-red-400' 
                            : 'hover:bg-red-50 text-red-600'
                        }`}
                      >
                        <Trash2 className="h-3 w-3 mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
                    <div className="flex flex-col">
                      <input 
                        type="text" 
                        value={currentCourse.code}
                        onChange={(e) => handleFormChange('code', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        placeholder="e.g., CS 1101"
                      />
                      {currentCourse.programId && (
                        <div className="flex items-center mt-2">
                          <button 
                            onClick={() => {
                              // Reset to suggested code
                              const selectedProgram = programs.find(p => p.id === currentCourse.programId);
                              if (selectedProgram) {
                                const codePrefix = selectedProgram.code.split('.')[0];
                                const suggestedCode = `${codePrefix} ${currentCourse.yearOfStudy}${currentCourse.semester}${currentCourse.courseNumber || '01'}`;
                                setCurrentCourse(prev => ({
                                  ...prev,
                                  code: suggestedCode,
                                  codeManuallyEdited: false
                                }));
                              }
                            }}
                            type="button"
                            className={`text-xs px-2 py-1 rounded ${
                              darkMode 
                                ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40' 
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            Reset to suggested code
                          </button>
                          <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            You can manually edit the code or use the suggested format
                          </span>
                        </div>
                      )}
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
                  
                  {/* Inline cross-cutting program selection */}
                  {currentCourse.isCrossCutting && (
                    <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                      <div className="flex items-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <h4 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          Cross-Cutting Programs
                        </h4>
                      </div>
                      
                      <p className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Select programs where this course unit will be cross-cutting
                      </p>
                      
                      {/* Program selection dropdown */}
                      <div className="relative mb-3" ref={dropdownRef}>
                        <button
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          type="button"
                          className={`w-full p-2 rounded-md border text-left flex justify-between items-center ${
                            darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        >
                          <span>
                            {selectedCrossCuttingPrograms.length > 0 
                              ? `${selectedCrossCuttingPrograms.length} program${selectedCrossCuttingPrograms.length !== 1 ? 's' : ''} selected` 
                              : 'Select Program'}
                          </span>
                          <svg className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Dropdown panel with checkboxes - fixed height with scrolling */}
                        {isDropdownOpen && (
                          <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${
                            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                          }`}>
                            <div className="py-1 max-h-40 overflow-y-auto custom-scrollbar">
                              {programs
                                .filter(p => p.id !== currentCourse.programId)
                                .map(program => {
                                  const isSelected = selectedCrossCuttingPrograms.some(p => p.programId === program.id);
                                  return (
                                    <div 
                                      key={program.id}
                                      className={`px-3 py-2 cursor-pointer ${
                                        isSelected 
                                          ? (darkMode ? 'bg-blue-900/40' : 'bg-blue-100') 
                                          : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                                      }`}
                                      onClick={() => toggleCrossCuttingProgram(program.id)}
                                    >
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {}}
                                          className="h-4 w-4 mr-2"
                                        />
                                        <span className={darkMode ? 'text-white' : 'text-gray-800'}>
                                          {program.name}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Selected programs list with improved scrolling */}
                      {selectedCrossCuttingPrograms.length > 0 ? (
                        <div className={`max-h-40 overflow-y-auto custom-scrollbar ${
                          darkMode ? 'scrollbar-dark' : 'scrollbar-light'
                        }`}>
                          <div className="space-y-1.5">
                            {selectedCrossCuttingPrograms.map(cp => {
                              const program = programs.find(p => p.id === cp.programId);
                              if (!program) return null;
                              
                              return (
                                <div 
                                  key={cp.programId} 
                                  className={`flex items-center justify-between p-2 rounded-md ${
                                    darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center flex-1 min-w-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 mr-2 flex-shrink-0 ${
                                      darkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className={`truncate text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                      {program.name}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center ml-2">
                                    <select 
                                      value={cp.yearOffered}
                                      onChange={(e) => updateCrossCuttingYear(cp.programId, e.target.value)}
                                      className={`text-xs p-1 rounded border ${
                                        darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                                      }`}
                                    >
                                      <option value="1">Year 1</option>
                                      <option value="2">Year 2</option>
                                      <option value="3">Year 3</option>
                                      <option value="4">Year 4</option>
                                    </select>
                                    
                                    <button 
                                      type="button"
                                      onClick={() => removeCrossCuttingProgram(cp.programId)}
                                      className={`ml-2 p-1 rounded-full ${
                                        darkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' : 'hover:bg-gray-300 text-gray-600 hover:text-red-600'
                                      }`}
                                      title="Remove program"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className={`p-3 text-center rounded ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          <span className="text-sm">No programs selected</span>
                        </div>
                      )}
                    </div>
                  )}
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