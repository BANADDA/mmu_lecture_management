import { initializeApp } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    setDoc,
    where
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8bMbjZIdPx1Pkn1yK6W4TIoMEqwOyQTs",
  authDomain: "whatsapp-5d6e2.firebaseapp.com",
  projectId: "whatsapp-5d6e2",
  storageBucket: "whatsapp-5d6e2.firebasestorage.app",
  messagingSenderId: "797621628352",
  appId: "1:797621628352:web:d9c9c1aa630fe53bbc6c25",
  measurementId: "G-X44WVWJMWH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Create default admin user if it doesn't exist
const createDefaultAdminIfNotExists = async () => {
  try {
    console.log("Attempting to create default admin user...");
    const adminEmail = 'admin@mmu.ac.ug';
    const adminPassword = 'admin123';
    
    // Try to directly create the admin user in Firebase Auth first
    try {
      console.log("Trying to create admin user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;
      
      console.log("Admin user created successfully in Firebase Auth:", user.uid);
      
      // Update user profile
      await updateProfile(user, {
        displayName: 'MMU Admin'
      });
      
      // Create admin record in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: 'MMU Admin',
        email: adminEmail,
        role: 'admin',
        department: 'Administration',
        createdAt: new Date().toISOString()
      });
      
      console.log('Default admin user created successfully in both Auth and Firestore');
      return;
    } catch (error) {
      // Handle the case where user might already exist
      if (error.code === 'auth/email-already-in-use') {
        console.log('Admin user already exists in Auth, checking Firestore...');
      } else {
        console.error('Error creating admin user:', error.code, error.message);
      }
    }
    
    // Check if admin user exists in Firestore
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', adminEmail), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("Admin user not found in Firestore but might exist in Auth, trying to retrieve...");
        
        // User exists in Auth but not in Firestore, try to get the user record
        try {
          // Try to sign in to get the user
          const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          const user = userCredential.user;
          
          console.log("Retrieved existing admin user:", user.uid);
          
          // Create admin record in Firestore
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: 'MMU Admin',
            email: adminEmail,
            role: 'admin',
            department: 'Administration',
            createdAt: new Date().toISOString()
          });
          
          // Sign out after creating the record
          await signOut(auth);
          
          console.log('Admin user added to Firestore successfully');
        } catch (signInError) {
          console.error('Error signing in as admin:', signInError.code, signInError.message);
          
          // If we can't sign in, the issue might be with the Firebase project setup
          console.error('Please check your Firebase project configuration and make sure Email/Password authentication is enabled');
        }
      } else {
        console.log('Default admin user already exists in Firestore');
      }
    } catch (error) {
      console.error('Error checking Firestore for admin user:', error);
    }
  } catch (error) {
    console.error('Error in createDefaultAdminIfNotExists:', error);
  }
};

// Firebase Authentication functions
const loginWithEmailPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      return {
        ...user,
        ...userDoc.data()
      };
    } else {
      // If user exists in Auth but not in Firestore, create the record
      const userData = {
        uid: user.uid,
        displayName: user.displayName || email.split('@')[0],
        email: user.email,
        role: 'user', // Default role
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      return {
        ...user,
        ...userData
      };
    }
  } catch (error) {
    throw error;
  }
};

const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      
      if (user) {
        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            resolve({
              ...user,
              ...userDoc.data()
            });
          } else {
            resolve(user);
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          resolve(user);
        }
      } else {
        resolve(null);
      }
    }, reject);
  });
};

// Initialize the app by checking/creating default admin
createDefaultAdminIfNotExists();

export {
    auth,
    db, getCurrentUser, loginWithEmailPassword,
    logoutUser
};
