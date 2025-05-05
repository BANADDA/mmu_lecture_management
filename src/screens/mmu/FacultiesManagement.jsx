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
  BookMarked,
  Building,
  CheckCircle,
  Edit,
  Plus,
  Trash2,
  XCircle
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const FacultiesManagement = ({ darkMode, userRole = 'admin' }) => {
  const { user } = useAuth();
  
  // State variables for faculty management
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFaculty, setCurrentFaculty] = useState({
    name: '',
    code: '',
    deanId: '',
    deanName: '',
    isActive: true,
    createdBy: '',
    createdAt: null,
    updatedAt: null
  });
  const [editMode, setEditMode] = useState(false);
  const [editFacultyId, setEditFacultyId] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingFaculty, setDeletingFaculty] = useState(false);
  
  // State for faculties and deans
  const [faculties, setFaculties] = useState([]);
  const [deans, setDeans] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // State for selected faculty departments
  const [facultyDepartments, setFacultyDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  
  // Use a ref to keep track of the current faculties data without triggering re-renders
  const facultiesRef = useRef([]);
  
  // Update the ref whenever faculties change
  useEffect(() => {
    facultiesRef.current = faculties;
  }, [faculties]);
  
  // Firebase functions for faculty management
  // Function to load all faculties from Firestore and set up real-time listeners
  useEffect(() => {
    setIsLoading(true);
    console.log("Setting up faculty and count listeners");
    
    // Collection references
    const facultiesCol = collection(db, 'faculties');
    const departmentsCol = collection(db, 'departments');
    const programsCol = collection(db, 'programs');
    
    // First, directly fetch faculties to verify data access
    const fetchInitialData = async () => {
      try {
        const facultiesQuery = query(facultiesCol, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(facultiesQuery);
        
        if (snapshot.empty) {
          console.log("No faculties found in direct fetch");
          setIsLoading(false);
          return;
        }
        
        console.log(`Direct fetch found ${snapshot.docs.length} faculties`);
        
        // Log first document for debugging
        if (snapshot.docs.length > 0) {
          console.log("First faculty:", snapshot.docs[0].id, snapshot.docs[0].data());
        }
        
        // Set initial data
        const facultyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setFaculties(facultyData);
      } catch (error) {
        console.error("Error in direct faculty fetch:", error);
      }
    };
    
    // Execute initial fetch
    fetchInitialData();
    
    // Keep snapshots at the top level so they're accessible by all listeners
    let departmentsSnapshot = [];
    let programsSnapshot = [];
    
    // Main query for faculties - define this after initial fetch
    const facultiesQuery = query(facultiesCol, orderBy('createdAt', 'desc'));
    
    // Function to update counts with the current snapshot data
    const updateCounts = (facultiesToUpdate) => {
      const updatedFaculties = [...facultiesToUpdate];
      
      if (!updatedFaculties.length) return updatedFaculties;
      
      // Create lookup map for faculties
      const facultyMap = {};
      updatedFaculties.forEach(faculty => {
        facultyMap[faculty.id] = faculty;
        // Reset counts
        faculty.departments = 0;
        faculty.programs = 0;
      });
      
      // Count departments for each faculty
      departmentsSnapshot.forEach(doc => {
        const dept = doc.data();
        const facultyId = dept.facultyId;
        if (facultyId && facultyMap[facultyId]) {
          facultyMap[facultyId].departments += 1;
        }
      });
      
      // Count programs for each faculty via department
      programsSnapshot.forEach(doc => {
        const program = doc.data();
        const departmentId = program.departmentId;
        if (departmentId) {
          const deptDoc = departmentsSnapshot.find(d => d.id === departmentId);
          if (deptDoc) {
            const dept = deptDoc.data();
            const facultyId = dept.facultyId;
            if (facultyId && facultyMap[facultyId]) {
              facultyMap[facultyId].programs += 1;
            }
          }
        }
      });
      
      console.log("Calculated counts:", updatedFaculties.map(f => 
        `${f.name}: ${f.departments} depts, ${f.programs} progs`).join(', '));
      
      return updatedFaculties;
    };
    
    // Set up department listener first
    const unsubscribeDepartments = onSnapshot(query(departmentsCol), (snapshot) => {
      console.log("Departments snapshot updated:", snapshot.docs.length);
      departmentsSnapshot = snapshot.docs;
      
      // Trigger count update if faculties already loaded
      if (facultiesRef.current.length > 0) {
        setFaculties(updateCounts(facultiesRef.current));
      }
    });
    
    // Set up programs listener
    const unsubscribePrograms = onSnapshot(query(programsCol), (snapshot) => {
      console.log("Programs snapshot updated:", snapshot.docs.length);
      programsSnapshot = snapshot.docs;
      
      // Trigger count update if faculties and departments already loaded
      if (facultiesRef.current.length > 0 && departmentsSnapshot.length > 0) {
        setFaculties(updateCounts(facultiesRef.current));
      }
    });
    
    // Set up faculty listener
    const unsubscribeFaculties = onSnapshot(facultiesQuery, (snapshot) => {
      console.log("Faculties snapshot updated:", snapshot.docs.length);
      
      let facultyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate counts using the latest snapshots before setting state
      if (departmentsSnapshot.length > 0) { 
        facultyData = updateCounts(facultyData);
      }
      
      setFaculties(facultyData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading faculties:", error);
      toast.error("Failed to load faculties");
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => {
      unsubscribeFaculties();
      unsubscribeDepartments();
      unsubscribePrograms();
    };
  }, []);
  
  // Function to load deans from users collection
  useEffect(() => {
    const loadDeans = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Only staff can be deans
        const potentialDeans = users.filter(user => 
          user.role === 'lecturer' || user.role === 'admin'
        );
        
        setDeans(potentialDeans);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    
    loadDeans();
  }, []);
  
  // Function to add a new faculty
  const handleAddFaculty = async () => {
    try {
      setIsLoading(true);
      toast.dismiss(); // Dismiss any existing toasts
      
      // Validate required fields
      if (!currentFaculty.name || !currentFaculty.code) {
        toast.error("Please fill in all required fields", {
          duration: 3000,
          id: 'status-toast',
          position: 'bottom-right'
        });
        setIsLoading(false);
        return;
      }
      
      // Find dean name if ID is provided
      let deanName = '';
      if (currentFaculty.deanId) {
        const deanUser = deans.find(d => d.id === currentFaculty.deanId);
        deanName = deanUser ? deanUser.displayName || deanUser.email : '';
      }
      
      // Create or update faculty object
      const facultyData = {
        name: currentFaculty.name,
        code: currentFaculty.code.toUpperCase(),
        deanId: currentFaculty.deanId || null,
        deanName: deanName || 'Position Vacant',
        isActive: currentFaculty.isActive,
        updatedAt: serverTimestamp()
      };
      
      if (editMode) {
        // Update existing faculty
        const facultyRef = doc(db, 'faculties', editFacultyId);
        await updateDoc(facultyRef, facultyData);
        toast.success(`Faculty ${currentFaculty.name} has been updated`, {
          duration: 3000,
          id: 'status-toast',
          position: 'bottom-right'
        });
      } else {
        // Add new faculty
        const newFacultyRef = doc(collection(db, 'faculties'));
        await setDoc(newFacultyRef, {
          ...facultyData,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          departments: 0,
          programs: 0
        });
        toast.success(`Faculty ${currentFaculty.name} has been added successfully`, {
          duration: 3000,
          id: 'status-toast',
          position: 'bottom-right'
        });
      }
      
      resetAndCloseModal();
    } catch (error) {
      console.error("Error adding/updating faculty:", error);
      toast.error("Failed to save faculty", {
        duration: 3000,
        id: 'status-toast',
        position: 'bottom-right'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to delete a faculty
  const handleDeleteFaculty = async () => {
    if (!editFacultyId) return;
    
    try {
      setDeletingFaculty(true);
      toast.dismiss(); // Dismiss any existing toasts
      await deleteDoc(doc(db, 'faculties', editFacultyId));
      toast.success("Faculty has been deleted", {
        duration: 3000,
        id: 'status-toast',
        position: 'bottom-right'
      });
      resetAndCloseModal();
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting faculty:", error);
      toast.error("Failed to delete faculty", {
        duration: 3000,
        id: 'status-toast',
        position: 'bottom-right'
      });
    } finally {
      setDeletingFaculty(false);
    }
  };
  
  // Function to toggle faculty active status
  const toggleFacultyStatus = async (facultyId, currentStatus) => {
    try {
      toast.dismiss(); // Dismiss any existing toasts
      const facultyRef = doc(db, 'faculties', facultyId);
      await updateDoc(facultyRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Faculty ${currentStatus ? 'deactivated' : 'activated'} successfully`, {
        duration: 3000, // 3 seconds
        id: 'status-toast', // Use a consistent ID across all toasts
        position: 'bottom-right' // Force a single position
      });
    } catch (error) {
      console.error("Error toggling faculty status:", error);
      toast.error("Failed to update faculty status", {
        duration: 3000,
        id: 'status-toast',
        position: 'bottom-right'
      });
    }
  };

  // Filter faculties based on the search query
  const filteredFaculties = faculties.filter(faculty =>
    (faculty.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faculty.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faculty.deanName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Debug output to help diagnose the issue
  useEffect(() => {
    console.log("Faculties state updated:", faculties.length, "faculties available");
    console.log("Filtered faculties:", filteredFaculties.length);
    
    if (faculties.length > 0) {
      console.log("First faculty:", faculties[0]);
    }
  }, [faculties, filteredFaculties.length]);

  const handleFormChange = (field, value) => {
    setCurrentFaculty(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditFaculty = (facultyId) => {
    const facultyToEdit = faculties.find(faculty => faculty.id === facultyId);
    if (facultyToEdit) {
      setCurrentFaculty({
        name: facultyToEdit.name || '',
        code: facultyToEdit.code || '',
        deanId: facultyToEdit.deanId || '',
        isActive: facultyToEdit.isActive !== undefined ? facultyToEdit.isActive : true
      });
      setEditMode(true);
      setEditFacultyId(facultyId);
      setShowAddFacultyModal(true);
    }
  };
  
  const handleViewFaculty = (facultyId) => {
    const faculty = faculties.find(faculty => faculty.id === facultyId);
    setSelectedFaculty(faculty);
  };
  
  const handleBackToFaculties = () => {
    setSelectedFaculty(null);
  };

  const resetAndCloseModal = () => {
    setCurrentFaculty({
      name: '',
      code: '',
      deanId: '',
      isActive: true
    });
    setEditMode(false);
    setEditFacultyId(null);
    setShowAddFacultyModal(false);
    setShowDeleteConfirmation(false);
  };

  // Function to fetch departments for a selected faculty
  useEffect(() => {
    if (!selectedFaculty) {
      setFacultyDepartments([]);
      return;
    }
    
    setLoadingDepartments(true);
    console.log("Fetching departments for faculty:", selectedFaculty.name);
    
    const departmentsCol = collection(db, 'departments');
    const q = query(departmentsCol, where("facultyId", "==", selectedFaculty.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const departmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Found ${departmentsData.length} departments for ${selectedFaculty.name}`);
      setFacultyDepartments(departmentsData);
      setLoadingDepartments(false);
    }, (error) => {
      console.error("Error fetching faculty departments:", error);
      toast.error("Failed to load departments");
      setLoadingDepartments(false);
    });
    
    return () => unsubscribe();
  }, [selectedFaculty]);

  // Function to manually refresh data
  const refreshData = async () => {
    setIsLoading(true);
    try {
      console.log("Manually refreshing faculty data...");
      const facultiesCol = collection(db, 'faculties');
      const facultiesQuery = query(facultiesCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(facultiesQuery);
      
      const facultyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Manual refresh found ${facultyData.length} faculties`);
      setFaculties(facultyData);
    } catch (error) {
      console.error("Error refreshing faculty data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render faculty details view or faculty management screen
  if (selectedFaculty) {
    return (
      <div className={`p-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        <button
          onClick={handleBackToFaculties}
          className={`mb-4 inline-flex items-center px-3 py-1 rounded-md ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Faculties
        </button>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:flex-1">
            <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedFaculty.name}</h2>
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Faculty Code: {selectedFaculty.code}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditFaculty(selectedFaculty.id)}
                    className={`p-2 rounded-md ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Edit size={18} />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className={`font-medium text-lg mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Faculty Information</h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className={`px-4 py-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <dt className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dean</dt>
                    <dd className="mt-1 font-medium">
                      {selectedFaculty.deanName || 'Position Vacant'}
                    </dd>
                  </div>
                  <div className={`px-4 py-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <dt className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</dt>
                    <dd className="mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedFaculty.isActive
                          ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                          : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                      }`}>
                        {selectedFaculty.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                  <div className={`px-4 py-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <dt className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created</dt>
                    <dd className="mt-1">
                      {selectedFaculty.createdAt ? new Date(selectedFaculty.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                  <div className={`px-4 py-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <dt className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last Updated</dt>
                    <dd className="mt-1">
                      {selectedFaculty.updatedAt ? new Date(selectedFaculty.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            
            <div className={`mt-8 rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`font-medium text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Departments</h3>
                
                {userRole === 'admin' && (
                  <button
                    onClick={() => window.location.href = '/departments'}
                    className={`px-2 py-1 rounded text-sm ${
                      darkMode ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <Plus size={16} className="inline mr-1" />
                    Add Department
                  </button>
                )}
              </div>
              
              {loadingDepartments ? (
                <div className={`p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-md`}>
                  <p className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Loading departments...
                  </p>
                </div>
              ) : facultyDepartments.length === 0 ? (
                <div className={`p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-md`}>
                  <p className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No departments found for this faculty
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {facultyDepartments.map(dept => (
                    <div key={dept.id} className={`p-4 rounded-md ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} hover:shadow-sm transition-all`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{dept.name}</h4>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Code: {dept.code} | HOD: {dept.hodName || 'Position Vacant'}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dept.isActive
                            ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                            : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                        }`}>
                          {dept.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="md:w-64 flex flex-col">
            <div className={`p-4 rounded-lg mb-4 ${
              darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
            }`}>
              <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Faculty Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Departments</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {facultyDepartments.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Programs</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedFaculty.programs || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedFaculty.isActive
                      ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                      : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                  }`}>
                    {selectedFaculty.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
      {/* Debugging panel - always show for now */}
      <div className={`mb-4 p-2 text-xs rounded border ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold">Data Status:</span> 
            <span className={`ml-1 ${isLoading ? 'text-yellow-500' : 'text-green-500'}`}>
              {isLoading ? 'Loading...' : `${faculties.length} faculties loaded`}
            </span>
          </div>
          <button 
            onClick={refreshData} 
            className={`px-2 py-1 rounded ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Refresh Data
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Faculties Management</h1>
        {userRole === 'admin' && (
          <button
            onClick={() => setShowAddFacultyModal(true)}
            className={`px-4 py-2 rounded-md font-medium flex items-center ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus size={18} className="mr-1" />
            Add Faculty
          </button>
        )}
      </div>
      
      <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search faculties by name, code or dean..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 p-2 w-full rounded-md border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
            }`}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="loader"></div>
        </div>
      ) : faculties.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <Building size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">No faculties found.</p>
          <p className="text-sm">
            {searchQuery ? 'Try a different search term.' : 'Start by adding a new faculty.'}
          </p>
        </div>
      ) : filteredFaculties.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <Building size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">No faculties match your search.</p>
          <p className="text-sm">Try a different search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFaculties.map(faculty => (
            <div 
              key={faculty.id} 
              className={`rounded-lg overflow-hidden border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                    <BookMarked size={20} className="text-blue-600" />
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditFaculty(faculty.id)}
                      className={`p-1 rounded-md ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => toggleFacultyStatus(faculty.id, faculty.isActive)}
                      className={`p-1 rounded-md ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      {faculty.isActive ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <XCircle size={16} className="text-yellow-500" />
                      )}
                    </button>
                  </div>
                </div>
                <h3 
                  className={`mt-3 text-lg font-semibold cursor-pointer hover:underline ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}
                  onClick={() => handleViewFaculty(faculty.id)}
                >
                  {faculty.name}
                </h3>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Code: {faculty.code}
                </div>
                <div className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Dean: {faculty.deanName || 'Position Vacant'}
                </div>
              </div>
              <div className={`p-4 ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Departments</div>
                    <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {faculty.departments || 0}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Programs</div>
                    <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {faculty.programs || 0}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</div>
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        faculty.isActive 
                          ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                          : (darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                      }`}>
                        {faculty.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add/Edit Faculty Modal */}
      {showAddFacultyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div 
            className={`w-full max-w-md p-6 rounded-lg ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {editMode ? 'Edit Faculty' : 'Add New Faculty'}
            </h2>
            
            {showDeleteConfirmation ? (
              <div>
                <p className={`mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Are you sure you want to delete this faculty? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirmation(false)}
                    className={`px-4 py-2 rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteFaculty}
                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                    disabled={deletingFaculty}
                  >
                    {deletingFaculty ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label 
                    className={`block mb-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Faculty Name*
                  </label>
                  <input
                    type="text"
                    value={currentFaculty.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className={`w-full p-2 rounded-md border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'border-gray-300 text-gray-800'
                    }`}
                    placeholder="e.g. Faculty of Computing & Technology"
                  />
                </div>
                
                <div className="mb-4">
                  <label 
                    className={`block mb-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Faculty Code*
                  </label>
                  <input
                    type="text"
                    value={currentFaculty.code}
                    onChange={(e) => handleFormChange('code', e.target.value)}
                    className={`w-full p-2 rounded-md border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'border-gray-300 text-gray-800'
                    }`}
                    placeholder="e.g. FCT"
                  />
                  <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Short code for the faculty (2-5 characters recommended)
                  </p>
                </div>
                
                <div className="mb-4">
                  <label 
                    className={`block mb-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Dean
                  </label>
                  <select
                    value={currentFaculty.deanId}
                    onChange={(e) => handleFormChange('deanId', e.target.value)}
                    className={`w-full p-2 rounded-md border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'border-gray-300 text-gray-800'
                    }`}
                  >
                    <option value="">Select Dean (Optional)</option>
                    {deans.map(dean => (
                      <option key={dean.id} value={dean.id}>
                        {dean.displayName || dean.email}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentFaculty.isActive}
                      onChange={(e) => handleFormChange('isActive', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Faculty is Active
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-between">
                  <div>
                    {editMode && (
                      <button
                        onClick={() => setShowDeleteConfirmation(true)}
                        className="px-4 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={resetAndCloseModal}
                      className={`px-4 py-2 rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      }`}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFaculty}
                      className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : (editMode ? 'Update' : 'Save')}
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

FacultiesManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string
};

export default FacultiesManagement; 