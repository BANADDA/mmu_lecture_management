import {
  collection,
  deleteDoc,
  doc,
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
  Building,
  CheckCircle,
  Edit,
  Plus,
  Trash2,
  UserCog,
  XCircle
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const DepartmentsManagement = ({ darkMode, userRole = 'admin', setActiveSection, setSelectedProgramDept }) => {
  const { user } = useAuth();
  
  // State variables for department management
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('all');
  const [currentDepartment, setCurrentDepartment] = useState({
    name: '',
    code: '',
    hodId: '',
    hodName: '',
    facultyId: '',
    facultyName: '',
    isActive: true,
    createdBy: '',
    createdAt: null,
    updatedAt: null
  });
  const [editMode, setEditMode] = useState(false);
  const [editDeptId, setEditDeptId] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingDept, setDeletingDept] = useState(false);
  
  // State for departments and heads of department
  const [departments, setDepartments] = useState([]);
  const [hods, setHods] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  // Add state for department programs
  const [departmentPrograms, setDepartmentPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  
  // Firebase functions for department management
  // Function to load all departments from Firestore
  useEffect(() => {
    setIsLoading(true);
    console.log("Loading departments from Firestore...");
    const departmentsRef = collection(db, 'departments');
    const q = query(departmentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const departmentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Departments loaded:", departmentData.length, departmentData);
      setDepartments(departmentData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading departments:", error);
      toast.error("Failed to load departments");
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, []);
  
  // Function to load heads of department from users collection
  useEffect(() => {
    const loadHODs = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Only staff can be HODs
        const potentialHODs = users.filter(user => 
          user.role === 'lecturer' || user.role === 'admin'
        );
        
        setHods(potentialHODs);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    
    loadHODs();
  }, []);
  
  // Function to load faculties from Firestore
  useEffect(() => {
    const loadFaculties = async () => {
      try {
        console.log("Loading faculties...");
        const facultiesRef = collection(db, 'faculties');
        const q = query(facultiesRef, orderBy('name'));
        
        const snapshot = await getDocs(q);
        const facultiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log("Faculties loaded:", facultiesData.length, facultiesData);
        setFaculties(facultiesData);
      } catch (error) {
        console.error("Error loading faculties:", error);
        toast.error("Failed to load faculties");
      }
    };
    
    loadFaculties();
  }, []);
  
  // Function to add a new department
  const handleAddDepartment = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!currentDepartment.name || !currentDepartment.code || !currentDepartment.facultyId) {
        toast.error("Please fill in all required fields");
        setIsLoading(false);
        return;
      }
      
      // Find HOD name if ID is provided
      let hodName = '';
      if (currentDepartment.hodId) {
        const hodUser = hods.find(h => h.id === currentDepartment.hodId);
        hodName = hodUser ? hodUser.displayName || hodUser.email : '';
      }
      
      // Find faculty name if ID is provided
      let facultyName = '';
      if (currentDepartment.facultyId) {
        const faculty = faculties.find(f => f.id === currentDepartment.facultyId);
        facultyName = faculty ? faculty.name : '';
      }
      
      // Create or update department object
      const departmentData = {
        name: currentDepartment.name,
        code: currentDepartment.code.toUpperCase(),
        facultyId: currentDepartment.facultyId,
        facultyName: facultyName,
        hodId: currentDepartment.hodId || null,
        hodName: hodName || 'Position Vacant',
        isActive: currentDepartment.isActive,
        updatedAt: serverTimestamp()
      };
      
      if (editMode) {
        // Update existing department
        const deptRef = doc(db, 'departments', editDeptId);
        await updateDoc(deptRef, departmentData);
        toast.success(`Department ${currentDepartment.name} has been updated`);
      } else {
        // Add new department
        const newDeptRef = doc(collection(db, 'departments'));
        await setDoc(newDeptRef, {
          ...departmentData,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          programs: 0,
          courses: 0,
          students: 0
        });
        toast.success(`Department ${currentDepartment.name} has been added successfully`);
      }
      
      resetAndCloseModal();
    } catch (error) {
      console.error("Error adding/updating department:", error);
      toast.error("Failed to save department");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to delete a department
  const handleDeleteDepartment = async () => {
    if (!editDeptId) return;
    
    try {
      setDeletingDept(true);
      await deleteDoc(doc(db, 'departments', editDeptId));
      toast.success("Department has been deleted");
      resetAndCloseModal();
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Failed to delete department");
    } finally {
      setDeletingDept(false);
    }
  };
  
  // Function to toggle department active status
  const toggleDepartmentStatus = async (deptId, currentStatus) => {
    try {
      const deptRef = doc(db, 'departments', deptId);
      await updateDoc(deptRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Department ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error("Error toggling department status:", error);
      toast.error("Failed to update department status");
    }
  };

  // Filter departments based on the search query and selected faculty
  const filteredDepartments = departments.filter(dept =>
    (dept.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.hodName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.facultyName?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedFacultyFilter === 'all' || dept.facultyId === selectedFacultyFilter)
  );

  // Get programs that belong to a specific department
  const getDepartmentPrograms = () => {
    return departmentPrograms;
  };

  const handleFormChange = (field, value) => {
    setCurrentDepartment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditDepartment = (deptId) => {
    const deptToEdit = departments.find(dept => dept.id === deptId);
    if (deptToEdit) {
      setCurrentDepartment({
        name: deptToEdit.name || '',
        code: deptToEdit.code || '',
        hodId: deptToEdit.hodId || '',
        facultyId: deptToEdit.facultyId || '',
        isActive: deptToEdit.isActive !== undefined ? deptToEdit.isActive : true
      });
      setEditMode(true);
      setEditDeptId(deptId);
      setShowAddDeptModal(true);
    }
  };
  
  const handleViewDepartment = async (deptId) => {
    const department = departments.find(dept => dept.id === deptId);
    setSelectedDepartment(department);
    
    // Fetch programs for this department
    await fetchDepartmentPrograms(deptId);
  };
  
  // Function to fetch programs for a specific department
  const fetchDepartmentPrograms = async (departmentId) => {
    try {
      setLoadingPrograms(true);
      const programsRef = collection(db, 'programs');
      const q = query(programsRef, where("departmentId", "==", departmentId), orderBy("name"));
      
      const snapshot = await getDocs(q);
      const programsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDepartmentPrograms(programsData);
      setLoadingPrograms(false);
    } catch (error) {
      console.error("Error loading department programs:", error);
      toast.error("Failed to load department programs");
      setLoadingPrograms(false);
    }
  };
  
  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
  };

  const resetAndCloseModal = () => {
    setCurrentDepartment({
      name: '',
      code: '',
      hodId: '',
      facultyId: '',
      isActive: true
    });
    setEditMode(false);
    setEditDeptId(null);
    setShowAddDeptModal(false);
    setShowDeleteConfirmation(false);
  };

  // Function to add a program to the current department
  const handleAddProgram = () => {
    if (selectedDepartment) {
      // Set the department ID to pre-select in the Programs Management screen
      if (setSelectedProgramDept) {
        setSelectedProgramDept(selectedDepartment.id);
      }
      
      // Navigate to the Programs Management screen
      if (setActiveSection) {
        setActiveSection('programs');
      } else {
        toast.error("Navigation to Programs Management is not available");
      }
    }
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
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedDepartment.hodName}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Managing {selectedDepartment.programs || 0} programs and overseeing {selectedDepartment.courses || 0} courses
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
                <p>This department is currently {selectedDepartment.isActive ? 'active' : 'inactive'} and belongs to the {selectedDepartment.facultyName} faculty. It offers {selectedDepartment.programs || 0} academic programs with a total of {selectedDepartment.courses || 0} course units.</p>
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
                      {selectedDepartment.programs || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Courses</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedDepartment.courses || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedDepartment.isActive
                        ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                        : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                    }`}>
                      {selectedDepartment.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
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
                
                <button
                  onClick={() => toggleDepartmentStatus(selectedDepartment.id, selectedDepartment.isActive)} 
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                    selectedDepartment.isActive
                      ? (darkMode ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/40 border border-yellow-800/30' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200')
                      : (darkMode ? 'bg-green-900/20 text-green-400 hover:bg-green-900/40 border border-green-800/30' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200')
                  }`}
                >
                  {selectedDepartment.isActive ? (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>Deactivate Department</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Activate Department</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Department programs */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Department Programs
          </h2>
          
          <button 
            onClick={handleAddProgram}
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
          {loadingPrograms ? (
            <div className={`col-span-3 p-8 text-center rounded-lg border ${
              darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading programs...</p>
            </div>
          ) : getDepartmentPrograms().length === 0 ? (
            <div className={`col-span-3 p-8 text-center rounded-lg border ${
              darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <Building className={`h-10 w-10 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                No Programs Found
              </h3>
              <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This department does not have any programs registered yet
              </p>
              <button 
                onClick={handleAddProgram}
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
          ) : (
            <>
              {getDepartmentPrograms().map(program => (
                <div 
                  key={program.id} 
                  className={`rounded-lg overflow-hidden border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200 shadow-sm'
                  }`}
                >
                  <div className={`h-2 w-full ${program.isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                    : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`inline-flex px-2 py-1 rounded text-xs font-medium mb-1 ${
                          darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {program.code}
                        </div>
                        <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {program.name}
                        </h3>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        program.isActive
                          ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                          : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                      }`}>
                        {program.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <span>Duration:</span>
                          <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {program.duration} {program.duration === 1 ? 'Year' : 'Years'}
                          </p>
                        </div>
                        <div>
                          <span>Students:</span>
                          <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {program.students || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main content */}
      <div className="flex-grow">
        {selectedDepartment ? (
          <div className={`p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            {/* ... existing code ... */}
          </div>
        ) : (
          <div className={`p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
            {/* Header with actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Departments Management
                </h1>
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Register and manage departments, assign HODs, and organize programs
                </p>
              </div>
              
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
            </div>

            {/* Search input and filters */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search departments by name, code, or faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 p-2 w-full rounded-md border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                />
              </div>
              
              <select
                value={selectedFacultyFilter}
                onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                className={`px-4 py-2 rounded-md border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
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

            {/* Loading state */}
            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="loader animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className={`text-center py-12 rounded-lg border ${
                darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <Building size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {searchQuery || selectedFacultyFilter !== 'all' ? 'No matching departments found' : 'No departments registered yet'}
                </h3>
                <p className={`text-base mb-6 max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {searchQuery || selectedFacultyFilter !== 'all'
                    ? "Try adjusting your search criteria to find what you're looking for."
                    : "Get started by creating your first department. Departments organize programs and courses within faculties."}
                </p>
                {!searchQuery && selectedFacultyFilter === 'all' && (
                  <button 
                    onClick={() => setShowAddDeptModal(true)}
                    className={`inline-flex items-center px-5 py-3 rounded-lg text-base ${
                      darkMode 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Plus className="h-5 w-5 mr-2" /> 
                    <span>Register First Department</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredDepartments.map((department, index) => {
                  // Generate a consistent but unique color for each department
                  const colorSchemes = [
                    { bg: 'bg-blue-100', accent: 'text-blue-600', dark: 'bg-blue-900/20', darkAccent: 'text-blue-400' },
                    { bg: 'bg-purple-100', accent: 'text-purple-600', dark: 'bg-purple-900/20', darkAccent: 'text-purple-400' },
                    { bg: 'bg-green-100', accent: 'text-green-600', dark: 'bg-green-900/20', darkAccent: 'text-green-400' },
                    { bg: 'bg-amber-100', accent: 'text-amber-600', dark: 'bg-amber-900/20', darkAccent: 'text-amber-400' },
                    { bg: 'bg-rose-100', accent: 'text-rose-600', dark: 'bg-rose-900/20', darkAccent: 'text-rose-400' },
                    { bg: 'bg-indigo-100', accent: 'text-indigo-600', dark: 'bg-indigo-900/20', darkAccent: 'text-indigo-400' },
                  ];
                  const colorIndex = index % colorSchemes.length;
                  const colorScheme = colorSchemes[colorIndex];
                  
                  return (
                    <div 
                      key={department.id} 
                      className={`rounded-lg overflow-hidden border transition-all hover:shadow-md ${
                        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white shadow-sm'
                      }`}
                    >
                      <div className={`p-2 ${darkMode ? colorScheme.dark : colorScheme.bg} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                          <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                            darkMode ? 'bg-gray-800/50' : 'bg-white/80'
                          }`}>
                            {department.code}
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            department.isActive
                              ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                              : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                          }`}>
                            {department.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {department.name}
                        </h3>
                        
                        <div className="space-y-3 my-3">
                          <div className="flex items-start">
                            <Building className={`h-4 w-4 mr-2 mt-0.5 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} />
                            <div>
                              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Faculty</p>
                              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {department.facultyName || 'Not Assigned'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <UserCog className={`h-4 w-4 mr-2 mt-0.5 ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`} />
                            <div>
                              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Head of Department</p>
                              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {department.hodName || 'Position Vacant'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`grid grid-cols-2 gap-2 p-2 rounded-md mt-4 ${
                          darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
                        }`}>
                          <div className="text-center">
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Programs</p>
                            <p className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                              {department.programs || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Courses</p>
                            <p className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                              {department.courses || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`flex border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <button
                          onClick={() => handleEditDepartment(department.id)}
                          className={`flex-1 py-2 text-sm font-medium border-r ${
                            darkMode 
                              ? 'border-gray-700 hover:bg-gray-700 text-gray-300' 
                              : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <Edit className="h-4 w-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleViewDepartment(department.id)}
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
          </div>
        )}
      </div>

      {/* Add/Edit Department Modal */}
      {showAddDeptModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${showAddDeptModal ? 'visible' : 'hidden'}`}>
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => resetAndCloseModal()}></div>
          <div className={`relative rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {!showDeleteConfirmation ? (
              <div className="p-6">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editMode ? 'Edit Department' : 'Add New Department'}
                </h3>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Department Name
                    </label>
                    <input
                      type="text"
                      value={currentDepartment.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Department Code
                    </label>
                    <input
                      type="text"
                      value={currentDepartment.code}
                      onChange={(e) => handleFormChange('code', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="e.g. CS"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Faculty
                    </label>
                    <select
                      value={currentDepartment.facultyId}
                      onChange={(e) => handleFormChange('facultyId', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select Faculty</option>
                      {faculties.map((faculty) => (
                        <option key={faculty.id} value={faculty.id}>
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Head of Department
                    </label>
                    <select
                      value={currentDepartment.hodId || ''}
                      onChange={(e) => handleFormChange('hodId', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select Head of Department</option>
                      {hods.map((hod) => (
                        <option key={hod.id} value={hod.id}>
                          {hod.displayName || hod.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={currentDepartment.isActive}
                      onChange={(e) => handleFormChange('isActive', e.target.checked)}
                      className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
                      }`}
                    />
                    <label htmlFor="isActive" className={`ml-2 block text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Department is active
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between space-x-3">
                  {editMode && userRole === 'admin' && (
                    <button
                      onClick={() => setShowDeleteConfirmation(true)}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        darkMode
                          ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex space-x-3 ml-auto">
                    <button
                      onClick={() => resetAndCloseModal()}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddDepartment}
                      disabled={isLoading}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        darkMode
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isLoading ? 'Saving...' : editMode ? 'Update Department' : 'Add Department'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Delete Department
                </h3>
                <div className="text-center">
                  <Trash2 className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-red-500' : 'text-red-600'}`} />
                  <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Are you sure you want to delete this department? This action cannot be undone.
                  </p>
                  <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => setShowDeleteConfirmation(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={deletingDept}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDeleteDepartment}
                      className={`px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 flex items-center ${
                        deletingDept ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                      disabled={deletingDept}
                    >
                      {deletingDept ? (
                        <span className="animate-pulse">Deleting...</span>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Department
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

DepartmentsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string,
  setActiveSection: PropTypes.func,
  setSelectedProgramDept: PropTypes.func
};

export default DepartmentsManagement; 