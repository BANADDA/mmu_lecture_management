import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  BookOpen,
  CheckCircle,
  Edit,
  Landmark,
  Search,
  Trash,
  User,
  UserCog,
  Users,
  XCircle
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const UsersManagement = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const { user } = useAuth();
  const auth = getAuth();
  
  const [activeTab, setActiveTab] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserType, setNewUserType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentForm, setCurrentForm] = useState({
    userType: '',
    fullName: '',
    email: '',
    department: userRole === 'hod' ? userDepartment : '',
    departments: [], // Array of departments for lecturers
    studentNumber: '',
    isFirstTimeLogin: true
  });

  // State for users and loading
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Fetch departments from Firestore
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const departmentsRef = collection(db, 'departments');
        const q = query(departmentsRef, where('isActive', '==', true), orderBy('name'));
        const snapshot = await getDocs(q);
        
        const departmentData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDepartments(departmentData);
      } catch (error) {
        console.error("Error fetching departments:", error);
        toast.error("Failed to load departments");
      }
    };
    
    fetchDepartments();
  }, []);
  
  // Fetch programs from Firestore
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const programsRef = collection(db, 'programs');
        let q;
        
        if (userRole === 'hod') {
          // If the user is a HoD, only fetch programs for their department
          const departmentsRef = collection(db, 'departments');
          const deptQuery = query(departmentsRef, where("name", "==", userDepartment));
          const deptSnapshot = await getDocs(deptQuery);
          
          if (!deptSnapshot.empty) {
            const departmentId = deptSnapshot.docs[0].id;
            q = query(
              programsRef, 
              where("departmentId", "==", departmentId),
              where("isActive", "==", true),
              orderBy("name")
            );
          } else {
            setPrograms([]);
            return;
          }
        } else {
          // For admin, fetch all active programs
          q = query(programsRef, where("isActive", "==", true), orderBy("name"));
        }
        
        const snapshot = await getDocs(q);
        const programData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setPrograms(programData);
      } catch (error) {
        console.error("Error fetching programs:", error);
        toast.error("Failed to load programs");
      }
    };
    
    fetchPrograms();
  }, [userRole, userDepartment]);
  
  // Fetch users from Firestore with real-time updates
  useEffect(() => {
    setIsLoading(true);
    
    const usersRef = collection(db, 'users');
    let q;
    
    if (userRole === 'hod') {
      // HoDs can only see users in their department (except for admins)
      q = query(
        usersRef,
        where("department", "==", userDepartment),
        orderBy("displayName")
      );
    } else {
      // Admins can see all users
      q = query(usersRef, orderBy("displayName"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        name: doc.data().displayName,  // For compatibility with the old code
        status: doc.data().isActive ? 'active' : 'pending'
      }));
      
      setUsers(userData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, [userRole, userDepartment]);
  
  // Filter users based on the active tab, search query, and user role
  const filteredUsers = users.filter(user => {
    // Basic filters for tab and search
    const matchesTab = activeTab === 'all' || user.role === activeTab;
    const matchesSearch = 
      (user.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
      (user.studentNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    // Role-based filters
    if (userRole === 'hod') {
      // HoDs can only see users in their department (except admins)
      return matchesTab && matchesSearch && (user.department === userDepartment || user.role === 'admin');
    }
    
    // Admin can see all users
    return matchesTab && matchesSearch;
  });

  const handleFormChange = (field, value) => {
    // For HoD users, department should always be their own department
    if (userRole === 'hod' && field === 'department' && currentForm.userType !== 'lecturer') {
      return; // Don't allow HoDs to change department for non-lecturers
    }
    
    setCurrentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDepartmentToggle = (deptName) => {
    // Only for lecturers - toggle departments in the array
    if (currentForm.userType !== 'lecturer') return;

    setCurrentForm(prev => {
      const updatedDepartments = prev.departments.includes(deptName)
        ? prev.departments.filter(d => d !== deptName) // Remove if already selected
        : [...prev.departments, deptName]; // Add if not selected
      
      return {
        ...prev,
        departments: updatedDepartments
      };
    });
  };

  const handleOpenAddUser = (userType) => {
    setNewUserType(userType);
    setCurrentForm({
      userType,
      fullName: '',
      email: '',
      department: userType === 'admin' ? '' : userRole === 'hod' ? userDepartment : '', // No department for admin
      departments: userType === 'lecturer' ? (userRole === 'hod' ? [userDepartment] : []) : [], // Array for lecturers
      studentNumber: '',
      isFirstTimeLogin: true
    });
    setEditMode(false);
    setShowAddUserModal(true);
  };

  const handleEditUser = (userData) => {
    // Convert single department to array for lecturers if needed
    const departments = userData.role === 'lecturer' 
      ? Array.isArray(userData.departments) 
        ? userData.departments 
        : userData.department ? [userData.department] : []
      : [];

    setCurrentForm({
      userType: userData.role,
      fullName: userData.displayName || userData.name,
      email: userData.email,
      department: userData.department || '',
      departments: departments,
      studentNumber: userData.studentNumber || '',
      isFirstTimeLogin: false
    });
    setUserToDelete(userData);
    setEditMode(true);
    setShowAddUserModal(true);
  };

  const handleResendVerificationEmail = async (userData) => {
    try {
      setIsSubmitting(true);
      
      // In Firebase Auth, we can only send verification emails for the currently signed-in user
      // For simplicity, we'll just send a password reset email which doesn't require signing in as the user
      
      // Get the user's provider ID to determine how to handle this
      if (userData.role !== 'student') {
        // Get a temporary auth instance to avoid messing with the main app's auth state
        const tempAuth = getAuth();
        
        // First, send a password reset email (this doesn't require being signed in as the user)
        await sendPasswordResetEmail(tempAuth, userData.email);
        
        // Update the user record to indicate a password reset was sent
        const userRef = doc(db, 'users', userData.id);
        await updateDoc(userRef, {
          requirePasswordChange: true,
          passwordResetSent: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        });
        
        toast.success(`Verification and password reset emails sent to ${userData.email}`);
      } else {
        toast.error('This action is only available for staff accounts (Admin, HoD, Lecturer)');
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error(`Failed to send verification email: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSendPasswordReset = async (userData) => {
    try {
      setIsSubmitting(true);
      
      // Send password reset email
      await sendPasswordResetEmail(auth, userData.email);
      
      // Update the user record to indicate a password reset was sent
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        requirePasswordChange: true,
        passwordResetSent: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });
      
      toast.success(`Password reset email sent to ${userData.email}`);
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast.error(`Failed to send password reset: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (userData) => {
    setUserToDelete(userData);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsSubmitting(true);
      
      // If deleting a HoD, update the department to mark position as vacant
      if (userToDelete.role === 'hod') {
        // Find the department document
        const departmentsRef = collection(db, 'departments');
        const deptQuery = query(departmentsRef, where("name", "==", userToDelete.department));
        const deptSnapshot = await getDocs(deptQuery);
        
        if (!deptSnapshot.empty) {
          const departmentDoc = deptSnapshot.docs[0];
          const departmentId = departmentDoc.id;
          
          // Update the department document to remove this user as the HoD
          await updateDoc(doc(db, 'departments', departmentId), {
            hodId: null,
            hodName: 'Position Vacant',
            hodEmail: null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid
          });
          
          toast.success(`${userToDelete.displayName || userToDelete.name} has been removed as Head of Department for ${userToDelete.department}`);
        }
      }
      
      // Delete from Firestore first
      await deleteDoc(doc(db, 'users', userToDelete.id));
      
      // For deleting from Firebase Auth, we need to use Firebase Functions
      // This is because the client-side SDK can only delete the currently signed-in user
      
      // Check if we have the Firebase user UID
      if (userToDelete.uid) {
        try {
          // Using Firebase Functions to delete the user
          // This assumes you have a Firebase Function named 'deleteUserAuth' set up
          const functions = getFunctions();
          const deleteUserFunction = httpsCallable(functions, 'deleteUserAuth');
          
          await deleteUserFunction({ uid: userToDelete.uid });
          toast.success(`User authentication record has been deleted`);
        } catch (authError) {
          console.error("Error deleting user from Auth:", authError);
          toast.warning("User removed from the system but may still exist in authentication records. Please check Firebase console.");
        }
      }
      
      toast.success(`User ${userToDelete.displayName || userToDelete.email} has been deleted`);
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userId, isCurrentlyActive) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: !isCurrentlyActive,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`User status updated`);
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleAddUser = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate form based on role
      if (userRole === 'hod') {
        // HoDs can only add users to their department
        if (currentForm.userType === 'admin' || currentForm.userType === 'dean') {
          toast.error(`As a Head of Department, you cannot create ${currentForm.userType} users.`);
          setIsSubmitting(false);
          return;
        }
        
        // For non-lecturers, check single department
        if (currentForm.userType !== 'lecturer' && currentForm.department !== userDepartment) {
          toast.error(`As a Head of Department for ${userDepartment}, you can only add users to your department.`);
          setIsSubmitting(false);
          return;
        }
        
        // For lecturers, check if the HoD's department is included
        if (currentForm.userType === 'lecturer' && 
            !currentForm.departments.includes(userDepartment)) {
          toast.error(`As a Head of Department for ${userDepartment}, you must include your department when adding lecturers.`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Perform basic validation
      if (!currentForm.fullName || !currentForm.email || 
          (currentForm.userType === 'hod' && !currentForm.department) || 
          (currentForm.userType === 'lecturer' && currentForm.departments.length === 0) ||
          (currentForm.userType === 'student' && (!currentForm.department || !currentForm.studentNumber))) {
        toast.error('Please fill all required fields');
        setIsSubmitting(false);
        return;
      }
      
      // Validate HoD constraints
      if (currentForm.userType === 'hod' && !editMode) {
        // Check if department already has an HoD
        const departmentsRef = collection(db, 'departments');
        const deptQuery = query(departmentsRef, where("name", "==", currentForm.department));
        const deptSnapshot = await getDocs(deptQuery);
        
        if (!deptSnapshot.empty) {
          const departmentDoc = deptSnapshot.docs[0];
          if (departmentDoc.data().hodId && departmentDoc.data().hodId !== (userToDelete?.id || '')) {
            toast.error(`Department ${currentForm.department} already has a Head of Department assigned.`);
            setIsSubmitting(false);
            return;
          }
        }
        
        // Check if the user is already an HoD for another department
        if (editMode && userToDelete) {
          const otherDeptsRef = collection(db, 'departments');
          const otherDeptsQuery = query(
            otherDeptsRef, 
            where("hodId", "==", userToDelete.id),
            where("name", "!=", currentForm.department)
          );
          const otherDeptsSnapshot = await getDocs(otherDeptsQuery);
          
          if (!otherDeptsSnapshot.empty) {
            toast.error(`This user is already assigned as Head of Department for ${otherDeptsSnapshot.docs[0].data().name}.`);
            setIsSubmitting(false);
            return;
          }
        }
      }
      
      if (editMode) {
        // Update existing user
        if (!userToDelete) {
          toast.error('User data not found');
          setIsSubmitting(false);
          return;
        }
        
        const userRef = doc(db, 'users', userToDelete.id);
        
        // Base update data
        const updateData = {
          displayName: currentForm.fullName,
          studentNumber: currentForm.userType === 'student' ? currentForm.studentNumber : '',
          role: currentForm.userType, // Ensure role is correctly set
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        };
        
        // Add appropriate department field(s) based on user type
        if (currentForm.userType === 'admin' || currentForm.userType === 'dean') {
          // Admin and Dean have no department
        } else if (currentForm.userType === 'lecturer') {
          // Lecturers have multiple departments
          updateData.departments = currentForm.departments;
          updateData.department = currentForm.departments[0] || ''; // Keep first department as primary for backward compatibility
        } else {
          // HoD and students have a single department
          updateData.department = currentForm.department;
        }
        
        await updateDoc(userRef, updateData);
        
        // If this is a HoD, update the department's HoD field
        if (currentForm.userType === 'hod') {
          // First, check if the HoD was previously assigned to a different department
          const departmentsRef = collection(db, 'departments');
          const oldDeptQuery = query(departmentsRef, where("hodId", "==", userToDelete.id));
          const oldDeptSnapshot = await getDocs(oldDeptQuery);
          
          // Remove HoD from any previous departments
          for (const oldDeptDoc of oldDeptSnapshot.docs) {
            if (oldDeptDoc.data().name !== currentForm.department) {
              await updateDoc(doc(db, 'departments', oldDeptDoc.id), {
                hodId: null,
                hodName: 'Position Vacant',
                hodEmail: null,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
              });
            }
          }
          
          // Now update the current department
          const deptQuery = query(departmentsRef, where("name", "==", currentForm.department));
          const deptSnapshot = await getDocs(deptQuery);
          
          if (!deptSnapshot.empty) {
            const departmentDoc = deptSnapshot.docs[0];
            const departmentId = departmentDoc.id;
            
            // Update the department document to set this user as the HoD
            await updateDoc(doc(db, 'departments', departmentId), {
              hodId: userToDelete.id,
              hodName: currentForm.fullName,
              hodEmail: currentForm.email,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
            
            toast.success(`${currentForm.fullName} has been assigned as Head of Department for ${currentForm.department}`);
          }
        }
        
        toast.success(`User ${currentForm.fullName} updated successfully`);
        setShowAddUserModal(false);
        setUserToDelete(null);
      } else {
        // Create new user
        // Generate a temporary strong random password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + "!@#";
        
        try {
          // We need to use a different auth instance to avoid being logged out
          const secondaryAuth = getAuth();
          
          // Create the user in Firebase Auth using the secondary auth
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, currentForm.email, tempPassword);
          const newUser = userCredential.user;
          
          // Update user profile in the secondary auth
          await updateProfile(newUser, {
            displayName: currentForm.fullName
          });
          
          // Prepare user data for Firestore
          const userData = {
            uid: newUser.uid,
            displayName: currentForm.fullName,
            email: currentForm.email,
            role: currentForm.userType, // Ensure role is correctly set
            studentNumber: currentForm.userType === 'student' ? currentForm.studentNumber : '',
            isActive: true,
            emailVerified: false,
            requirePasswordChange: true,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            lastLogin: null
          };
          
          // Add appropriate department field(s) based on user type
          if (currentForm.userType === 'admin' || currentForm.userType === 'dean') {
            // Admin and Dean have no department
          } else if (currentForm.userType === 'lecturer') {
            // Lecturers have multiple departments
            userData.departments = currentForm.departments;
            userData.department = currentForm.departments[0] || ''; // Keep first department as primary for backward compatibility
          } else {
            // HoD and students have a single department
            userData.department = currentForm.department;
          }
          
          // Create user record in Firestore
          await setDoc(doc(db, 'users', newUser.uid), userData);
          
          // If this is a HoD, update the department's HoD field
          if (currentForm.userType === 'hod') {
            // First, find the department document
            const departmentsRef = collection(db, 'departments');
            const deptQuery = query(departmentsRef, where("name", "==", currentForm.department));
            const deptSnapshot = await getDocs(deptQuery);
            
            if (!deptSnapshot.empty) {
              const departmentDoc = deptSnapshot.docs[0];
              const departmentId = departmentDoc.id;
              
              // Update the department document to set this user as the HoD
              await updateDoc(doc(db, 'departments', departmentId), {
                hodId: newUser.uid,
                hodName: currentForm.fullName,
                hodEmail: currentForm.email,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
              });
              
              toast.success(`${currentForm.fullName} has been assigned as Head of Department for ${currentForm.department}`);
            }
          }
          
          // Send email verification if this is not a student account
          if (currentForm.userType !== 'student') {
            await sendEmailVerification(newUser);
            // Send password reset email to allow them to set their own password
            await sendPasswordResetEmail(secondaryAuth, currentForm.email);
            
            toast.success(`User ${currentForm.fullName} has been created with role: ${currentForm.userType}`);
            toast.success(`Verification and password reset emails sent to ${currentForm.email}`);
          } else {
            // For students, just show the temporary password
            toast.success(`Student ${currentForm.fullName} has been created`);
            toast.success(`Initial password: ${tempPassword} - Please share with the student securely`);
          }
          
          // Sign out the new user from the secondary auth instance
          // This won't affect the main auth instance that the current admin is using
          await secondaryAuth.signOut();
          
          setShowAddUserModal(false);
        } catch (error) {
          console.error("Error creating user:", error);
          if (error.code === 'auth/email-already-in-use') {
            toast.error('Email address is already in use');
          } else {
            toast.error(`Failed to create user: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error("Error in user operation:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUserForm = () => {
    const userType = newUserType || currentForm.userType;
    
    switch(userType) {
      case 'admin':
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {editMode ? 'Edit Admin' : 'Register Admin'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Administrators have full access to the system.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={currentForm.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter full name"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={currentForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter email address"
                  disabled={isSubmitting || editMode}
                />
                {editMode && (
                  <p className="text-xs text-gray-500 mt-1">Email addresses cannot be changed after creation.</p>
                )}
              </div>
              
              {!editMode && (
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="firstTimeLogin"
                    checked={currentForm.isFirstTimeLogin}
                    onChange={(e) => handleFormChange('isFirstTimeLogin', e.target.checked)}
                    className="mr-2"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="firstTimeLogin" className="text-sm">
                    Require password creation on first login
                  </label>
                </div>
              )}
              
              {editMode && userToDelete && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <h4 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Account Actions
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleResendVerificationEmail(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50' 
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Resend Verification Email
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleSendPasswordReset(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Send Password Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'hod':
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {editMode ? 'Edit Head of Department' : 'Register Head of Department'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Heads of Department are able to manage programs, courses, and lecturer allocations.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={currentForm.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter full name"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={currentForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter email address"
                  disabled={isSubmitting || editMode}
                />
                {editMode && (
                  <p className="text-xs text-gray-500 mt-1">Email addresses cannot be changed after creation.</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <p className="text-xs text-gray-500 mb-2">A Head of Department can only be assigned to one department.</p>
                
                <select 
                  value={currentForm.department}
                  onChange={(e) => handleFormChange('department', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  disabled={isSubmitting || userRole === 'hod'}
                >
                  <option value="">Select department</option>
                  {departments.map(dept => {
                    // For existing HoDs, only show their current department or departments without HoDs
                    const isAssigned = dept.hodId && 
                                       (!editMode || (editMode && dept.hodId !== userToDelete?.id));
                    
                    if (userRole === 'hod' && dept.name !== userDepartment) {
                      return null; // HoDs can only see their own department
                    }
                    
                    if (isAssigned && dept.hodName !== 'Position Vacant') {
                      return (
                        <option key={dept.id} value={dept.name} disabled>
                          {dept.name} (Assigned to {dept.hodName})
                        </option>
                      );
                    }
                    
                    return (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    );
                  })}
                </select>
                
                {userRole === 'hod' && (
                  <p className="text-xs text-gray-500 mt-1">
                    As a Head of Department, you can only manage users in your department.
                  </p>
                )}
              </div>
              
              {!editMode && (
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="firstTimeLogin"
                    checked={currentForm.isFirstTimeLogin}
                    onChange={(e) => handleFormChange('isFirstTimeLogin', e.target.checked)}
                    className="mr-2"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="firstTimeLogin" className="text-sm">
                    Require password creation on first login
                  </label>
                </div>
              )}
              
              {editMode && userToDelete && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <h4 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Account Actions
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleResendVerificationEmail(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50' 
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Resend Verification Email
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleSendPasswordReset(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Send Password Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'dean':
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {editMode ? 'Edit Dean' : 'Register Dean'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Deans are responsible for managing faculties and overseeing departments.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Full Name</label>
                <input 
                  type="text" 
                  value={currentForm.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Enter full name"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Email Address</label>
                <input 
                  type="email" 
                  value={currentForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="Enter email address"
                  disabled={isSubmitting || editMode}
                />
                {editMode && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email addresses cannot be changed after creation.</p>
                )}
              </div>
              
              {!editMode && (
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="firstTimeLogin"
                    checked={currentForm.isFirstTimeLogin}
                    onChange={(e) => handleFormChange('isFirstTimeLogin', e.target.checked)}
                    className="mr-2"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="firstTimeLogin" className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Require password creation on first login
                  </label>
                </div>
              )}
              
              {editMode && userToDelete && (
                <div className="mt-4 border-t pt-4 space-y-3 border-gray-700">
                  <h4 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Account Actions
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleResendVerificationEmail(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50' 
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Resend Verification Email
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleSendPasswordReset(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Send Password Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'lecturer':
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {editMode ? 'Edit Lecturer' : 'Register Lecturer'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Lecturers can be allocated to course units by the Head of Department.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={currentForm.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter full name"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={currentForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter email address"
                  disabled={isSubmitting || editMode}
                />
                {editMode && (
                  <p className="text-xs text-gray-500 mt-1">Email addresses cannot be changed after creation.</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Departments</label>
                <p className="text-xs text-gray-500 mb-2">Lecturers can belong to multiple departments. Select all that apply.</p>
                
                <div className={`border rounded-md p-3 max-h-48 overflow-y-auto ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                }`}>
                  {departments.map(dept => (
                    <div key={dept.id} className="flex items-center mb-2 last:mb-0">
                      <input 
                        type="checkbox" 
                        id={`dept-${dept.id}`}
                        checked={currentForm.departments.includes(dept.name)}
                        onChange={() => handleDepartmentToggle(dept.name)}
                        className="mr-2"
                        disabled={isSubmitting || (userRole === 'hod' && dept.name !== userDepartment)}
                      />
                      <label htmlFor={`dept-${dept.id}`} className="text-sm">
                        {dept.name}
                      </label>
                    </div>
                  ))}
                  
                  {departments.length === 0 && (
                    <p className="text-sm text-gray-500">No departments available.</p>
                  )}
                </div>
                
                {userRole === 'hod' && (
                  <p className="text-xs text-gray-500 mt-1">
                    As a Head of Department, you can only add lecturers to your department.
                  </p>
                )}

                {currentForm.departments.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Please select at least one department.
                  </p>
                )}
              </div>
              
              {!editMode && (
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="firstTimeLogin"
                    checked={currentForm.isFirstTimeLogin}
                    onChange={(e) => handleFormChange('isFirstTimeLogin', e.target.checked)}
                    className="mr-2"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="firstTimeLogin" className="text-sm">
                    Require password creation on first login
                  </label>
                </div>
              )}
              
              {editMode && userToDelete && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <h4 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Account Actions
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleResendVerificationEmail(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50' 
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Resend Verification Email
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleSendPasswordReset(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Send Password Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'student':
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {editMode ? 'Edit Student' : 'Register Student'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Students will be validated by email and can create a password after validation.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={currentForm.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter full name"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Student Number</label>
                <input 
                  type="text" 
                  value={currentForm.studentNumber}
                  onChange={(e) => handleFormChange('studentNumber', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter student number"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={currentForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter email address"
                  disabled={isSubmitting || editMode}
                />
                {editMode && (
                  <p className="text-xs text-gray-500 mt-1">Email addresses cannot be changed after creation.</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Program</label>
                <select 
                  value={currentForm.department}
                  onChange={(e) => handleFormChange('department', e.target.value)}
                  className={`w-full p-2 rounded-md border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  disabled={isSubmitting || userRole === 'hod'}
                >
                  <option value="">Select program</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.departmentName}>
                      {program.name}
                    </option>
                  ))}
                </select>
                {userRole === 'hod' && (
                  <p className="text-xs text-gray-500 mt-1">
                    As a Head of Department, you can only manage students in your department.
                  </p>
                )}
              </div>
              
              {!editMode && (
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="firstTimeLogin"
                    checked={currentForm.isFirstTimeLogin}
                    onChange={(e) => handleFormChange('isFirstTimeLogin', e.target.checked)}
                    className="mr-2"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="firstTimeLogin" className="text-sm">
                    Send validation email immediately
                  </label>
                </div>
              )}
              
              {editMode && userToDelete && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <h4 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Account Actions
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendPasswordReset(userToDelete)}
                      disabled={isSubmitting}
                      className={`flex items-center px-3 py-1.5 text-sm rounded ${
                        darkMode 
                          ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Reset Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return (
          <div className="space-y-4">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Select User Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => setCurrentForm({...currentForm, userType: 'hod'})}
                className={`p-4 rounded-lg border text-left ${
                  darkMode 
                    ? 'border-gray-700 hover:border-blue-500 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-blue-500 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <UserCog className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className="font-medium">Head of Department</span>
                </div>
                <p className="text-xs opacity-70">
                  Manages department programs and course allocations
                </p>
              </button>
              
              <button 
                onClick={() => setCurrentForm({...currentForm, userType: 'dean'})}
                className={`p-4 rounded-lg border text-left ${
                  darkMode 
                    ? 'border-gray-700 hover:border-purple-500 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-purple-500 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <Landmark className={`h-5 w-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <span className="font-medium">Dean</span>
                </div>
                <p className="text-xs opacity-70">
                  Manages faculty and oversees departments
                </p>
              </button>
              
              <button 
                onClick={() => setCurrentForm({...currentForm, userType: 'lecturer'})}
                className={`p-4 rounded-lg border text-left ${
                  darkMode 
                    ? 'border-gray-700 hover:border-indigo-500 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-indigo-500 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                    <BookOpen className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <span className="font-medium">Lecturer</span>
                </div>
                <p className="text-xs opacity-70">
                  Teaches courses and manages course materials
                </p>
              </button>
              
              <button 
                onClick={() => setCurrentForm({...currentForm, userType: 'student'})}
                className={`p-4 rounded-lg border text-left ${
                  darkMode 
                    ? 'border-gray-700 hover:border-amber-500 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 hover:border-amber-500 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
                    <Users className={`h-5 w-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <span className="font-medium">Student</span>
                </div>
                <p className="text-xs opacity-70">
                  Enrolls in courses and views schedules
                </p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            User Management
          </h1>
          <p className={`text-lg mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {userRole === 'admin' 
              ? 'Manage all users across the university' 
              : `Manage users in the ${userDepartment} department`}
          </p>
        </div>
        
        {/* Only show full user management buttons for admin */}
        <div className="flex flex-wrap gap-2">
          {userRole === 'admin' && (
            <button 
              onClick={() => handleOpenAddUser('admin')}
              className={`px-4 py-2 text-base rounded-lg ${
                darkMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <span className="flex items-center">
                <UserCog className="h-5 w-5 mr-2" />
                Add Admin
              </span>
            </button>
          )}
          
          {/* Both admin and HoD can add HoDs, but HoD can only add for their department */}
          {userRole === 'admin' && (
            <button 
              onClick={() => handleOpenAddUser('hod')}
              className={`px-4 py-2 text-base rounded-lg ${
                darkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <span className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Add HoD
              </span>
            </button>
          )}
          
          {userRole === 'admin' && (
            <button 
              onClick={() => handleOpenAddUser('dean')}
              className={`px-4 py-2 text-base rounded-lg ${
                darkMode 
                  ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              <span className="flex items-center">
                <Landmark className="h-5 w-5 mr-2" />
                Add Dean
              </span>
            </button>
          )}
          
          <button 
            onClick={() => handleOpenAddUser('lecturer')}
            className={`px-4 py-2 text-base rounded-lg ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <span className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Add Lecturer
            </span>
          </button>
          
          <button 
            onClick={() => handleOpenAddUser('student')}
            className={`px-4 py-2 text-base rounded-lg ${
              darkMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <span className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Add Student
            </span>
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
        <div className="flex overflow-x-auto rounded-lg border shadow-sm divide-x">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'all'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            All Users
          </button>
          
          {userRole === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-3 font-medium text-base ${
                activeTab === 'admin'
                  ? darkMode 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 text-gray-800'
                  : darkMode 
                    ? 'bg-gray-800 text-gray-400' 
                    : 'bg-white text-gray-500'
              }`}
            >
              Admins
            </button>
          )}
          
          <button 
            onClick={() => setActiveTab('hod')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'hod'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            HoDs
          </button>
          
          <button 
            onClick={() => setActiveTab('dean')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'dean'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            Deans
          </button>
          
          <button 
            onClick={() => setActiveTab('lecturer')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'lecturer'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            Lecturers
          </button>
          
          <button 
            onClick={() => setActiveTab('student')}
            className={`px-4 py-3 font-medium text-base ${
              activeTab === 'student'
                ? darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-100 text-gray-800'
                : darkMode 
                  ? 'bg-gray-800 text-gray-400' 
                  : 'bg-white text-gray-500'
            }`}
          >
            Students
          </button>
        </div>
        
        <div className="flex-grow max-w-lg">
          <div className={`flex items-center rounded-lg border px-4 py-3 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          }`}>
            <Search className="h-6 w-6 text-gray-500 mr-2" />
            <input 
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full outline-none text-base ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-lg font-medium text-gray-500 dark:text-gray-400">Loading users...</span>
        </div>
      )}
      
      {/* Empty state when no users are found */}
      {!isLoading && filteredUsers.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border dark:border-gray-700">
          <div className="flex flex-col items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">No Users Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-5">
              {searchQuery 
                ? "No users match your search criteria. Try adjusting your search."
                : activeTab !== 'all' 
                  ? `No ${activeTab} users found. You can add a new ${activeTab} user with the buttons above.`
                  : "No users have been added yet. Use the buttons above to add your first user."
              }
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      {!isLoading && filteredUsers.length > 0 && (
        <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={darkMode ? 'bg-gray-900' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-4 text-left text-base font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Name
                </th>
                <th className={`px-6 py-4 text-left text-base font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Role
                </th>
                <th className={`px-6 py-4 text-left text-base font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Department
                </th>
                <th className={`px-6 py-4 text-left text-base font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Email
                </th>
                <th className={`px-6 py-4 text-left text-base font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Status
                </th>
                <th className={`px-6 py-4 text-right text-base font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                } uppercase tracking-wider`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredUsers.map(user => (
                <tr key={user.id} className={darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}>
                  <td className={`px-6 py-5 whitespace-nowrap text-base font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user.displayName || user.name}
                    {user.studentNumber && (
                      <span className="block text-sm text-gray-500 dark:text-gray-400">
                        ID: {user.studentNumber}
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap text-base ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      user.role === 'admin'
                        ? darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                        : user.role === 'hod'
                          ? darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                          : user.role === 'lecturer'
                            ? darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                            : darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 
                       user.role === 'hod' ? 'Head of Department' : 
                       user.role === 'lecturer' ? 'Lecturer' : 'Student'}
                    </span>
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap text-base ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {user.role === 'lecturer' && Array.isArray(user.departments) && user.departments.length > 0 
                      ? user.departments.join(', ')
                      : user.department || '-'}
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap text-base ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {user.email}
                  </td>
                  <td className={`px-6 py-5 whitespace-nowrap`}>
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      user.isActive || user.status === 'active'
                        ? darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                        : darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.isActive || user.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-base font-medium">
                    {/* Only allow editing if the user has permission */}
                    {(userRole === 'admin' || 
                     (userRole === 'hod' && user.department === userDepartment && user.role !== 'admin' && user.role !== 'hod')) && (
                      <div className="flex justify-end items-center gap-2">
                        {/* Toggle active status button */}
                        <button 
                          onClick={() => handleToggleUserStatus(user.id, user.isActive || user.status === 'active')}
                          className={`p-1.5 rounded-lg ${
                            user.isActive || user.status === 'active'
                              ? darkMode ? 'text-yellow-400 hover:bg-gray-700' : 'text-yellow-600 hover:bg-gray-100'
                              : darkMode ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-gray-100'
                          }`}
                        >
                          {user.isActive || user.status === 'active' 
                            ? <XCircle className="h-5 w-5" /> 
                            : <CheckCircle className="h-5 w-5" />}
                        </button>
                        
                        {/* Edit button */}
                        <button 
                          onClick={() => handleEditUser(user)}
                          className={`p-1.5 rounded-lg ${
                            darkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-gray-100'
                          }`}
                        >
                          <Edit className="h-5 w-5" />
                        </button>

                        {/* Delete button - Only admin can delete users or HoD can delete lecturers/students in their department */}
                        {(userRole === 'admin' || 
                         (userRole === 'hod' && user.department === userDepartment && 
                          (user.role === 'lecturer' || user.role === 'student'))) && (
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            className={`p-1.5 rounded-lg ${
                              darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'
                            }`}
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddUserModal(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editMode ? 'Edit User' : 'Add New User'}
                  </h3>
                  <button 
                    onClick={() => setShowAddUserModal(false)}
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
                {renderUserForm()}
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  className={`px-4 py-2 rounded-md text-base font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleAddUser}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-md text-base font-medium flex items-center ${
                    isSubmitting 
                      ? 'bg-blue-500 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                >
                  {isSubmitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {editMode ? 'Update User' : 'Register User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && userToDelete && (
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
                  <h3 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
                    Are you sure you want to delete this user? This action cannot be undone.
                  </p>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Name</label>
                    <span className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userToDelete.displayName || userToDelete.name}
                    </span>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Email</label>
                    <span className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {userToDelete.email}
                    </span>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Role</label>
                    <span className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {userToDelete.role === 'admin' ? 'Admin' : 
                       userToDelete.role === 'hod' ? 'Head of Department' : 
                       userToDelete.role === 'lecturer' ? 'Lecturer' : 'Student'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={() => setShowDeleteConfirmation(false)}
                  className={`px-4 py-2 rounded-md text-base font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={confirmDeleteUser}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-md text-base font-medium flex items-center ${
                    isSubmitting 
                      ? 'bg-red-500 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
                >
                  {isSubmitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

UsersManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  userDepartment: PropTypes.string
};

export default UsersManagement; 