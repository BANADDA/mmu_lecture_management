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
    BookOpen,
    Edit,
    Plus,
    Search,
    Trash2,
    User
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const AllocationsManagement = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const { user } = useAuth();
  
  // State variables
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentAllocation, setCurrentAllocation] = useState({
    courseId: '',
    lecturerId: '',
    courseName: '',
    courseCode: '',
    courseYearSemester: '',
    departmentId: '',
    departmentName: '',
    programId: '',
    programName: '',
    lecturerName: '',
    lecturerDepartment: '',
    notes: '',
    allocatedBy: '',
    allocatedOn: null
  });
  const [editMode, setEditMode] = useState(false);
  const [editAllocationId, setEditAllocationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingAllocation, setIsDeletingAllocation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Data states
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allocations, setAllocations] = useState([]);

  // Load lecturers from Firestore
  useEffect(() => {
    const loadLecturers = async () => {
      try {
        setIsLoading(true);
        const usersRef = collection(db, 'users');
        let q;
        
        // If user is HoD, only show lecturers from their department
        if (userRole === 'hod') {
          q = query(
            usersRef, 
            where("role", "==", "lecturer"), 
            where("department", "==", userDepartment),
            where("isActive", "==", true),
            orderBy("name")
          );
        } else {
          // For admin, show all active lecturers
          q = query(
            usersRef, 
            where("role", "==", "lecturer"), 
            where("isActive", "==", true),
            orderBy("name")
          );
        }
        
        const snapshot = await getDocs(q);
        const lecturerData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          courseLoad: 0 // Will be updated after loading allocations
        }));
        setLecturers(lecturerData);
      } catch (error) {
        console.error("Error loading lecturers:", error);
        toast.error("Failed to load lecturers");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLecturers();
  }, [userRole, userDepartment]);
  
  // Load courses from Firestore
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setIsLoading(true);
        const coursesRef = collection(db, 'courses');
        let q;
        
        // If user is HoD, only show courses from their department or cross-cutting courses
        if (userRole === 'hod') {
          const departmentsRef = collection(db, 'departments');
          const deptQuery = query(departmentsRef, where("name", "==", userDepartment), where("isActive", "==", true));
          const deptSnapshot = await getDocs(deptQuery);
          
          if (!deptSnapshot.empty) {
            const departmentId = deptSnapshot.docs[0].id;
            
            q = query(
              coursesRef, 
              where("departmentId", "==", departmentId),
              where("isActive", "==", true),
              orderBy("name")
            );
          } else {
            // If department not found, don't query courses
            setIsLoading(false);
            return;
          }
        } else {
          // For admin, show all active courses
          q = query(coursesRef, where("isActive", "==", true), orderBy("name"));
        }
        
        const snapshot = await getDocs(q);
        const courseData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          yearSemester: `Year ${doc.data().yearOfStudy}, Semester ${doc.data().semester}`
        }));
        setCourses(courseData);
      } catch (error) {
        console.error("Error loading courses:", error);
        toast.error("Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCourses();
  }, [userRole, userDepartment]);
  
  // Load allocations from Firestore with real-time updates
  useEffect(() => {
    if (lecturers.length === 0 || courses.length === 0) return;
    
    setIsLoading(true);
    const allocationsRef = collection(db, 'allocations');
    let q;
    
    // If user is HoD, only show allocations for courses from their department
    if (userRole === 'hod') {
      const departmentCourseIds = courses.map(course => course.id);
      
      if (departmentCourseIds.length > 0) {
        q = query(
          allocationsRef, 
          where("courseId", "in", departmentCourseIds),
          orderBy("allocatedOn", "desc")
        );
      } else {
        // If no courses in department, don't query allocations
        setIsLoading(false);
        return;
      }
    } else {
      // For admin, show all allocations
      q = query(allocationsRef, orderBy("allocatedOn", "desc"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allocationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllocations(allocationData);
      
      // Update lecturer course loads
      const lecturerLoads = {};
      allocationData.forEach(allocation => {
        if (allocation.lecturerId) {
          lecturerLoads[allocation.lecturerId] = (lecturerLoads[allocation.lecturerId] || 0) + 1;
        }
      });
      
      setLecturers(prev => prev.map(lecturer => ({
        ...lecturer,
        courseLoad: lecturerLoads[lecturer.id] || 0
      })));
      
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading allocations:", error);
      toast.error("Failed to load allocations");
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, [courses, lecturers, userRole]);

  // Helper function to get unallocated courses
  const getUnallocatedCourses = () => {
    // Get all courses that are not in allocations
    const allocatedCourseIds = allocations.map(a => a.courseId);
    return courses.filter(course => !allocatedCourseIds.includes(course.id));
  };

  // Filter allocations based on the search query and user role
  const filteredAllocations = allocations.filter(allocation => {
    // Text search filter
    const matchesSearch = 
      allocation.courseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      allocation.courseCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      allocation.lecturerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      allocation.programName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Role-based filter
    if (userRole === 'hod') {
      return matchesSearch && (allocation.departmentName === userDepartment || allocation.isCrossCutting);
    }
    
    return matchesSearch;
  });

  const handleFormChange = (field, value) => {
    // If changing course, update all course-related fields
    if (field === 'courseId' && value) {
      const selectedCourse = courses.find(c => c.id === value);
      if (selectedCourse) {
        setCurrentAllocation(prev => ({
          ...prev,
          courseId: value,
          courseName: selectedCourse.name,
          courseCode: selectedCourse.code,
          courseYearSemester: selectedCourse.yearSemester,
          departmentId: selectedCourse.departmentId,
          departmentName: selectedCourse.departmentName,
          programId: selectedCourse.programId,
          programName: selectedCourse.programName
        }));
        return;
      }
    }
    
    // If changing lecturer, update all lecturer-related fields
    if (field === 'lecturerId' && value) {
      const selectedLecturer = lecturers.find(l => l.id === value);
      if (selectedLecturer) {
        setCurrentAllocation(prev => ({
          ...prev,
          lecturerId: value,
          lecturerName: selectedLecturer.name,
          lecturerDepartment: selectedLecturer.department
        }));
        return;
      }
    }
    
    // Normal field update
    setCurrentAllocation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAllocate = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!currentAllocation.courseId || !currentAllocation.lecturerId) {
        toast.error('Please select both a course and a lecturer');
        setIsLoading(false);
        return;
      }
      
      // For HoD role, ensure the course and lecturer belong to their department
      if (userRole === 'hod') {
        // Get the selected course
        const selectedCourse = courses.find(c => c.id === currentAllocation.courseId);
        
        // Get the selected lecturer
        const selectedLecturer = lecturers.find(l => l.id === currentAllocation.lecturerId);
        
        // Check if course belongs to the HoD's department or is cross-cutting
        if (selectedCourse && !selectedCourse.isCrossCutting && selectedCourse.departmentName !== userDepartment) {
          toast.error(`As a Head of Department, you can only allocate courses from your department (${userDepartment}) or cross-cutting courses.`);
          setIsLoading(false);
          return;
        }
        
        // Check if lecturer belongs to the HoD's department
        if (selectedLecturer && selectedLecturer.department !== userDepartment) {
          toast.error(`As a Head of Department, you can only allocate to lecturers from your department (${userDepartment}).`);
          setIsLoading(false);
          return;
        }
      }
      
      // Create allocation data
      const allocationData = {
        courseId: currentAllocation.courseId,
        lecturerId: currentAllocation.lecturerId,
        courseName: currentAllocation.courseName,
        courseCode: currentAllocation.courseCode,
        courseYearSemester: currentAllocation.courseYearSemester,
        departmentId: currentAllocation.departmentId,
        departmentName: currentAllocation.departmentName,
        programId: currentAllocation.programId,
        programName: currentAllocation.programName,
        lecturerName: currentAllocation.lecturerName,
        lecturerDepartment: currentAllocation.lecturerDepartment,
        notes: currentAllocation.notes,
        updatedAt: serverTimestamp()
      };
      
      if (editMode) {
        // Update existing allocation
        const allocationRef = doc(db, 'allocations', editAllocationId);
        await updateDoc(allocationRef, allocationData);
        toast.success(`Course allocation has been updated`);
      } else {
        // Add new allocation
        const newAllocationRef = doc(collection(db, 'allocations'));
        await setDoc(newAllocationRef, {
          ...allocationData,
          allocatedBy: user.uid,
          allocatedOn: serverTimestamp()
        });
        
        // Update the course to set lecturer
        try {
          const courseRef = doc(db, 'courses', currentAllocation.courseId);
          await updateDoc(courseRef, {
            lecturer: currentAllocation.lecturerName,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error("Error updating course lecturer:", error);
        }
        
        toast.success(`Course has been allocated successfully`);
      }
      
      resetAndCloseModal();
    } catch (error) {
      console.error("Error allocating course:", error);
      toast.error("Failed to allocate course");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteAllocation = async () => {
    if (!editAllocationId) return;
    
    try {
      setIsDeletingAllocation(true);
      
      // Get allocation details to update course after deletion
      const allocationRef = doc(db, 'allocations', editAllocationId);
      const allocationDoc = await getDoc(allocationRef);
      
      if (allocationDoc.exists()) {
        const allocationData = allocationDoc.data();
        
        // Delete the allocation
        await deleteDoc(allocationRef);
        
        // Update course to remove lecturer
        if (allocationData.courseId) {
          try {
            const courseRef = doc(db, 'courses', allocationData.courseId);
            await updateDoc(courseRef, {
              lecturer: 'Not Assigned',
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            console.error("Error updating course lecturer:", error);
          }
        }
        
        toast.success("Course allocation has been removed");
      }
      
      setShowDeleteConfirmation(false);
      resetAndCloseModal();
    } catch (error) {
      console.error("Error deleting allocation:", error);
      toast.error("Failed to remove allocation");
    } finally {
      setIsDeletingAllocation(false);
    }
  };

  const handleEditAllocation = (allocationId) => {
    const allocationToEdit = allocations.find(a => a.id === allocationId);
    if (allocationToEdit) {
      setCurrentAllocation({
        courseId: allocationToEdit.courseId,
        lecturerId: allocationToEdit.lecturerId,
        courseName: allocationToEdit.courseName,
        courseCode: allocationToEdit.courseCode,
        courseYearSemester: allocationToEdit.courseYearSemester,
        departmentId: allocationToEdit.departmentId,
        departmentName: allocationToEdit.departmentName,
        programId: allocationToEdit.programId,
        programName: allocationToEdit.programName,
        lecturerName: allocationToEdit.lecturerName,
        lecturerDepartment: allocationToEdit.lecturerDepartment,
        notes: allocationToEdit.notes,
        allocatedBy: allocationToEdit.allocatedBy,
        allocatedOn: allocationToEdit.allocatedOn
      });
      setEditMode(true);
      setEditAllocationId(allocationId);
      setShowAllocateModal(true);
    }
  };
  
  const showDeleteAllocationConfirm = (allocationId) => {
    const allocationToDelete = allocations.find(a => a.id === allocationId);
    if (allocationToDelete) {
      setEditAllocationId(allocationId);
      setCurrentAllocation({
        courseName: allocationToDelete.courseName,
        courseCode: allocationToDelete.courseCode,
        lecturerName: allocationToDelete.lecturerName
      });
      setShowDeleteConfirmation(true);
    }
  };

  const resetAndCloseModal = () => {
    setCurrentAllocation({
      courseId: '',
      lecturerId: '',
      courseName: '',
      courseCode: '',
      courseYearSemester: '',
      departmentId: '',
      departmentName: '',
      programId: '',
      programName: '',
      lecturerName: '',
      lecturerDepartment: '',
      notes: '',
      allocatedBy: '',
      allocatedOn: null
    });
    setEditMode(false);
    setEditAllocationId(null);
    setShowAllocateModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Course Allocations</h1>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Manage course allocations for lecturers
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search allocations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 pr-4 py-2 rounded-lg w-full sm:w-64 focus:ring-2 
                ${darkMode 
                  ? 'bg-gray-800 border-gray-700 focus:ring-blue-600 text-white' 
                  : 'bg-white border-gray-300 focus:ring-blue-500 text-gray-900'}`}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          </div>
          
          <button
            onClick={() => { setEditMode(false); setShowAllocateModal(true); }}
            className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${userRole !== 'admin' && userRole !== 'hod' ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={userRole !== 'admin' && userRole !== 'hod'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Allocate Course
          </button>
        </div>
      </div>
      
      {isLoading && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading courses and allocations...</p>
        </div>
      )}
      
      {!isLoading && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-lg dark:bg-gray-800">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Courses Available</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-3">
            {userRole === 'admin' 
              ? "There are no courses in the system to allocate." 
              : `There are no courses in your department (${userDepartment}) to allocate.`}
          </p>
        </div>
      )}
      
      {!isLoading && courses.length > 0 && (
        <>
          {/* Unallocated Courses Section */}
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Unallocated Courses
            </h2>
            
            {getUnallocatedCourses().length === 0 ? (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <p>All courses have been allocated to lecturers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`min-w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  <thead className={`text-xs uppercase ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">Course</th>
                      <th scope="col" className="px-4 py-3 text-left">Program</th>
                      <th scope="col" className="px-4 py-3 text-left">Year / Semester</th>
                      <th scope="col" className="px-4 py-3 text-left">Department</th>
                      <th scope="col" className="px-4 py-3 text-center">Credit Units</th>
                      <th scope="col" className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {getUnallocatedCourses().length > 0 ? (
                      getUnallocatedCourses().map(course => (
                        <tr key={course.id} className={`${
                          darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                        }`}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <div className="ml-3">
                                <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{course.name}</div>
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{course.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{course.programName}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{course.yearSemester}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{course.departmentName}</td>
                          <td className="px-4 py-3 text-sm text-center">{course.creditUnits}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <button
                              onClick={() => {
                                setEditMode(false);
                                handleFormChange('courseId', course.id);
                                setShowAllocateModal(true);
                              }}
                              className={`px-3 py-1 rounded-md ${
                                darkMode ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              }`}
                            >
                              Allocate
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-center text-sm">
                          No unallocated courses found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Current Allocations Section */}
          <div>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Current Allocations
            </h2>
            
            {filteredAllocations.length === 0 ? (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <p>No allocations found. Use the "Allocate Course" button to assign courses to lecturers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`min-w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  <thead className={`text-xs uppercase ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">Course</th>
                      <th scope="col" className="px-4 py-3 text-left">Lecturer</th>
                      <th scope="col" className="px-4 py-3 text-left">Allocated On</th>
                      <th scope="col" className="px-4 py-3 text-left">Notes</th>
                      <th scope="col" className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredAllocations.map(allocation => (
                      <tr key={allocation.id} className={`${
                        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                      }`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="ml-3">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{allocation.courseName}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{allocation.courseCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
                              <User className="h-4 w-4" />
                            </div>
                            <div className="ml-3">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{allocation.lecturerName}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{allocation.lecturerDepartment}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {allocation.allocatedOn ? new Date(allocation.allocatedOn.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="max-w-xs truncate">{allocation.notes || 'No notes provided'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex justify-center space-x-1">
                            <button 
                              onClick={() => handleEditAllocation(allocation.id)}
                              className={`p-1.5 rounded-lg ${
                                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                              }`}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => showDeleteAllocationConfirm(allocation.id)}
                              className={`p-1.5 rounded-lg ${
                                darkMode ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-100 text-red-600'
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Allocate Course Modal */}
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
                    {editMode ? 'Edit Course Allocation' : 'Allocate New Course'}
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
                  {/* Course Selection */}
                  <div>
                    <label htmlFor="course" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="course"
                      value={currentAllocation.courseId}
                      onChange={(e) => handleFormChange('courseId', e.target.value)}
                      className={`mt-1 block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    >
                      <option value="">Select Course</option>
                      {getUnallocatedCourses().map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.name} ({course.yearSemester})
                        </option>
                      ))}
                      {editMode && allocations
                        .filter(a => a.id === editAllocationId)
                        .map(a => (
                          <option key={a.courseId} value={a.courseId}>
                            {a.courseCode} - {a.courseName} ({a.courseYearSemester})
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {/* Lecturer Selection */}
                  <div>
                    <label htmlFor="lecturer" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Lecturer <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="lecturer"
                      value={currentAllocation.lecturerId}
                      onChange={(e) => handleFormChange('lecturerId', e.target.value)}
                      className={`mt-1 block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    >
                      <option value="">Select Lecturer</option>
                      {lecturers.map(lecturer => (
                        <option key={lecturer.id} value={lecturer.id}>
                          {lecturer.name} ({lecturer.courseLoad} courses currently)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      value={currentAllocation.notes || ''}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      rows={3}
                      className={`mt-1 block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Add any special notes about this allocation (optional)"
                    ></textarea>
                  </div>
                  
                  {/* Allocation Guidelines */}
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <h4 className="font-semibold mb-1">Allocation Guidelines:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Ensure lecturers are qualified for the courses they are allocated.</li>
                      <li>Consider lecturer workload when making allocations.</li>
                      <li>HoDs can only allocate to lecturers within their department.</li>
                    </ul>
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
                  onClick={handleAllocate}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                    isLoading 
                      ? 'bg-blue-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {editMode ? 'Update Allocation' : 'Allocate Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete allocation confirmation modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteConfirmation(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Confirm Deletion
                  </h3>
                  <button 
                    onClick={() => setShowDeleteConfirmation(false)}
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
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    Are you sure you want to delete this allocation? This action cannot be undone.
                  </p>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Course</label>
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {currentAllocation.courseName} ({currentAllocation.courseCode})
                    </span>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Lecturer</label>
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {currentAllocation.lecturerName}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={() => setShowDeleteConfirmation(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAllocation}
                  disabled={isDeletingAllocation}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                    isDeletingAllocation 
                      ? 'bg-red-500 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                >
                  {isDeletingAllocation && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Delete
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