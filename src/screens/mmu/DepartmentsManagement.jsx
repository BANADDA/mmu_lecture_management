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
    updateDoc
} from 'firebase/firestore';
import {
    Building,
    CheckCircle,
    Edit,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    UserCog,
    Users,
    XCircle
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const DepartmentsManagement = ({ darkMode, userRole = 'admin' }) => {
  const { user } = useAuth();
  
  // State variables for department management
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDepartment, setCurrentDepartment] = useState({
    name: '',
    code: '',
    hodId: '',
    hodName: '',
    faculty: 'Computing and Engineering',
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Firebase functions for department management
  // Function to load all departments from Firestore
  useEffect(() => {
    setIsLoading(true);
    const departmentsRef = collection(db, 'departments');
    const q = query(departmentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const departmentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
  
  // Function to add a new department
  const handleAddDepartment = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!currentDepartment.name || !currentDepartment.code || !currentDepartment.faculty) {
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
      
      // Create or update department object
      const departmentData = {
        name: currentDepartment.name,
        code: currentDepartment.code.toUpperCase(),
        faculty: currentDepartment.faculty,
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

  // Filter departments based on the search query
  const filteredDepartments = departments.filter(dept =>
    dept.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.hodName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.faculty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get programs that belong to a specific department
  const getDepartmentPrograms = (deptId) => {
    // This will be updated when we implement program management
    return [];
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
        faculty: deptToEdit.faculty || 'Computing and Engineering',
        isActive: deptToEdit.isActive !== undefined ? deptToEdit.isActive : true
      });
      setEditMode(true);
      setEditDeptId(deptId);
      setShowAddDeptModal(true);
    }
  };
  
  const handleViewDepartment = (deptId) => {
    const department = departments.find(dept => dept.id === deptId);
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
      faculty: 'Computing and Engineering',
      isActive: true
    });
    setEditMode(false);
    setEditDeptId(null);
    setShowAddDeptModal(false);
    setShowDeleteConfirmation(false);
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
                <p>This department is currently {selectedDepartment.isActive ? 'active' : 'inactive'} and belongs to the {selectedDepartment.faculty} faculty. It offers {selectedDepartment.programs || 0} academic programs with a total of {selectedDepartment.courses || 0} course units.</p>
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
        
        {/* Programs grid - will be updated when we implement program management */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {getDepartmentPrograms(selectedDepartment.id).length === 0 && (
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

      {/* Loading State */}
      {isLoading && departments.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {/* No departments message */}
      {!isLoading && departments.length === 0 && (
        <div className={`p-8 text-center rounded-lg border ${
          darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        } my-8`}>
          <Building className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            No Departments Found
          </h3>
          <p className={`text-base mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            There are no departments registered in the system yet
          </p>
          {userRole === 'admin' && (
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
      )}

      {/* Departments grid */}
      {!isLoading && filteredDepartments.length > 0 && (
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
                    dept.isActive
                      ? 'bg-green-900/20 text-green-500 border border-green-700/20' 
                      : 'bg-yellow-900/20 text-yellow-500 border border-yellow-700/20'
                  }`}>
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <div className="text-3xl font-bold text-blue-500 mb-5">
                  {dept.programs || 0} <span className="text-sm opacity-70">Programs</span>
                </div>

                <div className={`p-3 mb-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center mb-2">
                    <UserCog className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500">HoD:</span>
                  </div>
                  <div className={`text-sm font-medium ${
                    dept.hodName !== 'Position Vacant' 
                      ? (darkMode ? 'text-white' : 'text-gray-800') 
                      : 'text-yellow-500'
                  }`}>
                    {dept.hodName || 'Position Vacant'}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-500">
                      Students: <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{dept.students || 0}</span>
                    </span>
                  </div>

                  <div className="flex space-x-1">
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleEditDepartment(dept.id)}
                        className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleViewDepartment(dept.id)}
                      className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
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
              {!showDeleteConfirmation ? (
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Department Name *
                      </label>
                      <input 
                        type="text" 
                        value={currentDepartment.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        placeholder="e.g., Computer Science"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Department Code *
                      </label>
                      <input 
                        type="text" 
                        value={currentDepartment.code}
                        onChange={(e) => handleFormChange('code', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        placeholder="e.g., CS"
                        required
                      />
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        A short unique code for the department (2-5 characters)
                      </p>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Faculty *
                      </label>
                      <select
                        value={currentDepartment.faculty}
                        onChange={(e) => handleFormChange('faculty', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        required
                      >
                        <option value="Computing and Engineering" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Computing and Engineering</option>
                        <option value="Business and Management" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Business and Management</option>
                        <option value="Science and Technology" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Science and Technology</option>
                        <option value="Arts and Social Sciences" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Arts and Social Sciences</option>
                        <option value="Education" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Education</option>
                        <option value="Health Sciences" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Health Sciences</option>
                      </select>
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
                        className="mr-2 h-4 w-4"
                      />
                      <label htmlFor="isActive" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Department is active
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-8">
                  <div className="text-center">
                    <Trash2 className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-red-500' : 'text-red-600'}`} />
                    <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Delete Department?
                    </h3>
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
                          <>
                            <span className="animate-pulse mr-2">Deleting...</span>
                          </>
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
              
              {/* Modal footer */}
              {!showDeleteConfirmation && (
                <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between gap-2`}>
                  <div>
                    {editMode && userRole === 'admin' && (
                      <button 
                        onClick={() => setShowDeleteConfirmation(true)}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          darkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={resetAndCloseModal}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    
                    <button 
                      onClick={handleAddDepartment}
                      className={`px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center ${
                        isLoading ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="animate-pulse">Saving...</span>
                      ) : (
                        editMode ? 'Update Department' : 'Register Department'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DepartmentsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string
};

export default DepartmentsManagement; 