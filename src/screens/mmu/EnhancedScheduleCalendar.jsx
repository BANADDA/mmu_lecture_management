import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, ClipboardList, Download, Home, PlusCircle, Search, User, UserX, Users } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

// Helper function to prevent duplicate toasts
const preventDuplicateToast = (callback) => {
  // Check if there are active toasts of the same type
  const { toasts } = toast;
  
  // Safely check if toasts exists and has a map method
  if (!toasts || !Array.isArray(toasts)) {
    // If toasts is undefined or not an array, just execute the callback
    callback();
    return;
  }
  
  const activeToastIds = toasts.map(t => t.id);
  
  // Only proceed if there are no active toasts with the same message
  if (activeToastIds.length === 0) {
    callback();
  }
};

const EnhancedScheduleCalendar = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('week'); // 'day', 'week', 'month', 'semester'
  const [programType, setProgramType] = useState('day'); // 'day', 'evening'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showTimetable, setShowTimetable] = useState(true);
  const [semesterDates, setSemesterDates] = useState({
    startDate: '2025-09-01',
    endDate: '2025-12-15'
  });
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(userDepartment);
  const [selectedFaculty, setSelectedFaculty] = useState('all'); // Add new state for faculty filter
  const [currentEvent, setCurrentEvent] = useState({
    title: '',
    courseId: '',
    lecturerId: '',
    roomId: '',
    startTime: '',
    endTime: '',
    dayOfWeek: '',
    eventDate: '', // Add eventDate field
    sessionType: 'LH', // LH (Lecture Hour), PH (Practical Hour), TH (Tutorial Hour), CH (Clinical Hour)
    isRecurring: true,
    isCrossCutting: false,
    programType: 'day', // 'day' or 'evening'
    crossCuttingDepartments: [],
    crossCuttingPrograms: []
  });
  
  // State for data
  const [courses, setCourses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]); // Add faculties state
  const [programsList, setProgramsList] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [unscheduledLectures, setUnscheduledLectures] = useState([]);
  const [collisions, setCollisions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState('csv');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Generate a consistent color based on the course ID
  const getCourseColor = (courseId) => {
    if (!courseId) return darkMode ? 'bg-gray-700' : 'bg-gray-100';
    
    // Hash function to convert courseId to a consistent number
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) {
      hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Define color sets - more vibrant for both light and dark mode
    const colors = darkMode ? [
      { bg: 'bg-blue-900/50', border: 'border-blue-700', text: 'text-blue-200' },
      { bg: 'bg-indigo-900/50', border: 'border-indigo-700', text: 'text-indigo-200' },
      { bg: 'bg-purple-900/50', border: 'border-purple-700', text: 'text-purple-200' },
      { bg: 'bg-pink-900/50', border: 'border-pink-700', text: 'text-pink-200' },
      { bg: 'bg-red-900/50', border: 'border-red-700', text: 'text-red-200' },
      { bg: 'bg-orange-900/50', border: 'border-orange-700', text: 'text-orange-200' },
      { bg: 'bg-amber-900/50', border: 'border-amber-700', text: 'text-amber-200' },
      { bg: 'bg-yellow-900/50', border: 'border-yellow-700', text: 'text-yellow-200' },
      { bg: 'bg-lime-900/50', border: 'border-lime-700', text: 'text-lime-200' },
      { bg: 'bg-green-900/50', border: 'border-green-700', text: 'text-green-200' },
      { bg: 'bg-emerald-900/50', border: 'border-emerald-700', text: 'text-emerald-200' },
      { bg: 'bg-teal-900/50', border: 'border-teal-700', text: 'text-teal-200' },
      { bg: 'bg-cyan-900/50', border: 'border-cyan-700', text: 'text-cyan-200' },
    ] : [
      { bg: 'bg-blue-200', border: 'border-blue-400', text: 'text-blue-900' },
      { bg: 'bg-indigo-200', border: 'border-indigo-400', text: 'text-indigo-900' },
      { bg: 'bg-purple-200', border: 'border-purple-400', text: 'text-purple-900' },
      { bg: 'bg-pink-200', border: 'border-pink-400', text: 'text-pink-900' },
      { bg: 'bg-red-200', border: 'border-red-400', text: 'text-red-900' },
      { bg: 'bg-orange-200', border: 'border-orange-400', text: 'text-orange-900' },
      { bg: 'bg-amber-200', border: 'border-amber-400', text: 'text-amber-900' },
      { bg: 'bg-yellow-200', border: 'border-yellow-400', text: 'text-yellow-900' },
      { bg: 'bg-lime-200', border: 'border-lime-400', text: 'text-lime-900' },
      { bg: 'bg-green-200', border: 'border-green-400', text: 'text-green-900' },
      { bg: 'bg-emerald-200', border: 'border-emerald-400', text: 'text-emerald-900' },
      { bg: 'bg-teal-200', border: 'border-teal-400', text: 'text-teal-900' },
      { bg: 'bg-cyan-200', border: 'border-cyan-400', text: 'text-cyan-900' },
    ];
    
    // Use the hash to pick a color
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };
  
  // Time slots
  const dayTimeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = i + 8; // Starting from 8 AM
    return `${hour.toString().padStart(2, '0')}:00`;
  });
  
  const eveningTimeSlots = Array.from({ length: 5 }, (_, i) => {
    const hour = i + 17; // Starting from 5 PM
    return `${hour.toString().padStart(2, '0')}:00`;
  });
  
  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch faculties
        const facultiesSnapshot = await getDocs(collection(db, 'faculties'));
        const facultiesData = facultiesSnapshot.docs
          .filter(doc => doc.data().isActive)
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        setFaculties(facultiesData);
        
        // Fetch departments with faculty filtering
        const departmentsRef = collection(db, 'departments');
        let departmentsQuery;
        
        if (selectedFaculty !== 'all') {
          departmentsQuery = query(departmentsRef, where("facultyId", "==", selectedFaculty), where("isActive", "==", true));
        } else {
          departmentsQuery = query(departmentsRef, where("isActive", "==", true));
        }
        
        const departmentsSnapshot = await getDocs(departmentsQuery);
        const departmentsData = departmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDepartments(departmentsData);
        
        // Reset department selection if it's no longer valid with the selected faculty
        if (selectedFaculty !== 'all' && selectedDepartment !== 'all' && selectedDepartment !== userDepartment) {
          const deptExists = departmentsData.some(dept => dept.id === selectedDepartment);
          if (!deptExists) {
            setSelectedDepartment(userRole === 'hod' ? userDepartment : 'all');
          }
        }
        
        // Fetch programs with department filtering
        const programsRef = collection(db, 'programs');
        let programsQuery;
        
        if (userRole === 'hod') {
          // For HoD, only their department's programs
          const departmentRef = query(collection(db, 'departments'), where("name", "==", userDepartment));
          const deptSnapshot = await getDocs(departmentRef);
          if (!deptSnapshot.empty) {
            const departmentId = deptSnapshot.docs[0].id;
            programsQuery = query(programsRef, where("departmentId", "==", departmentId), where("isActive", "==", true));
          }
        } else if (selectedDepartment !== 'all') {
          // Filter by selected department
          programsQuery = query(programsRef, where("departmentId", "==", selectedDepartment), where("isActive", "==", true));
        } else if (selectedFaculty !== 'all') {
          // Filter by selected faculty (through departments)
          const deptIds = departmentsData
            .filter(dept => dept.facultyId === selectedFaculty)
            .map(dept => dept.id);
          
          if (deptIds.length > 0) {
            programsQuery = query(programsRef, where("departmentId", "in", deptIds), where("isActive", "==", true));
          } else {
            setProgramsList([]);
            programsQuery = query(programsRef, where("isActive", "==", true));
          }
        } else {
          // All active programs
          programsQuery = query(programsRef, where("isActive", "==", true));
        }
        
        const programsSnapshot = await getDocs(programsQuery);
        const programsData = programsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProgramsList(programsData);
        
        // Reset program selection if it's no longer valid
        if (selectedProgram !== 'all') {
          const programExists = programsData.some(prog => prog.id === selectedProgram);
          if (!programExists) {
            setSelectedProgram('all');
          }
        }
        
        // Fetch courses
        let coursesQuery = collection(db, 'courses');
        
        // Filter by role, faculty, department, or program as appropriate
        if (userRole === 'hod') {
          coursesQuery = query(coursesQuery, where('departmentName', '==', userDepartment));
        } else if (selectedProgram !== 'all') {
          coursesQuery = query(coursesQuery, where('programId', '==', selectedProgram));
        } else if (selectedDepartment !== 'all') {
          coursesQuery = query(coursesQuery, where('departmentId', '==', selectedDepartment));
        } else if (selectedFaculty !== 'all') {
          // Get department IDs in this faculty
          const deptIds = departmentsData
            .filter(dept => dept.facultyId === selectedFaculty)
            .map(dept => dept.id);
          
          if (deptIds.length > 0) {
            coursesQuery = query(coursesQuery, where('departmentId', 'in', deptIds));
          }
        }
        
        const coursesSnapshot = await getDocs(coursesQuery);
        const coursesData = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCourses(coursesData);
        
        // Fetch rooms
        const roomsSnapshot = await getDocs(collection(db, 'rooms'));
        const roomsData = roomsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRooms(roomsData);
        
        // Fetch lecturers
        let lecturersQuery = collection(db, 'users');
        if (userRole === 'hod') {
          lecturersQuery = query(lecturersQuery, where('department', '==', userDepartment), where('role', '==', 'lecturer'));
        } else {
          lecturersQuery = query(lecturersQuery, where('role', '==', 'lecturer'));
        }
        const lecturersSnapshot = await getDocs(lecturersQuery);
        const lecturersData = lecturersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLecturers(lecturersData);
        
        // Fetch schedule events with program filtering
        let scheduleQuery = collection(db, 'scheduleEvents');
        const queryFilters = [];
        
        // Only apply filters based on user role and selections
        if (userRole === 'lecturer') {
          // Lecturers only see their own schedules
          queryFilters.push(where('lecturerId', '==', user.uid));
        } else if (userRole === 'hod' && selectedProgram === 'all') {
          // HoDs see department schedules and cross-cutting courses
          // Can't use OR queries directly with Firestore, so we'll filter in JS
          queryFilters.push(where('department', '==', userDepartment));
        } else if (userRole === 'admin' && selectedDepartment !== 'all' && selectedProgram === 'all') {
          // Admins with specific department but all programs
          queryFilters.push(where('department', '==', selectedDepartment));
        } else if (selectedProgram !== 'all') {
          // Specific program selected - filter by programId
          queryFilters.push(where('programId', '==', selectedProgram));
        }
        
        // Apply all filters if they exist
        if (queryFilters.length > 0) {
          scheduleQuery = query(scheduleQuery, ...queryFilters);
        }
        
        const scheduleSnapshot = await getDocs(scheduleQuery);
        const scheduleData = scheduleSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure full information is available for display
          lecturer: lecturersData.find(l => l.id === doc.data().lecturerId)?.name || 'Unknown',
          room: roomsData.find(r => r.id === doc.data().roomId)?.name || 'Unknown',
          courseName: coursesData.find(c => c.id === doc.data().courseId)?.name || 'Unknown',
          courseCode: coursesData.find(c => c.id === doc.data().courseId)?.code || 'Unknown'
        }));
        
        // If we're showing a specific department/role, we need to fetch cross-cutting courses separately
        // since Firestore doesn't support OR queries directly in our current setup
        if ((userRole === 'hod' || (userRole === 'admin' && selectedDepartment !== 'all')) && selectedProgram === 'all') {
          // Get cross-cutting courses in a separate query
          const crossCuttingQuery = query(
            collection(db, 'scheduleEvents'),
            where('isCrossCutting', '==', true)
          );
          
          const crossCuttingSnapshot = await getDocs(crossCuttingQuery);
          const crossCuttingData = crossCuttingSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              lecturer: lecturersData.find(l => l.id === doc.data().lecturerId)?.name || 'Unknown',
              room: roomsData.find(r => r.id === doc.data().roomId)?.name || 'Unknown',
              courseName: coursesData.find(c => c.id === doc.data().courseId)?.name || 'Unknown',
              courseCode: coursesData.find(c => c.id === doc.data().courseId)?.code || 'Unknown'
            }))
            .filter(event => {
              // For HoDs, only include cross-cutting courses relevant to their department
              if (userRole === 'hod') {
                return event.crossCuttingDepartments?.includes(userDepartment);
              }
              // For admins with selected department
              if (userRole === 'admin' && selectedDepartment !== 'all') {
                return event.crossCuttingDepartments?.includes(selectedDepartment);
              }
              return true;
            });

          // Combine regular and cross-cutting events, avoiding duplicates
          const combinedEvents = [...scheduleData];
          crossCuttingData.forEach(event => {
            if (!combinedEvents.some(e => e.id === event.id)) {
              combinedEvents.push(event);
            }
          });
          
          setScheduleEvents(combinedEvents);
        } else {
          setScheduleEvents(scheduleData);
        }
        
        // Fetch semester settings
        const semesterSettingsSnapshot = await getDocs(collection(db, 'settings'));
        const semesterSettings = semesterSettingsSnapshot.docs.find(doc => doc.id === 'semester');
        if (semesterSettings) {
          setSemesterDates(semesterSettings.data());
        }
        
        // Generate unscheduled lectures
        // These are courses that don't have any scheduled events
        const unscheduled = coursesData.filter(course => 
          !scheduleData.some(event => event.courseId === course.id)
        ).map(course => ({
          id: course.id,
          code: course.code,
          name: course.name,
          department: course.departmentName,
          lecturer: lecturersData.find(l => l.id === course.lecturer)?.name || 'Not Assigned',
          isCrossCutting: course.isCrossCutting || false
        }));
        setUnscheduledLectures(unscheduled);
        
        // Find scheduling conflicts
        const conflicts = [];
        scheduleData.forEach(event1 => {
          scheduleData.forEach(event2 => {
            if (event1.id !== event2.id && 
                event1.dayOfWeek === event2.dayOfWeek && 
                event1.programType === event2.programType) {
              
              // Check time overlap
              const start1 = convertTimeToMinutes(event1.startTime);
              const end1 = convertTimeToMinutes(event1.endTime);
              const start2 = convertTimeToMinutes(event2.startTime);
              const end2 = convertTimeToMinutes(event2.endTime);
              
              if (start1 < end2 && start2 < end1) {
                // Lecturer conflict
                if (event1.lecturerId === event2.lecturerId) {
                  conflicts.push({
                    id: `lecturer-${event1.id}-${event2.id}`,
                    type: 'lecturer',
                    description: `${event1.lecturer} has overlapping classes`,
                    message: `Lecturer ${event1.lecturer} has overlapping classes: ${event1.courseName} and ${event2.courseName}`,
                    events: [event1.id, event2.id]
                  });
                }
                
                // Room conflict
                if (event1.roomId === event2.roomId) {
                  conflicts.push({
                    id: `room-${event1.id}-${event2.id}`,
                    type: 'room',
                    description: `${event1.room} double-booked`,
                    message: `Room ${event1.room} is double-booked for ${event1.courseName} and ${event2.courseName}`,
                    events: [event1.id, event2.id]
                  });
                }
                
                // Student group conflict (same course or department)
                if (event1.department === event2.department) {
                  conflicts.push({
                    id: `student-${event1.id}-${event2.id}`,
                    type: 'course',
                    description: `Students have overlapping classes`,
                    message: `Students in ${event1.department} have overlapping classes: ${event1.courseName} and ${event2.courseName}`,
                    events: [event1.id, event2.id]
                  });
                }
              }
            }
          });
        });
        
        // Remove duplicate conflicts
        const uniqueConflicts = conflicts.filter((conflict, index, self) =>
          index === self.findIndex(c => c.id === conflict.id)
        );
        
        setCollisions(uniqueConflicts);
        
        // Add debug logs for data loaded
        console.log('DEBUG - Faculties loaded:', facultiesData?.length);
        console.log('DEBUG - Departments loaded:', departmentsData?.length);
        console.log('DEBUG - Programs loaded:', programsData?.length);
        console.log('DEBUG - Courses loaded:', coursesData?.length);
        console.log('DEBUG - selectedFaculty:', selectedFaculty);
        console.log('DEBUG - selectedDepartment:', selectedDepartment);
        console.log('DEBUG - selectedProgram:', selectedProgram);
      } catch (error) {
        console.error("Error fetching data:", error);
          toast.error("Failed to load schedule data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [userRole, userDepartment, selectedDepartment, selectedFaculty, selectedProgram, user?.uid]);
  
  // Get time slots based on the selected program type
  const getTimeSlots = () => {
    return programType === 'day' ? dayTimeSlots : eveningTimeSlots;
  };

  // Days of the week
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Helper functions
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const formatDateRange = () => {
    const options = { month: 'short', day: 'numeric' };
    if (currentView === 'day') {
      return currentDate.toLocaleDateString(undefined, { ...options, weekday: 'long' });
    } else if (currentView === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString(undefined, options)} - ${endOfWeek.toLocaleDateString(undefined, options)}`;
    } else {
      return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
  };

  // Export the schedule as a file
  const exportSchedule = () => {
    // Collect active schedule data based on department/program filters 
    const events = filterSchedules();
    
    // Format the filename based on current selections and view
    const departmentText = selectedDepartment || userDepartment;
    const programText = selectedProgram !== 'all' 
      ? programsList.find(p => p.id === selectedProgram)?.name || 'Selected-Program' 
      : 'All-Programs';
    
    // Clean up file name
    const sanitizedDept = departmentText.replace(/\s+/g, '-');
    const sanitizedProgram = programText.replace(/\s+/g, '-');
    const sanitizedView = currentView.charAt(0).toUpperCase() + currentView.slice(1);
    
    const filename = `lecture-schedule-${sanitizedDept}-${sanitizedProgram}-${sanitizedView}-${new Date().toISOString().slice(0,10)}`;
    
    // Use the existing exportFormat state variable 
    const formatType = currentView.charAt(0).toUpperCase() + currentView.slice(1);
    
    // Single toast notification
    let toastId;
    preventDuplicateToast(() => {
      toastId = toast.loading(`Preparing ${programType} ${formatType} schedule export...`);
    });
    
    try {
      if (exportFormat === 'csv') {
        const content = generateCSV(events);
        
        // Create a blob and download
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        preventDuplicateToast(() => {
          toast.success('CSV exported successfully!', { id: toastId });
        });
      } else if (exportFormat === 'html') {
        const content = generateHTML(events);
        const mime = 'text/html';
        
        // Create a blob and download
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.html`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        preventDuplicateToast(() => {
          toast.success('HTML exported successfully!', { id: toastId });
        });
      } else if (exportFormat === 'pdf') {
        // For PDF format using jsPDF - toast is handled inside exportToPDF
        toast.dismiss(toastId); // Dismiss this toast as exportToPDF will create its own
        exportToPDF(events, `${filename}.pdf`);
      }
    } catch (error) {
      console.error('Export error:', error);
      preventDuplicateToast(() => {
        toast.error('Failed to export schedule. Please try again.', { id: toastId });
      });
    }
    
    // Close the export modal
    setShowExportModal(false);
  };

  // Export to PDF using jsPDF and html2canvas
  const exportToPDF = (events, filename) => {
    // Get the active view and generate appropriate content
    let pdfContent;
    
    // Make sure we're using the generated events, not the passed events parameter
    const generatedEvents = generateEvents();
    
    if (currentView === 'day') {
      pdfContent = generatePDFDayView(generatedEvents);
    } else if (currentView === 'week') {
      pdfContent = generatePDFWeekView(generatedEvents);
    } else if (currentView === 'month') {
      pdfContent = generatePDFMonthView(generatedEvents);
    } else if (currentView === 'semester') {
      pdfContent = generatePDFSemesterView(generatedEvents);
    }
    
    // Create a temporary container for the PDF content
    const container = document.createElement('div');
    container.innerHTML = pdfContent;
    
    // Set explicit dimensions and styles
    container.style.width = '1100px';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.backgroundColor = '#fff';
    document.body.appendChild(container);
    
    // Debug info
    console.log(`Rendering PDF with ${generatedEvents.length} events`);
    
    // Show loading toast
    let toastId;
    preventDuplicateToast(() => {
      toastId = toast.loading('Generating PDF, please wait...');
    });
    
    // Convert to canvas with html2canvas
    html2canvas(container, {
      scale: 1,
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add the canvas as an image
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Save the PDF
      pdf.save(filename);
      
      // Clean up - remove the temporary container
      document.body.removeChild(container);
      
      // Show success toast
      preventDuplicateToast(() => {
        toast.success('PDF generated successfully!', { id: toastId });
      });
    }).catch(error => {
      console.error("PDF generation error:", error);
      preventDuplicateToast(() => {
        toast.error('Failed to generate PDF. Please try again.', { id: toastId });
      });
      
      // Clean up - remove the temporary container
      document.body.removeChild(container);
    });
  };
  
  // Base styles for all PDFs - use fixed width of 1100px
  const getBaseStyles = () => `
    :root {
      --primary-color: #4338ca;
      --primary-light: #e0e7ff;
      --secondary-color: #1e40af;
      --accent-color: #3f51b5;
      --text-primary: #111827;
      --text-secondary: #4b5563;
      --text-light: #6b7280;
      --bg-light: #f9fafb;
      --border-light: #e5e7eb;
      --success-color: #10b981;
      --warning-color: #f59e0b;
      --error-color: #ef4444;
      --shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px;
      --radius: 8px;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: var(--text-primary);
      background-color: #fff;
      width: 100%;
      margin: 0;
    }
    
    .pdf-container {
      width: 100%;
      padding: 20px;
      margin: 0;
      background-color: #fff;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid var(--primary-color);
    }
    
    .logo-title {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .logo {
      width: 70px;
      height: 70px;
      background-color: var(--primary-color);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 20px;
    }
    
    .title-container h1 {
      color: var(--primary-color);
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .title-container h2 {
      color: var(--text-secondary);
      font-size: 18px;
      font-weight: 500;
    }
    
    .date-info {
      text-align: right;
      color: var(--text-secondary);
    }
    
    .date-info p {
      margin: 5px 0;
    }
    
    .content {
      background-color: var(--bg-light);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    
    .section-header {
      background-color: var(--primary-color);
      color: white;
      padding: 12px 20px;
      font-size: 18px;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 20px;
      text-align: center;
      color: var(--text-light);
      font-size: 12px;
    }
    
    /* Make sure events are visible */
    .event {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    /* Table styles */
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    
    th, td {
      border: 1px solid var(--border-light);
      padding: 8px;
      overflow: visible;
    }
  `;
  
  // Generate PDF content for Day view with enhanced design
  const generatePDFDayView = (events) => {
    const dayOfWeek = daysOfWeek[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1];
    const dayEvents = events.filter(event => event.day === dayOfWeek);
    
    // Sort events by start time
    dayEvents.sort((a, b) => convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime));
    
    const titleText = `${selectedDepartment || userDepartment} ${programType.charAt(0).toUpperCase() + programType.slice(1)} Program`;
    const headerText = `Daily Schedule: ${currentDate.toLocaleDateString()}`;
    
    return `
      <style>
        ${getBaseStyles()}
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        thead tr {
          border-bottom: 2px solid var(--primary-light);
        }
        
        th {
          background-color: var(--primary-light);
          color: var(--primary-color);
          text-align: left;
          padding: 14px 16px;
          font-weight: 600;
        }
        
        td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-light);
        }
        
        tr:nth-child(even) {
          background-color: rgba(0,0,0,0.02);
        }
        
        .time-cell {
          font-weight: 600;
          color: var(--primary-color);
          white-space: nowrap;
        }
        
        .course-cell {
          font-weight: 500;
        }
        
        .course-code {
          color: var(--text-light);
          font-size: 12px;
          margin-top: 3px;
        }
        
        .badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
        }
        
        .badge-LH {
          background-color: #e0e7ff;
          color: #4338ca;
        }
        
        .badge-PH {
          background-color: #dcfce7;
          color: #16a34a;
        }
        
        .badge-TH {
          background-color: #fef9c3;
          color: #ca8a04;
        }
        
        .badge-CH {
          background-color: #fee2e2;
          color: #dc2626;
        }
        
        .room-cell, .lecturer-cell {
          color: var(--text-secondary);
        }
        
        .empty-message {
          padding: 40px;
          text-align: center;
          color: var(--text-light);
          font-style: italic;
          font-size: 16px;
        }
        
        .date-info .current-date {
          color: var(--primary-color);
          font-weight: 600;
          font-size: 18px;
        }
      </style>
      
      <div class="pdf-container">
        <div class="header">
          <div class="logo-title">
            <div class="logo">MMU</div>
            <div class="title-container">
              <h1>${titleText}</h1>
              <h2>${headerText}</h2>
            </div>
          </div>
          <div class="date-info">
            <p class="current-date">${dayOfWeek}</p>
            <p>${currentDate.toLocaleDateString()}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="section-header">
            Schedule for ${dayOfWeek}
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">Time</th>
                <th style="width: 35%;">Course</th>
                <th style="width: 15%;">Session Type</th>
                <th style="width: 18%;">Room</th>
                <th style="width: 20%;">Lecturer</th>
              </tr>
            </thead>
            <tbody>
              ${dayEvents.length === 0 ? 
                `<tr><td colspan="5" class="empty-message">No scheduled lectures for this day</td></tr>` 
                : 
                dayEvents.map(event => {
                  const sessionType = getSessionTypeBadge(event.sessionType);
                  
                  return `
                    <tr>
                      <td class="time-cell">${event.startTime} - ${event.endTime}</td>
                      <td class="course-cell">
                        ${event.title}
                        <div class="course-code">${event.courseCode}</div>
                      </td>
                      <td>
                        <span class="badge badge-${event.sessionType}">${sessionType.label}</span>
                      </td>
                      <td class="room-cell">${event.room}</td>
                      <td class="lecturer-cell">${event.lecturer}</td>
                    </tr>
                  `;
                }).join('')
              }
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} MMU University. All rights reserved.</p>
        </div>
      </div>
    `;
  };
  
  // Generate PDF content for Week view with enhanced design
  const generatePDFWeekView = (events) => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const titleText = `${selectedDepartment || userDepartment} ${programType.charAt(0).toUpperCase() + programType.slice(1)} Program`;
    const headerText = `Weekly Schedule: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    
    const timeSlots = getTimeSlots();
    
    return `
      <style>
        ${getBaseStyles()}
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th {
          background-color: var(--primary-light);
          color: var(--primary-color);
          text-align: center;
          padding: 12px 15px;
          font-weight: 600;
          border: 1px solid #fff;
        }
        
        th.time-header {
          background-color: var(--secondary-color);
          color: white;
          width: 85px;
        }
        
        td {
          border: 1px solid var(--border-light);
          padding: 8px;
          height: 70px;
          vertical-align: top;
        }
        
        td.time-cell {
          background-color: var(--primary-light);
          color: var(--primary-color);
          font-weight: 600;
          text-align: center;
          vertical-align: middle;
          font-size: 14px;
        }
        
        .event {
          margin: 3px 0;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
          overflow: hidden;
        }
        
        .event-LH {
          background-color: rgba(67, 56, 202, 0.1);
          border-left: 3px solid #4338ca;
        }
        
        .event-PH {
          background-color: rgba(16, 185, 129, 0.1);
          border-left: 3px solid #10b981;
        }
        
        .event-TH {
          background-color: rgba(245, 158, 11, 0.1);
          border-left: 3px solid #f59e0b;
        }
        
        .event-CH {
          background-color: rgba(239, 68, 68, 0.1);
          border-left: 3px solid #ef4444;
        }
        
        .event-title {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .event-time, .event-room {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 3px;
        }
        
        .event-continuation {
          opacity: 0.7;
          font-style: italic;
        }
        
        .date-info .date-range {
          color: var(--primary-color);
          font-weight: 600;
          font-size: 18px;
        }
      </style>
      
      <div class="pdf-container">
        <div class="header">
          <div class="logo-title">
            <div class="logo">MMU</div>
            <div class="title-container">
              <h1>${titleText}</h1>
              <h2>${headerText}</h2>
            </div>
          </div>
          <div class="date-info">
            <p class="date-range">${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</p>
            <p>Week ${Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7)}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="section-header">
            Weekly Timetable
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="time-header">Time</th>
                ${daysOfWeek.map(day => `<th>${day}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${timeSlots.map(time => `
                <tr>
                  <td class="time-cell">${time}</td>
                  ${daysOfWeek.map(day => {
                    const eventsAtTime = events.filter(event => 
                      event.day === day && 
                      convertTimeToMinutes(event.startTime) <= convertTimeToMinutes(time) && 
                      convertTimeToMinutes(event.endTime) > convertTimeToMinutes(time)
                    );
                    
                    if (eventsAtTime.length === 0) {
                      return `<td></td>`;
                    } 
                    
                    return `
                      <td>
                        ${eventsAtTime.map(event => {
                          const isStartTime = event.startTime === time;
                          
                          return `
                            <div class="event event-${event.sessionType} ${!isStartTime ? 'event-continuation' : ''}">
                              ${isStartTime ? `
                                <div class="event-title">${event.title}</div>
                                <div class="event-time">${event.startTime} - ${event.endTime}</div>
                                <div class="event-room">${event.room}</div>
                              ` : `
                                <div>• ${event.title} (cont.)</div>
                              `}
                            </div>
                          `;
                        }).join('')}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} MMU University. All rights reserved.</p>
        </div>
      </div>
    `;
  };
  
  // Generate PDF content for Month view with enhanced design - as sequential weekly calendars
  const generatePDFMonthView = (events) => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    const titleText = `${selectedDepartment || userDepartment} ${programType.charAt(0).toUpperCase() + programType.slice(1)} Program`;
    const headerText = `Monthly Schedule: ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    
    // Determine the first and last weeks of the month
    const firstWeekStart = new Date(firstDay);
    firstWeekStart.setDate(firstWeekStart.getDate() - firstWeekStart.getDay() + 1); // Monday of first week
    
    const lastWeekEnd = new Date(lastDay);
    const daysToAdd = 7 - lastWeekEnd.getDay();
    if (daysToAdd < 7) lastWeekEnd.setDate(lastWeekEnd.getDate() + daysToAdd); // Sunday of last week
    
    // Generate arrays of week start dates
    const weekStartDates = [];
    let currentWeekStart = new Date(firstWeekStart);
    
    while (currentWeekStart <= lastWeekEnd) {
      weekStartDates.push(new Date(currentWeekStart));
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    const timeSlots = getTimeSlots();
    
    return `
      <style>
        ${getBaseStyles()}
        
        .month-container {
          margin-bottom: 40px;
          width: 100%;
        }
        
        .week-container {
          margin-bottom: 40px;
          page-break-inside: avoid;
          width: 100%;
        }
        
        .week-title {
          background-color: var(--secondary-color);
          color: white;
          padding: 10px 15px;
          font-size: 16px;
          font-weight: 600;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        
        th {
          background-color: var(--primary-light);
          color: var(--primary-color);
          text-align: center;
          padding: 12px 15px;
          font-weight: 600;
          border: 1px solid #fff;
        }
        
        th.time-header {
          background-color: var(--secondary-color);
          color: white;
          width: 85px;
        }
        
        td {
          border: 1px solid var(--border-light);
          padding: 8px;
          height: 70px;
          vertical-align: top;
        }
        
        td.time-cell {
          background-color: var(--primary-light);
          color: var(--primary-color);
          font-weight: 600;
          text-align: center;
          vertical-align: middle;
          font-size: 14px;
        }
        
        .event {
          margin: 3px 0;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
          overflow: hidden;
        }
        
        .event-LH {
          background-color: rgba(67, 56, 202, 0.1);
          border-left: 3px solid #4338ca;
        }
        
        .event-PH {
          background-color: rgba(16, 185, 129, 0.1);
          border-left: 3px solid #10b981;
        }
        
        .event-TH {
          background-color: rgba(245, 158, 11, 0.1);
          border-left: 3px solid #f59e0b;
        }
        
        .event-CH {
          background-color: rgba(239, 68, 68, 0.1);
          border-left: 3px solid #ef4444;
        }
        
        .event-title {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .event-time, .event-room {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 3px;
        }
        
        .event-continuation {
          opacity: 0.7;
          font-style: italic;
        }
        
        .date-info .current-month {
          color: var(--primary-color);
          font-weight: 600;
          font-size: 18px;
        }
        
        .week-range {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 5px;
        }
      </style>
      
      <div class="pdf-container">
        <div class="header">
          <div class="logo-title">
            <div class="logo">MMU</div>
            <div class="title-container">
              <h1>${titleText}</h1>
              <h2>${headerText}</h2>
            </div>
          </div>
          <div class="date-info">
            <p class="current-month">${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <p>${firstDay.toLocaleDateString()} - ${lastDay.toLocaleDateString()}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="section-header">
            Monthly Calendar - Weekly View
          </div>
          
          <div class="month-container">
            ${weekStartDates.map((weekStart) => {
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              
              const weekNum = Math.ceil((weekStart.getDate() + weekStart.getDay()) / 7);
              const isInMonth = (date) => date.getMonth() === currentMonth;
              
              return `
                <div class="week-container">
                  <div class="week-title">
                    Week ${weekNum} 
                    <span class="week-range">
                      (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})
                      ${isInMonth(weekStart) && isInMonth(weekEnd) ? '' : ' - Includes days outside current month'}
                    </span>
                  </div>
                  
                  <table>
                    <thead>
                      <tr>
                        <th class="time-header">Time</th>
                        ${daysOfWeek.map(day => `<th>${day}</th>`).join('')}
                      </tr>
                    </thead>
                    <tbody>
                      ${timeSlots.map(time => {
                        const weekDates = [];
                        for (let i = 0; i < 7; i++) {
                          const date = new Date(weekStart);
                          date.setDate(date.getDate() + i);
                          weekDates.push(date);
                        }
                        
                        return `
                          <tr>
                            <td class="time-cell">${time}</td>
                            ${daysOfWeek.map((day, dayIndex) => {
                              const date = weekDates[dayIndex];
                              const inCurrentMonth = date.getMonth() === currentMonth;
                              
                              const eventsAtTime = events.filter(event => 
                                event.day === day && 
                                convertTimeToMinutes(event.startTime) <= convertTimeToMinutes(time) && 
                                convertTimeToMinutes(event.endTime) > convertTimeToMinutes(time)
                              );
                              
                              if (eventsAtTime.length === 0) {
                                return `<td style="${!inCurrentMonth ? 'background-color: rgba(0,0,0,0.03);' : ''}"></td>`;
                              } 
                              
                              return `
                                <td style="${!inCurrentMonth ? 'background-color: rgba(0,0,0,0.03);' : ''}">
                                  ${eventsAtTime.map(event => {
                                    const isStartTime = event.startTime === time;
                                    
                                    return `
                                      <div class="event event-${event.sessionType} ${!isStartTime ? 'event-continuation' : ''}">
                                        ${isStartTime ? `
                                          <div class="event-title">${event.title}</div>
                                          <div class="event-time">${event.startTime} - ${event.endTime}</div>
                                          <div class="event-room">${event.room}</div>
                                        ` : `
                                          <div>• ${event.title} (cont.)</div>
                                        `}
                                      </div>
                                    `;
                                  }).join('')}
                                </td>
                              `;
                            }).join('')}
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} MMU University. All rights reserved.</p>
        </div>
      </div>
    `;
  };
  
  // Generate PDF content for Semester view with enhanced design - as sequential weekly calendars
  const generatePDFSemesterView = (events) => {
    const startDate = new Date(semesterDates.startDate);
    const endDate = new Date(semesterDates.endDate);
    
    const titleText = `${selectedDepartment || userDepartment} ${programType.charAt(0).toUpperCase() + programType.slice(1)} Program`;
    const headerText = `Semester Schedule: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    
    // Determine the weeks in the semester
    const firstWeekStart = new Date(startDate);
    // Adjust to start from Monday of the week
    firstWeekStart.setDate(firstWeekStart.getDate() - firstWeekStart.getDay() + 1);
    if (firstWeekStart.getDay() === 0) {
      firstWeekStart.setDate(firstWeekStart.getDate() - 6); // If Sunday, go back to previous Monday
    }
    
    // Generate arrays of week start dates covering the semester
    const weekStartDates = [];
    let currentWeekStart = new Date(firstWeekStart);
    
    while (currentWeekStart <= endDate) {
      if (currentWeekStart >= startDate || new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6) >= startDate) {
        weekStartDates.push(new Date(currentWeekStart));
      }
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    const timeSlots = getTimeSlots();
    
    return `
      <style>
        ${getBaseStyles()}
        
        .semester-container {
          margin-bottom: 40px;
          width: 100%;
        }
        
        .week-container {
          margin-bottom: 40px;
          page-break-inside: avoid;
          width: 100%;
        }
        
        .week-title {
          background-color: var(--secondary-color);
          color: white;
          padding: 10px 15px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 6px 6px 0 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        
        th {
          background-color: var(--primary-light);
          color: var(--primary-color);
          text-align: center;
          padding: 12px 15px;
          font-weight: 600;
          border: 1px solid #fff;
        }
        
        th.time-header {
          background-color: var(--secondary-color);
          color: white;
          width: 85px;
        }
        
        td {
          border: 1px solid var(--border-light);
          padding: 8px;
          height: 70px;
          vertical-align: top;
        }
        
        td.time-cell {
          background-color: var(--primary-light);
          color: var(--primary-color);
          font-weight: 600;
          text-align: center;
          vertical-align: middle;
          font-size: 14px;
        }
        
        .event {
          margin: 3px 0;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
          overflow: hidden;
        }
        
        .event-LH {
          background-color: rgba(67, 56, 202, 0.1);
          border-left: 3px solid #4338ca;
        }
        
        .event-PH {
          background-color: rgba(16, 185, 129, 0.1);
          border-left: 3px solid #10b981;
        }
        
        .event-TH {
          background-color: rgba(245, 158, 11, 0.1);
          border-left: 3px solid #f59e0b;
        }
        
        .event-CH {
          background-color: rgba(239, 68, 68, 0.1);
          border-left: 3px solid #ef4444;
        }
        
        .event-title {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .event-time, .event-room {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 3px;
        }
        
        .event-continuation {
          opacity: 0.7;
          font-style: italic;
        }
        
        .week-range {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 5px;
        }
        
        .date-info .semester-dates {
          color: var(--primary-color);
          font-weight: 600;
          font-size: 18px;
        }
        
        .out-of-semester {
          background-color: rgba(0,0,0,0.05);
        }
      </style>
      
      <div class="pdf-container">
        <div class="header">
          <div class="logo-title">
            <div class="logo">MMU</div>
            <div class="title-container">
              <h1>${titleText}</h1>
              <h2>${headerText}</h2>
            </div>
          </div>
          <div class="date-info">
            <p class="semester-dates">${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
            <p>${Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))} days</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="section-header">
            Semester Schedule - Weekly View
          </div>
          
          <div class="semester-container">
            ${weekStartDates.map((weekStart, weekIndex) => {
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              
              const weekNum = weekIndex + 1;
              
              return `
                <div class="week-container">
                  <div class="week-title">
                    Week ${weekNum} 
                    <span class="week-range">(${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})</span>
                  </div>
                  
                  <table>
                    <thead>
                      <tr>
                        <th class="time-header">Time</th>
                        ${daysOfWeek.map(day => `<th>${day}</th>`).join('')}
                      </tr>
                    </thead>
                    <tbody>
                      ${timeSlots.map(time => {
                        const weekDates = [];
                        for (let i = 0; i < 7; i++) {
                          const date = new Date(weekStart);
                          date.setDate(date.getDate() + i);
                          weekDates.push(date);
                        }
                        
                        return `
                          <tr>
                            <td class="time-cell">${time}</td>
                            ${daysOfWeek.map((day, dayIndex) => {
                              const date = weekDates[dayIndex];
                              const inSemester = date >= startDate && date <= endDate;
                              
                              const eventsAtTime = events.filter(event => 
                                event.day === day && 
                                convertTimeToMinutes(event.startTime) <= convertTimeToMinutes(time) && 
                                convertTimeToMinutes(event.endTime) > convertTimeToMinutes(time)
                              );
                              
                              if (eventsAtTime.length === 0) {
                                return `<td class="${!inSemester ? 'out-of-semester' : ''}"></td>`;
                              } 
                              
                              return `
                                <td class="${!inSemester ? 'out-of-semester' : ''}">
                                  ${eventsAtTime.map(event => {
                                    const isStartTime = event.startTime === time;
                                    
                                    return `
                                      <div class="event event-${event.sessionType} ${!isStartTime ? 'event-continuation' : ''}">
                                        ${isStartTime ? `
                                          <div class="event-title">${event.title}</div>
                                          <div class="event-time">${event.startTime} - ${event.endTime}</div>
                                          <div class="event-room">${event.room}</div>
                                        ` : `
                                          <div>• ${event.title} (cont.)</div>
                                        `}
                                      </div>
                                    `;
                                  }).join('')}
                                </td>
                              `;
                            }).join('')}
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} MMU University. All rights reserved.</p>
        </div>
      </div>
    `;
  };

  // Generate CSV content for the schedule
  const generateCSV = (events) => {
    const headers = ['Course', 'Course Code', 'Day', 'Start Time', 'End Time', 'Room', 'Lecturer', 'Session Type'];
    
    // Start with headers
    let csvContent = headers.join(',') + '\r\n';
    
    // Filter events based on current view
    let filteredEvents = [...events];
    
    if (currentView === 'day') {
      // Get the day of the week for the current date
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
      // Filter events for this day
      filteredEvents = events.filter(event => event.day === dayOfWeek);
    }
    
    // Sort by day and time
    filteredEvents.sort((a, b) => {
      // First sort by day
      const dayOrder = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
      if (dayOrder !== 0) return dayOrder;
      
      // Then by start time
      return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
    });
    
    // Add event data
    filteredEvents.forEach(event => {
      const row = [
        `"${event.title.replace(/"/g, '""')}"`, // Escape quotes in CSV
        `"${event.courseCode}"`,
        event.day,
        event.startTime,
        event.endTime,
        `"${event.room}"`,
        `"${event.lecturer}"`,
        getSessionTypeBadge(event.sessionType).label
      ];
      
      csvContent += row.join(',') + '\r\n';
    });
    
    return csvContent;
  };

  // Generate HTML content for the semester schedule
  const generateHTML = (events) => {
    const startDate = new Date(semesterDates.startDate);
    const endDate = new Date(semesterDates.endDate);
    
    // Get HTML title and header
    const titleText = `${selectedDepartment || userDepartment} ${programType.charAt(0).toUpperCase() + programType.slice(1)} Program Schedule`;
    const headerText = `Semester: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    
    // CSS styles for HTML output
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        h1 { color: #2563eb; }
        h2 { color: #4b5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .month-container { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; }
        .event-LH { background-color: #dbeafe; border-left: 4px solid #3b82f6; }
        .event-PH { background-color: #dcfce7; border-left: 4px solid #22c55e; }
        .event-TH { background-color: #fef9c3; border-left: 4px solid #eab308; }
        .event-CH { background-color: #fee2e2; border-left: 4px solid #ef4444; }
        .event-time { font-weight: bold; }
        .event-room { color: #4b5563; }
        .event-lecturer { font-style: italic; color: #6b7280; }
        @media print {
          body { font-size: 12px; }
          h1 { font-size: 18px; }
          h2 { font-size: 16px; }
          .pagebreak { page-break-before: always; }
        }
      </style>
    `;
    
    // Start building HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${titleText}</title>
        ${styles}
      </head>
      <body>
        <h1>${titleText}</h1>
        <h2>${headerText}</h2>
    `;
    
    // Get all months in the semester
    const months = [];
    let currentMonth = new Date(startDate);
    
    while (currentMonth <= endDate) {
      months.push(new Date(currentMonth));
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    // Generate tables for each month
    months.forEach((month, index) => {
      if (index > 0) {
        htmlContent += '<div class="pagebreak"></div>';
      }
      
      const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      htmlContent += `
        <div class="month-container">
          <h2>${monthName}</h2>
      `;
      
      // Generate a table for each day of the week
      daysOfWeek.forEach(day => {
        const dayEvents = events.filter(event => event.day === day);
        
        if (dayEvents.length > 0) {
          htmlContent += `
            <h3>${day}</h3>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Course</th>
                  <th>Session Type</th>
                  <th>Room</th>
                  <th>Lecturer</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          // Sort events by start time
          dayEvents.sort((a, b) => {
            return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
          });
          
          // Add events
          dayEvents.forEach(event => {
            const sessionType = getSessionTypeBadge(event.sessionType);
            htmlContent += `
              <tr class="event-${event.sessionType}">
                <td class="event-time">${event.startTime} - ${event.endTime}</td>
                <td>${event.title} (${event.courseCode})</td>
                <td>${sessionType.label}</td>
                <td class="event-room">${event.room}</td>
                <td class="event-lecturer">${event.lecturer}</td>
              </tr>
            `;
          });
          
          htmlContent += `
              </tbody>
            </table>
          `;
        }
      });
      
      htmlContent += '</div>';
    });
    
    // Close HTML
    htmlContent += `
      </body>
      </html>
    `;
    
    return htmlContent;
  };

  // Helper function to filter events based on program type and other criteria
  const filterSchedules = () => {
    let filtered = [...scheduleEvents];
    
    // Filter by program type (day or evening)
    filtered = filtered.filter(event => event.programType === programType);
    
    // Filter by user role and department if not 'all'
    if (userRole === 'hod') {
      filtered = filtered.filter(event => 
        event.department === userDepartment || event.isCrossCutting
      );
    }
    
    // Filter by program if selected and not 'all'
    if (selectedProgram !== 'all') {
      filtered = filtered.filter(event => 
        event.programId === selectedProgram || 
        (event.isCrossCutting && event.crossCuttingPrograms?.includes(selectedProgram))
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.courseCode.toLowerCase().includes(query) ||
        event.lecturer.toLowerCase().includes(query) ||
        event.room.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Generate events for the calendar view
  const generateEvents = () => {
    // Get filtered events based on current filters
    const filteredEvents = filterSchedules();
    
    return filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      courseId: event.courseId,
      courseCode: event.courseCode || 'Unknown',
      lecturer: event.lecturer || 'Not Assigned',
      room: event.room || 'TBA',
      day: daysOfWeek[event.dayOfWeek - 1],
      startTime: event.startTime,
      endTime: event.endTime,
      isCrossCutting: event.isCrossCutting,
      department: event.department,
      sessionType: event.sessionType || 'LH',
      programType: event.programType
    }));
  };

  // Get event position on the timetable grid
  const getEventPosition = (event) => {
    const startMins = convertTimeToMinutes(event.startTime);
    const endMins = convertTimeToMinutes(event.endTime);
    
    // Get first time slot for calculating the offset
    const timeSlots = getTimeSlots();
    const firstSlotTime = convertTimeToMinutes(timeSlots[0]); // e.g., 8 * 60 = 480
    
    // Define the scale: pixels per minute
    const pixelsPerHour = 80; // Height of each hour slot in the grid
    const minutesPerHour = 60;
    const pixelsPerMinute = pixelsPerHour / minutesPerHour; // 80 / 60 = 4/3
    
    // Calculate top position relative to the start of the grid (firstSlotTime)
    const top = (startMins - firstSlotTime) * pixelsPerMinute;
    
    // Calculate height based on event duration
    const durationMinutes = Math.max(1, endMins - startMins); // Ensure at least 1 minute duration
    const height = durationMinutes * pixelsPerMinute;
    
    return {
      top: `${Math.max(top, 0)}px`,
      height: `${Math.max(height, 20)}px` // Minimum height of 20px
    };
  };

  // Get the session type badge style
  const getSessionTypeBadge = (sessionType) => {
    // Different colors and labels for different session types
    switch(sessionType) {
      case 'LH':
        return {
          label: 'Lecture',
          class: darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-100 text-blue-700',
          bgFull: darkMode ? 'bg-blue-600' : 'bg-blue-500',
          textFull: 'text-white'
        };
      case 'PH':
        return {
          label: 'Practical',
          class: darkMode ? 'bg-green-900/20 text-green-300' : 'bg-green-100 text-green-700',
          bgFull: darkMode ? 'bg-green-600' : 'bg-green-500',
          textFull: 'text-white'
        };
      case 'TH':
        return {
          label: 'Tutorial',
          class: darkMode ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-100 text-amber-700',
          bgFull: darkMode ? 'bg-amber-500' : 'bg-amber-500',
          textFull: 'text-white'
        };
      default:
        return {
          label: 'Other',
          class: darkMode ? 'bg-gray-900/20 text-gray-300' : 'bg-gray-100 text-gray-700',
          bgFull: darkMode ? 'bg-gray-600' : 'bg-gray-500',
          textFull: 'text-white'
        };
    }
  };

  // Render the timetable view
  const renderTimetableView = () => {
    // Get events filtered for the current view
    const events = generateEvents();

    // Render different views based on the currentView state
    switch(currentView) {
      case 'day':
        return renderDayView(events);
      case 'month':
        return renderMonthView(events);
      case 'semester':
        return renderSemesterView(events);
      case 'week':
      default:
        return renderWeekView(events);
    }
  };

  // Calculate events that occur at the same time
  const groupOverlappingEvents = (events, day) => {
    // Filter events for the specific day
    const dayEvents = events.filter(event => event.day === day);
    
    // Sort events by start time
    dayEvents.sort((a, b) => convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime));
    
    // Group events that overlap
    const timeGroups = [];
    
    for (const event of dayEvents) {
      const startTime = convertTimeToMinutes(event.startTime);
      const endTime = convertTimeToMinutes(event.endTime);
      
      // Find group that overlaps with this event
      let foundGroup = false;
      
      for (const group of timeGroups) {
        // Check if this event overlaps with any event in the group
        const overlaps = group.some(groupEvent => {
          const groupStartTime = convertTimeToMinutes(groupEvent.startTime);
          const groupEndTime = convertTimeToMinutes(groupEvent.endTime);
          
          return (startTime < groupEndTime && groupStartTime < endTime);
        });
        
        if (overlaps) {
          group.push({ ...event });
          foundGroup = true;
          break;
        }
      }
      
      // If no overlapping group was found, create a new group
      if (!foundGroup) {
        timeGroups.push([{ ...event }]);
      }
    }
    
    // Return the grouped events with positioning information
    return timeGroups.map(group => {
      return group.map((event, index) => {
        return {
          ...event,
          width: `${100 / group.length}%`,
          left: `${(index * 100) / group.length}%`,
          zIndex: index + 1,
          totalInGroup: group.length
        };
      });
    }).flat();
  };

  // Render day view (single day with hourly slots)
  const renderDayView = (events) => {
    // Get the day of the week for the current date
    const dayOfWeek = daysOfWeek[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1];
    
    // Get events for this day with overlapping info
    const dayEventsWithPosition = groupOverlappingEvents(events, dayOfWeek);
    
    // Current time indicator
    const now = new Date();
    const isToday = now.toDateString() === currentDate.toDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimePosition = (currentHour * 60 + currentMinute) / 1440 * 100; // Position as percentage

    return (
      <div className={`rounded-lg overflow-hidden border shadow-sm ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`py-3 px-4 font-medium ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        } border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentView('week')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Week
              </button>
              <button 
                onClick={() => setCurrentView('month')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-[60px_1fr] relative">
          {/* Time indicators */}
          <div className={`${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
            {getTimeSlots().map((time) => (
              <div 
                key={time} 
                className={`h-20 text-xs font-medium flex items-center justify-center border-b ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <span>{time}</span>
            </div>
            ))}
          </div>

          {/* Events container */}
          <div className={`relative bg-white ${darkMode ? 'bg-gray-900' : ''}`}>
            {/* Hour grid lines */}
            {getTimeSlots().map((time) => (
              <div 
                key={`grid-${time}`}
                className={`absolute w-full h-20 border-b ${
                  darkMode ? 'border-gray-700/50' : 'border-gray-200'
                }`}
                style={{ top: `${getTimeSlots().indexOf(time) * 80}px` }}
              />
            ))}
            
            {/* Current time indicator - only shown if today */}
            {isToday && (
              <div 
                className="absolute w-full z-10 flex items-center"
                style={{ top: `${currentTimePosition * 19.2}px` }} // 19.2 = 1440min / 24h * 80px per hour / 60min
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                <div className="flex-1 h-[1px] bg-red-500"></div>
              </div>
            )}
            
            {/* Events */}
            {dayEventsWithPosition.map(event => {
              const courseColor = getCourseColor(event.courseId);
              
              // Calculate position based on time
              const position = getEventPosition(event);
                    
                    return (
                      <div 
                        key={event.id}
                  className={`absolute p-2 rounded-md text-xs border-l-4 shadow-sm hover:shadow-md transition-shadow ${courseColor.bg} ${courseColor.border} ${courseColor.text}`}
                  style={{
                    ...position,
                    width: event.width || 'calc(100% - 8px)',
                    left: event.left || '4px',
                    zIndex: event.zIndex || 1
                  }}
                  onClick={() => handleViewEvent(event)}
                >
                  <div className="font-medium truncate">
                    <span className="text-sm font-bold">
                      {event.courseCode}
                    </span>
                    <span className={`ml-2 text-xs px-1 py-0.5 rounded-sm ${darkMode ? 'bg-opacity-20' : 'bg-opacity-10'} font-medium`}>
                            {getSessionTypeBadge(event.sessionType).label}
                          </span>
                        </div>
                  <div className="mt-1 text-xs">
                    <span className="font-medium">{event.room}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="italic truncate">{event.lecturer}</span>
                          <span>{event.startTime}-{event.endTime}</span>
                        </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event.id);
                            }}
                    className={`absolute top-1 right-1 text-xs w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-opacity-70 ${
                      darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            ×
                          </button>
                      </div>
                    );
                  })}
              </div>
        </div>
      </div>
    );
  };

  // Add this function right before renderWeekView
  const getFormattedDateRange = () => {
    // Get the first day of the week (Monday)
    const firstDay = new Date(currentDate);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay() + 1);
    
    // Get the last day of the week (Sunday)
    const lastDay = new Date(firstDay);
    lastDay.setDate(lastDay.getDate() + 6);
    
    // Format the dates
    const firstMonth = firstDay.toLocaleDateString('en-US', { month: 'short' });
    const lastMonth = lastDay.toLocaleDateString('en-US', { month: 'short' });
    
    // If the week spans two months, show both
    if (firstMonth === lastMonth) {
      return `${firstMonth} ${firstDay.getDate()}-${lastDay.getDate()}, ${firstDay.getFullYear()}`;
    } else {
      return `${firstMonth} ${firstDay.getDate()} - ${lastMonth} ${lastDay.getDate()}, ${lastDay.getFullYear()}`;
    }
  };

  // Render week view (days of the week with hourly slots)
  const renderWeekView = (events) => {
    const timeSlots = getTimeSlots();
    
    // Get the days in the current week
    const weekDays = [];
    const weekStart = new Date(currentDate);
    // Adjust to start of week (Monday)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    
    // Current time indicator
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimePosition = (currentHour * 60 + currentMinute) / 1440 * 100; // Position as percentage
    // Generate the days of the week
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      weekDays.push({
        date: day,
        dayOfWeek: daysOfWeek[i],
        isToday: day.toDateString() === now.toDateString()
      });
    }

    return (
      <div className={`rounded-lg overflow-hidden border shadow-sm ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-4 py-3 ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        } border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {getFormattedDateRange()}
            </h2>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentView('day')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Day
              </button>
              <button 
                onClick={() => setCurrentView('month')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>
        
        {/* Days of week header */}
        <div className={`grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] ${
          darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-800 border-gray-200'
        } border-b`}>
          <div className={`p-2 text-center text-xs font-medium ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            GMT+03
          </div>
          
          {weekDays.map((day) => (
            <div 
              key={day.dayOfWeek} 
              className={`p-2 text-center border-l ${
                day.isToday 
                  ? (darkMode ? 'bg-blue-900/10 border-blue-800' : 'bg-blue-50 border-blue-100') 
                  : (darkMode ? 'border-gray-700' : 'border-gray-200')
              }`}
              onClick={() => {
                setCurrentDate(day.date);
                setCurrentView('day');
              }}
            >
              <div className={`text-sm font-medium ${
                day.isToday 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-white' : 'text-gray-800')
              }`}>
                {day.dayOfWeek}
              </div>
              <div className={`flex flex-col items-center ${
                day.isToday 
                  ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                  : (darkMode ? 'text-gray-400' : 'text-gray-500')
              }`}>
                <div className={`text-lg font-semibold p-1 w-9 h-9 flex items-center justify-center ${
                  day.isToday ? 'rounded-full bg-blue-600 text-white' : ''
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="text-xs">
                  {day.date.toLocaleDateString('en-US', { month: 'short' })}
                </div>
              </div>
              </div>
            ))}
          </div>

        {/* Main grid */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] relative">
          {/* Time slots */}
          <div className={`${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
            {timeSlots.map((time) => (
              <div 
                key={time} 
                className={`h-20 text-xs font-medium flex items-center justify-center border-b ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <span>{time}</span>
              </div>
            ))}
          </div>
          
          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            // Group events that happen on this day and calculate positioning
            const dayEventsWithPosition = groupOverlappingEvents(events, day.dayOfWeek);

                return (
                  <div 
                key={day.dayOfWeek} 
                className={`relative border-l ${
                  day.isToday
                    ? (darkMode ? 'bg-gray-900/30 border-blue-800' : 'bg-blue-50/30 border-blue-100')
                    : (darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white')
                } ${dayIndex < 6 ? (darkMode ? 'border-r border-gray-700' : 'border-r border-gray-200') : ''}`}
              >
                {/* Hour grid lines */}
                {timeSlots.map((time) => (
                  <div 
                    key={`grid-${day.dayOfWeek}-${time}`}
                    className={`absolute w-full h-20 border-b ${
                      darkMode ? 'border-gray-700/50' : 'border-gray-200'
                    }`}
                    style={{ top: `${timeSlots.indexOf(time) * 80}px` }}
                  />
                ))}
                
                {/* Current time indicator - only shown if today */}
                {day.isToday && (
                  <div 
                    className="absolute w-full z-10 flex items-center"
                    style={{ top: `${currentTimePosition * 19.2}px` }} // 19.2 = 1440min / 24h * 80px per hour / 60min
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                    <div className="flex-1 h-[1px] bg-red-500"></div>
                  </div>
                )}
                
                {/* Events */}
                {dayEventsWithPosition.map(event => {
                  const courseColor = getCourseColor(event.courseId);
                  const sessionType = getSessionTypeBadge(event.sessionType);
                  
                  // Calculate position
                  const position = getEventPosition(event);
                      
                      return (
                        <div 
                          key={event.id}
                      className={`absolute p-2 rounded-md text-xs border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${courseColor.bg} ${courseColor.border} ${courseColor.text}`}
                      style={{
                        ...position,
                        width: event.width || 'calc(100% - 8px)',
                        left: event.left || '4px',
                        zIndex: event.zIndex || 1
                      }}
                      onClick={() => handleViewEvent(event)}
                    >
                      <div className="font-bold truncate mb-1">
                        {event.courseCode || event.title}
                        <span className={`ml-1.5 text-xs px-1 py-0.5 rounded-sm ${sessionType.class}`}>
                          {sessionType.label}
                        </span>
                      </div>
                      <div className="text-xs flex items-center mb-0.5">
                        <Home className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{event.room || 'TBA'}</span>
                      </div>
                      <div className="text-xs flex items-center">
                        <User className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="italic truncate">{event.lecturer || 'Not Assigned'}</span>
                      </div>
                      
                      {/* Remove delete button from here for cleaner look, deletion handled in modal */}
                      {/* 
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                        className={`absolute top-1 right-1 text-xs w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-opacity-70 ${
                          darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        ×
                      </button>
                      */}
                    </div>
                  );
                })}
                  </div>
                );
              })}
        </div>
      </div>
    );
  };

  // Render month view (calendar style month)
  const renderMonthView = (events) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    // Get number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get day of week of first day (0-6, where 0 is Sunday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Create array of day numbers for the month view
    const days = Array.from({ length: 42 }, (_, i) => {
      const day = i - firstDayOfWeek + 1;
      if (day <= 0 || day > daysInMonth) return null;
      return day;
    });
    
    // Days of week header for month view
    const calendarDaysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // Today's date for highlighting
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDate = today.getDate();

    return (
      <div className={`rounded-lg overflow-hidden border shadow-sm ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-4 py-3 ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        } border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentView('day')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Day
              </button>
              <button 
                onClick={() => setCurrentView('week')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
        
        {/* Days of week header */}
        <div className={`grid grid-cols-7 ${
          darkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-white text-gray-500 border-gray-200'
        } border-b`}>
          {calendarDaysOfWeek.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            if (day === null) {
              return (
                <div key={`empty-${index}`} className={`min-h-[100px] ${
                  darkMode ? 'bg-gray-900/50 text-gray-600' : 'bg-gray-50/50 text-gray-400'
                } border-b border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
              );
            }
            
            // Get date for this cell
            const date = new Date(year, month, day);
            // Get day of week for this date
            const dayOfWeek = daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Convert from Sunday=0 to Monday=0
            
            // Get events for this day
            const dayEvents = events.filter(event => {
              // If recurring, check day of week
              if (event.isRecurring) {
                return event.day === dayOfWeek;
              }
              
              // If not recurring, would need to check the exact date
              // (this would require enhancing the event data model to include exact dates)
              return event.day === dayOfWeek;
            });
            
            // Check if today
            const isToday = isCurrentMonth && day === todayDate;
            
            return (
              <div 
                key={`day-${day}`} 
                className={`min-h-[100px] p-1 ${
                  isToday 
                    ? (darkMode ? 'bg-blue-900/10 border-blue-800' : 'bg-blue-50 border-blue-100') 
                    : (darkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-50')
                } border-r border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-colors`}
                onClick={() => {
                  const newDate = new Date(year, month, day);
                  setCurrentDate(newDate);
                  setCurrentView('day');
                }}
              >
                <div className={`flex items-center justify-between mb-1`}>
                  <div className={`text-sm font-medium ${
                  isToday 
                      ? (darkMode ? 'text-blue-400' : 'text-blue-600') 
                    : (darkMode ? 'text-gray-300' : 'text-gray-700')
                }`}>
                  {day}
                  </div>
                  {/* Optional: Add small month indicator for first/last day */}
                  {day === 1 && (
                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {currentDate.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  )}
                </div>
                
                {/* Events list - limited to prevent overflow */}
                <div className="space-y-1 overflow-hidden max-h-[80px]">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => {
                      const sessionType = getSessionTypeBadge(event.sessionType);
                      const courseColor = getCourseColor(event.courseId);
                      
                      return (
                        <div 
                          key={`${event.id}-${eventIndex}`}
                          className={`text-xs px-1.5 py-0.5 rounded-sm truncate border-l-2 ${courseColor.bg} ${courseColor.text} ${courseColor.border}`}
                          title={`${event.title} (${event.courseCode || ''}) - ${event.startTime}-${event.endTime} - ${sessionType.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewEvent(event);
                          }}
                        >
                          <span className="font-medium">{event.startTime}</span> {event.courseCode || event.title}
                        </div>
                      );
                    })}
                    
                    {dayEvents.length > 3 && (
                    <div className={`text-xs text-center py-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render semester view (showing all months in the semester)
  const renderSemesterView = (events) => {
    // Parse semester start and end dates
    const startDate = new Date(semesterDates.startDate);
    const endDate = new Date(semesterDates.endDate);
    
    // Get all months in the semester
    const months = [];
    let currentMonth = new Date(startDate);
    
    while (currentMonth <= endDate) {
      months.push({
        date: new Date(currentMonth),
        name: currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    // Group events by day
    const eventsByDay = {};
    
    daysOfWeek.forEach(day => {
      eventsByDay[day] = events.filter(event => event.day === day)
        .sort((a, b) => convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime));
    });
              
            return (
      <div className={`rounded-lg overflow-hidden border shadow-sm ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-4 py-3 ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        } border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Semester Overview: {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h2>
            <div className="flex gap-1">
                  <button 
                onClick={() => setCurrentView('day')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Day
                  </button>
              <button 
                onClick={() => setCurrentView('week')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Week
              </button>
              <button 
                onClick={() => setCurrentView('month')}
                className={`px-2 py-1 text-xs rounded-md ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Month
              </button>
                        </div>
          </div>
                </div>
                
        <div className={`p-4 grid grid-cols-1 gap-6 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                  {daysOfWeek.map(day => {
            const dayEvents = eventsByDay[day];
                    
            if (!dayEvents.length) return null;
                    
                    return (
              <div key={day} className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {day}
                </h3>
                <div className="space-y-2">
                          {dayEvents.map(event => {
                    const courseColor = getCourseColor(event.courseId);
                            const sessionType = getSessionTypeBadge(event.sessionType);
                            
                            return (
                              <div 
                                key={event.id}
                        className={`p-3 rounded-md flex items-center gap-3 cursor-pointer ${
                          darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'
                        } border ${darkMode ? 'border-gray-600' : 'border-gray-200'} shadow-sm transition-colors`}
                        onClick={() => handleViewEvent(event)}
                      >
                        <div className={`w-2 h-12 rounded-full ${courseColor.border}`}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {event.courseCode}: {event.title}
                                </div>
                            <div className={`text-xs px-2 py-0.5 rounded-full ${
                              darkMode ? 'bg-gray-800' : 'bg-gray-100'
                            } ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {event.startTime} - {event.endTime} <span className={`ml-1 px-1.5 py-0.5 rounded-sm text-xs font-medium ${sessionType.class}`}>{sessionType.label}</span>
                                </div>
                              </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Room: {event.room}
                            </span>
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {event.lecturer}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render unscheduled lectures
  const renderUnscheduledView = () => {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 mt-4 shadow-md`}>
        <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Unscheduled Lectures
        </h3>
        
        {unscheduledLectures.length === 0 ? (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            All lectures have been scheduled. Good job!
          </p>
        ) : (
          <div className="space-y-4">
            {unscheduledLectures.map((lecture) => {
              return (
                <div key={lecture.id} 
                  className={`p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex justify-between">
                    <div>
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{lecture.name}</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {lecture.code} · {lecture.department}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentEvent({
                          ...currentEvent,
                          courseId: lecture.id,
                          title: lecture.name,
                          lecturerId: courses.find(c => c.id === lecture.id)?.lecturer || '',
                          sessionType: 'LH',
                          programType
                        });
                        setShowAddEventModal(true);
                      }}
                      className={`px-3 py-1 rounded-md text-sm ${
                        darkMode 
                          ? 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400' 
                          : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                  <div className="flex items-center mt-2 gap-2">
                    <div className={`px-2 py-0.5 rounded text-xs ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {lecture.lecturer}
                    </div>
                    {lecture.isCrossCutting && (
                      <div className={`px-2 py-0.5 rounded text-xs ${
                        darkMode ? 'bg-purple-900/20 text-purple-400' : 'bg-purple-100 text-purple-800'
                      }`}>
                        Cross-Cutting
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Helper to check time conflicts
  const checkTimeConflict = (event1, event2) => {
    // Same day check
    if (event1.dayOfWeek !== event2.dayOfWeek) return false;
    
    // Time overlap check
    const start1 = convertTimeToMinutes(event1.startTime);
    const end1 = convertTimeToMinutes(event1.endTime);
    const start2 = convertTimeToMinutes(event2.startTime);
    const end2 = convertTimeToMinutes(event2.endTime);
    
    return (start1 < end2 && start2 < end1);
  };

  // Convert time to minutes for comparison
  const convertTimeToMinutes = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return 0;
    
    // Handle various time formats: "09:00", "9:00"
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  // Check for scheduling conflicts
  const checkSchedulingConflicts = (newEvent) => {
    const conflicts = [];
    
    for (const existingEvent of scheduleEvents.filter(e => e.programType === programType)) {
      // Check if this is a date-specific conflict (both events must have a specific date)
      const dateSpecificCheck = newEvent.eventDate && existingEvent.eventDate && 
                              newEvent.eventDate === existingEvent.eventDate;
      
      // Check if this is a recurring day-of-week conflict
      const dayOfWeekCheck = existingEvent.dayOfWeek === parseInt(newEvent.dayOfWeek);
      
      // For non-recurring events, we only check specific date conflicts
      // For recurring events, we check day of week conflicts
      const shouldCheckConflict = 
        (newEvent.isRecurring && existingEvent.isRecurring && dayOfWeekCheck) || // Both recurring, same day of week
        (!newEvent.isRecurring && !existingEvent.isRecurring && dateSpecificCheck) || // Both non-recurring, same date
        (newEvent.isRecurring && !existingEvent.isRecurring && dayOfWeekCheck && dateSpecificCheck) || // New is recurring, existing is not, but on same day/date
        (!newEvent.isRecurring && existingEvent.isRecurring && dayOfWeekCheck && dateSpecificCheck); // New is not recurring, existing is, but on same day/date
      
      if (shouldCheckConflict && checkTimeConflict(existingEvent, newEvent)) {
        // 1. Check for lecturer conflict - same lecturer teaching two different courses at the same time
        if (existingEvent.lecturerId && newEvent.lecturerId && existingEvent.lecturerId === newEvent.lecturerId) {
          // Find lecturer name for better error message
          const lecturerName = lecturers.find(l => l.id === newEvent.lecturerId)?.name || 'Unknown lecturer';
          
          conflicts.push({
            type: 'lecturer',
            message: `Lecturer ${lecturerName} already has a class (${existingEvent.courseName}) during this time${newEvent.isRecurring ? ' (recurring weekly)' : ' on ' + new Date(newEvent.eventDate).toLocaleDateString()}.`,
            severity: 'error', // Cannot proceed with this conflict
            event: existingEvent
          });
        }
        
        // 2. Check for student group conflict - same year/semester students having multiple classes
        // First, get course details to compare year and semester
        const newCourse = courses.find(c => c.id === newEvent.courseId);
        const existingCourse = courses.find(c => c.id === existingEvent.courseId);
        
        if (newCourse && existingCourse && 
            newCourse.programId === existingCourse.programId && 
            newCourse.yearOfStudy === existingCourse.yearOfStudy && 
            newCourse.semester === existingCourse.semester) {
          
          conflicts.push({
            type: 'student',
            message: `Students in Year ${newCourse.yearOfStudy}, Semester ${newCourse.semester} of ${programsList.find(p => p.id === newCourse.programId)?.name || 'Unknown Program'} have another class (${existingCourse.name}) scheduled at this time.`,
            severity: 'error', // Cannot proceed with this conflict
            event: existingEvent
          });
        }
        
        // 3. Check for room conflict - but allow scheduling without a room
        if (newEvent.roomId && existingEvent.roomId && newEvent.roomId === existingEvent.roomId) {
          // Find room name for better error message
          const roomName = rooms.find(r => r.id === newEvent.roomId)?.name || 'Unknown room';
          
          conflicts.push({
            type: 'room',
            message: `Room ${roomName} is already booked for ${existingEvent.courseName} during this time${newEvent.isRecurring ? ' (recurring weekly)' : ' on ' + new Date(newEvent.eventDate).toLocaleDateString()}.`,
            severity: 'error', // Cannot proceed with this conflict
            event: existingEvent
          });
        }
      }
    }
    
    return conflicts;
  };

  // View for collision alerts
  const renderCollisionAlerts = () => {
    if (collisions.length === 0) return null;
    
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 mt-4 shadow-md`}>
        <h3 className={`text-lg font-medium mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <span>Scheduling Conflicts</span>
        </h3>
        
        <div className="space-y-3">
          {collisions.map((alert, index) => (
            <div key={index} 
              className={`p-4 rounded-lg ${
                alert.type === 'lecturer' 
                  ? (darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-100') 
                  : alert.type === 'room'
                  ? (darkMode ? 'bg-yellow-900/20 border border-yellow-800/30' : 'bg-yellow-50 border border-yellow-100')
                  : (darkMode ? 'bg-orange-900/20 border border-orange-800/30' : 'bg-orange-50 border border-orange-100')
              }`}
            >
              <div className="flex items-start gap-3">
                {alert.type === 'lecturer' && <UserX className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />}
                {alert.type === 'room' && <Home className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />}
                {alert.type === 'course' && <Users className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />}
                
                <div>
                  <h4 className={`font-medium ${
                    alert.type === 'lecturer' 
                      ? (darkMode ? 'text-red-400' : 'text-red-700')
                      : alert.type === 'room'
                      ? (darkMode ? 'text-yellow-400' : 'text-yellow-700')
                      : (darkMode ? 'text-orange-400' : 'text-orange-700')
                  }`}>
                    {alert.type === 'lecturer' && 'Lecturer Schedule Conflict'}
                    {alert.type === 'room' && 'Room Double-Booking'}
                    {alert.type === 'course' && 'Student Group Conflict'}
                  </h4>
                  
                  <p className={`text-sm ${
                    alert.type === 'lecturer' 
                      ? (darkMode ? 'text-red-300' : 'text-red-600')
                      : alert.type === 'room'
                      ? (darkMode ? 'text-yellow-300' : 'text-yellow-600')
                      : (darkMode ? 'text-orange-300' : 'text-orange-600')
                  }`}>
                    {alert.message}
                  </p>
                  
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        // Show modal to resolve conflict
                        preventDuplicateToast(() => {
                          toast.success("Conflict resolution assistant would open here");
                        });
                      }}
                      className={`text-xs px-3 py-1 rounded-md ${
                        alert.type === 'lecturer' 
                          ? (darkMode ? 'bg-red-900/30 hover:bg-red-900/40 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-700')
                          : alert.type === 'room'
                          ? (darkMode ? 'bg-yellow-900/30 hover:bg-yellow-900/40 text-yellow-400' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700')
                          : (darkMode ? 'bg-orange-900/30 hover:bg-orange-900/40 text-orange-400' : 'bg-orange-100 hover:bg-orange-200 text-orange-700')
                      }`}
                    >
                      Resolve Conflict
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    if (field === 'courseId') {
      const selectedCourse = courses.find(c => c.id === value);
      setCurrentEvent(prev => ({
        ...prev,
        [field]: value,
        title: selectedCourse ? selectedCourse.name : '',
        lecturerId: selectedCourse && selectedCourse.lecturer ? selectedCourse.lecturer : '',
        // Set cross-cutting properties from the selected course
        isCrossCutting: selectedCourse ? selectedCourse.isCrossCutting || false : false,
        crossCuttingPrograms: selectedCourse && selectedCourse.crossCuttingPrograms ? 
          selectedCourse.crossCuttingPrograms : [],
        crossCuttingDepartments: selectedCourse && selectedCourse.crossCuttingDepartments ? 
          selectedCourse.crossCuttingDepartments : []
      }));
    } else if (field === 'eventDate' && value) {
      // When date is selected, automatically set the day of week
      const date = new Date(value);
      const dayOfWeek = date.getDay() || 7; // Convert 0 (Sunday) to 7 for consistency
      
      setCurrentEvent(prev => ({
        ...prev,
        eventDate: value,
        dayOfWeek: dayOfWeek.toString()
      }));
    } else {
      setCurrentEvent(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Save event to Firestore
  const handleAddEvent = async () => {
    // Validate required fields
    if (!currentEvent.courseId || !currentEvent.startTime || 
        !currentEvent.endTime || !currentEvent.sessionType || !currentEvent.dayOfWeek || !currentEvent.eventDate) {
      preventDuplicateToast(() => {
        toast.error('Please fill all required fields');
      });
      return;
    }
    
    // Validate that the event date is within the semester date range
    const eventDate = new Date(currentEvent.eventDate);
    const semStartDate = new Date(semesterDates.startDate);
    const semEndDate = new Date(semesterDates.endDate);
    
    if (eventDate < semStartDate || eventDate > semEndDate) {
      preventDuplicateToast(() => {
        toast.error(`Event date must be within the semester date range (${semesterDates.startDate} to ${semesterDates.endDate})`);
      });
      return;
    }
    
    // For HoD role, ensure they can only schedule lectures for their department
    if (userRole === 'hod') {
      const selectedCourse = courses.find(c => c.id === currentEvent.courseId);
      
      // Get department of the selected course
      const courseDepartment = selectedCourse?.department || '';
      const isCrossCutting = selectedCourse?.isCrossCutting || false;
      
      // Check if course belongs to the HoD's department or is cross-cutting
      if (!isCrossCutting && courseDepartment !== userDepartment) {
        preventDuplicateToast(() => {
          toast.error(`As a Head of Department, you can only schedule lectures for courses in your department (${userDepartment}) or cross-cutting courses.`);
        });
        return;
      }
    }
    
    // Check for scheduling conflicts
    const conflicts = checkSchedulingConflicts(currentEvent);
    if (conflicts.length > 0) {
      // Filter for error-level conflicts that should prevent scheduling
      const errorConflicts = conflicts.filter(c => c.severity === 'error');
      
      if (errorConflicts.length > 0) {
        // Show each error conflict as a separate toast
        errorConflicts.forEach(conflict => {
          preventDuplicateToast(() => {
            toast.error(conflict.message);
          });
        });
        
        // Set collisions for display in UI
        setCollisions(conflicts);
        
        // Don't proceed with scheduling
        return;
      }
      
      // For warning-level conflicts, show warnings but allow scheduling to proceed
      const warningConflicts = conflicts.filter(c => c.severity !== 'error');
      if (warningConflicts.length > 0) {
        warningConflicts.forEach(conflict => {
          preventDuplicateToast(() => {
            toast.warning(conflict.message);
          });
        });
      }
      
      // Set all conflicts for display in UI
      setCollisions(conflicts);
    }
    
    try {
      const selectedCourse = courses.find(c => c.id === currentEvent.courseId);
      const selectedRoom = rooms.find(r => r.id === currentEvent.roomId);
      const selectedLecturer = lecturers.find(l => l.id === currentEvent.lecturerId);
      
      // Get selected program
      const programId = selectedProgram !== 'all' ? selectedProgram : 
                      (selectedCourse?.programId || '');

      // Create a new schedule event
      const newEvent = {
        title: currentEvent.title,
        courseId: currentEvent.courseId,
        courseName: selectedCourse?.name || '',
        courseCode: selectedCourse?.code || '',
        lecturerId: currentEvent.lecturerId,
        lecturer: selectedLecturer?.name || 'Not Assigned',
        roomId: currentEvent.roomId,
        room: selectedRoom?.name || '',
        dayOfWeek: parseInt(currentEvent.dayOfWeek),
        eventDate: currentEvent.eventDate, // Add the specific date
        startTime: currentEvent.startTime,
        endTime: currentEvent.endTime,
        isRecurring: currentEvent.isRecurring,
        department: selectedCourse?.departmentName || userDepartment,
        isCrossCutting: selectedCourse?.isCrossCutting || false,
        sessionType: currentEvent.sessionType,
        programType: currentEvent.programType,
        programId: programId,
        crossCuttingDepartments: selectedCourse?.crossCuttingDepartments || [],
        crossCuttingPrograms: selectedCourse?.crossCuttingPrograms || [],
        createdBy: user.uid,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'scheduleEvents'), newEvent);
      
      // If this is a cross-cutting course, create duplicate events for all specified programs
      if (selectedCourse?.isCrossCutting && selectedCourse?.crossCuttingPrograms?.length > 0) {
        // Create a separate schedule for each program the course is cross-cutting with
        await Promise.all(selectedCourse.crossCuttingPrograms.map(async (programId) => {
          if (programId !== newEvent.programId) { // Skip if it's the same as the main event
            const crossCuttingEvent = {
              ...newEvent,
              programId,
              createdAt: new Date(),
              // Mark as generated from cross-cutting to avoid duplication in future
              isGeneratedCrossCutting: true,
              originalEventId: docRef.id
            };
            
            await addDoc(collection(db, 'scheduleEvents'), crossCuttingEvent);
          }
        }));
        
        preventDuplicateToast(() => {
          toast.success(`Course scheduled for ${selectedCourse.crossCuttingPrograms.length} additional programs as cross-cutting course.`);
        });
      }
      
      // Update scheduleEvents state
      setScheduleEvents(prev => [...prev, { id: docRef.id, ...newEvent }]);
      
      // Remove from unscheduled lectures if it was there
      setUnscheduledLectures(prev => 
        prev.filter(lecture => lecture.id !== currentEvent.courseId)
      );
      
      preventDuplicateToast(() => {
        toast.success(`Lecture for ${currentEvent.title} has been scheduled as ${
          currentEvent.sessionType === 'LH' ? 'Lecture Hour' :
          currentEvent.sessionType === 'PH' ? 'Practical Hour' :
          currentEvent.sessionType === 'TH' ? 'Tutorial Hour' :
          'Clinical Hour'
        }`);
      });
      
      // Reset form and close modal
      resetAndCloseModal();
    } catch (error) {
      console.error("Error adding schedule event:", error);
      preventDuplicateToast(() => {
        toast.error("Failed to add schedule event");
      });
    }
  };

  // Delete event from Firestore
  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, 'scheduleEvents', eventId));
      
      // Update scheduleEvents state
      const deletedEvent = scheduleEvents.find(e => e.id === eventId);
      setScheduleEvents(prev => prev.filter(event => event.id !== eventId));
      
      // Add back to unscheduled lectures
      if (deletedEvent) {
        const course = courses.find(c => c.id === deletedEvent.courseId);
        if (course) {
          setUnscheduledLectures(prev => [
            ...prev, 
            {
              id: course.id,
              code: course.code,
              name: course.name,
              department: course.department,
              lecturer: deletedEvent.lecturer,
              isCrossCutting: course.isCrossCutting || false
            }
          ]);
        }
      }
      
      preventDuplicateToast(() => {
        toast.success("Schedule event deleted successfully");
      });
    } catch (error) {
      console.error("Error deleting schedule event:", error);
      preventDuplicateToast(() => {
        toast.error("Failed to delete schedule event");
      });
    }
  };

  // Update semester dates in Firestore
  const handleUpdateSemesterDates = async () => {
    // Validate dates
    if (new Date(semesterDates.startDate) >= new Date(semesterDates.endDate)) {
      preventDuplicateToast(() => {
        toast.error('End date must be after start date');
      });
      return;
    }
    
    try {
      // Create the semester data
      const semesterData = {
        startDate: semesterDates.startDate,
        endDate: semesterDates.endDate,
        updatedBy: user.uid,
        updatedAt: new Date(),
        createdBy: user.uid,
        createdAt: new Date()
      };
      
      // Reference to the semester settings document
      const settingsRef = doc(db, 'settings', 'semester');
      
      // Use setDoc with merge option to create if it doesn't exist or update if it does
      await setDoc(settingsRef, semesterData, { merge: true });
      
      preventDuplicateToast(() => {
        toast.success(`Semester dates set from ${semesterDates.startDate} to ${semesterDates.endDate}`);
      });
      setShowSemesterModal(false);
    } catch (error) {
      console.error("Error updating semester dates:", error);
      preventDuplicateToast(() => {
        toast.error(`Failed to update semester dates: ${error.message}`);
      });
    }
  };

  // Reset form and close modal
  const resetAndCloseModal = () => {
    setCurrentEvent({
      title: '',
      courseId: '',
      lecturerId: '',
      roomId: '',
      startTime: '',
      endTime: '',
      dayOfWeek: '',
      eventDate: '', // Reset eventDate
      sessionType: 'LH',
      isRecurring: true,
      isCrossCutting: false,
      programType,
      crossCuttingDepartments: [],
      crossCuttingPrograms: []
    });
    setShowAddEventModal(false);
  };

  // Add function to handle event click for details (this was missing)
  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setShowEventDetailModal(true);
  };

  // Add a new component for the event detail modal
  const EventDetailModal = () => {
    if (!selectedEvent) return null;
    
    const sessionType = getSessionTypeBadge(selectedEvent.sessionType);
    
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? 'bg-black/70' : 'bg-gray-800/50'}`}>
        <div 
          className={`relative w-full max-w-lg rounded-lg shadow-xl ${
            darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'
          }`}
        >
          {/* Header with color bar based on course type */}
          <div className={`h-2 w-full rounded-t-lg ${sessionType.bgFull}`}></div>
          
          <div className="p-6 max-h-[60vh] overflow-y-auto">{/* Reduced to 60vh to ensure it doesn't touch top/bottom nav */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${sessionType.bgFull} ${sessionType.textFull}`}>
                    {sessionType.label}
                  </span>
                  {selectedEvent.isCrossCutting && (
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-800'
                    }`}>
                      Cross-Cutting
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold">{selectedEvent.courseCode}</h3>
                <p className="text-lg font-medium">{selectedEvent.title}</p>
              </div>
              <button 
                onClick={() => setShowEventDetailModal(false)}
                className={`p-1 rounded-full ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg mb-4 ${
              darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Day</div>
                <div className="font-medium">{selectedEvent.day}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Time</div>
                <div className="font-medium">{selectedEvent.startTime} - {selectedEvent.endTime}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Room</div>
                <div className="font-medium">{selectedEvent.room}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Department</div>
                <div className="font-medium">{selectedEvent.department}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Lecturer</div>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                darkMode ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {selectedEvent.lecturer.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{selectedEvent.lecturer}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedEvent.lecturerEmail || 'No email provided'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Cross-cutting information */}
            {selectedEvent.isCrossCutting && selectedEvent.crossCuttingPrograms && selectedEvent.crossCuttingPrograms.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cross-Cutting Programs</div>
                <div className={`p-3 rounded-lg ${
                  darkMode ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-purple-100 border border-purple-200'
                }`}>
                  <div className="max-h-32 overflow-y-auto">
                    {selectedEvent.crossCuttingPrograms.map(cp => {
                      const program = programsList.find(p => p.id === (typeof cp === 'object' ? cp.programId : cp));
                      
                      return program ? (
                        <div key={typeof cp === 'object' ? cp.programId : cp} 
                          className={`mb-2 p-2 rounded-md text-sm flex items-center justify-between ${
                            darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" 
                              className={`h-4 w-4 mr-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>{program.name}</span>
                          </div>
                          {typeof cp === 'object' && cp.yearOffered && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                            }`}>
                              Year {cp.yearOffered}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowEventDetailModal(false);
                  handleDeleteEvent(selectedEvent.id);
                }}
                className={`px-4 py-2 rounded-md ${
                  darkMode 
                    ? 'bg-red-900/30 hover:bg-red-900/40 text-red-400 border border-red-800/30' 
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                }`}
              >
                Delete
              </button>
              <button
                onClick={() => setShowEventDetailModal(false)}
                className={`px-4 py-2 rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Enhanced Schedule Calendar
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {userRole === 'admin' 
              ? (selectedDepartment === 'all' 
                 ? 'Manage all course schedules across departments' 
                 : `Manage schedules for the ${selectedDepartment} department`)
              : `Manage schedules for the ${userDepartment} department`}
          </p>
          
          {/* Department selector for admins */}
          {userRole === 'admin' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Faculty dropdown */}
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Faculty:
                </label>
                <select
                  value={selectedFaculty}
                  onChange={(e) => {
                    setSelectedFaculty(e.target.value);
                    setSelectedDepartment('all');
                    setSelectedProgram('all');
                  }}
                  className={`ml-2 p-1.5 rounded border text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="all">All Faculties</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Department dropdown */}
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Department:
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSelectedProgram('all');
                  }}
                  className={`ml-2 p-1.5 rounded border text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Program dropdown */}
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Program:
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className={`ml-2 p-1.5 rounded border text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="all">All Programs</option>
                  {programsList
                    .filter(prog => selectedDepartment === 'all' || 
                      prog.department === selectedDepartment || 
                      prog.departmentName === selectedDepartment)
                    .map(prog => (
                      <option key={prog.id} value={prog.id}>{prog.name}</option>
                    ))}
                </select>
              </div>
            </div>
          )}
          
          {/* Program selector for HoDs */}
          {userRole === 'hod' && (
            <div className="mt-3">
              <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Program:
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className={`ml-2 p-1.5 rounded border text-sm ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="all">All Programs</option>
                {programsList
                  .filter(prog => prog.department === userDepartment || 
                             prog.departmentName === userDepartment)
                  .map(prog => (
                    <option key={prog.id} value={prog.id}>{prog.name}</option>
                  ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button 
            onClick={() => setShowSemesterModal(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Set Semester Dates</span>
          </button>
          
          <button 
            onClick={() => setShowAddEventModal(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Schedule Lecture</span>
          </button>
        </div>
      </div>
      
      {/* Semester information */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md mb-4`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Current Semester
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {new Date(semesterDates.startDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} - {new Date(semesterDates.endDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          {/* Program type switcher */}
          <div className={`flex mt-4 sm:mt-0 p-1 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <button 
              onClick={() => setProgramType('day')}
              className={`px-3 py-1.5 rounded-md text-sm ${
                programType === 'day' 
                  ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white shadow') 
                  : (darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800')
              }`}
            >
              Day Program
            </button>
            <button 
              onClick={() => setProgramType('evening')}
              className={`px-3 py-1.5 rounded-md text-sm ${
                programType === 'evening' 
                  ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white shadow') 
                  : (darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800')
              }`}
            >
              Evening Program
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendar controls */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md mb-4`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevious}
              className={`p-2 rounded-md ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatDateRange()}
            </span>
            
            <button 
              onClick={handleNext}
              className={`p-2 rounded-md ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className={`relative flex-grow sm:flex-grow-0 sm:w-64`}>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input 
                type="text"
                placeholder="Search lectures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-4 py-2 rounded-md w-full ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } border`}
              />
            </div>
            
            <div className="flex items-center">
              <button
                onClick={() => setShowTimetable(!showTimetable)}
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                {showTimetable ? (
                  <>
                    <ClipboardList className="h-4 w-4" />
                    <span>Unscheduled</span>
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    <span>Calendar</span>
                  </>
                )}
              </button>
              
              <div className="relative ml-2">
                <button
                  onClick={() => setShowExportModal(true)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* View selector */}
        <div className="flex mt-4 gap-2">
          <button
            onClick={() => handleViewChange('day')}
            className={`px-3 py-1 rounded-md text-sm ${
              currentView === 'day' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') 
                : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
            }`}
          >
            Day
          </button>
          
          <button
            onClick={() => handleViewChange('week')}
            className={`px-3 py-1 rounded-md text-sm ${
              currentView === 'week' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') 
                : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
            }`}
          >
            Week
          </button>
          
          <button
            onClick={() => handleViewChange('month')}
            className={`px-3 py-1 rounded-md text-sm ${
              currentView === 'month' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') 
                : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
            }`}
          >
            Month
          </button>
          
          <button
            onClick={() => handleViewChange('semester')}
            className={`px-3 py-1 rounded-md text-sm ${
              currentView === 'semester' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') 
                : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
            }`}
          >
            Semester
          </button>
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-lg font-medium text-gray-500 dark:text-gray-400">Loading schedule...</span>
        </div>
      ) : (
        /* Main content: Calendar or Unscheduled view */
        showTimetable ? (
          <div className={`overflow-x-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4`}>
            {renderTimetableView()}
          </div>
        ) : (
          <>
            {renderUnscheduledView()}
            {renderCollisionAlerts()}
          </>
        )
      )}
      
      {/* Add lecture modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={resetAndCloseModal}>
              <div className="absolute inset-0 bg-black opacity-60"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Schedule Lecture
                  </h3>
                  <button 
                    onClick={resetAndCloseModal}
                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Modal body */}
              <div className={`px-6 py-4 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="space-y-4">
                  {/* Department and Program selectors for admin when scheduling */}
                  {userRole === 'admin' && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Faculty dropdown */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Faculty</label>
                        <select 
                          value={selectedFaculty}
                          onChange={(e) => {
                            setSelectedFaculty(e.target.value);
                            setSelectedDepartment('all');
                            setSelectedProgram('all');
                          }}
                          className={`w-full p-2 rounded-md border ${
                            darkMode 
                              ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                              : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                        >
                          <option value="all" className={darkMode ? 'bg-gray-800' : 'bg-white'}>All Faculties</option>
                          {faculties.map(faculty => (
                            <option key={faculty.id} value={faculty.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                              {faculty.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Department</label>
                        <select 
                          value={selectedDepartment}
                          onChange={(e) => {
                            setSelectedDepartment(e.target.value);
                            setSelectedProgram('all');
                          }}
                          className={`w-full p-2 rounded-md border ${
                            darkMode 
                              ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                              : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                        >
                          <option value="all" className={darkMode ? 'bg-gray-800' : 'bg-white'}>All Departments</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="col-span-2">
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Program</label>
                        <select 
                          value={selectedProgram}
                          onChange={(e) => setSelectedProgram(e.target.value)}
                          className={`w-full p-2 rounded-md border ${
                            darkMode 
                              ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                              : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                        >
                          <option value="all" className={darkMode ? 'bg-gray-800' : 'bg-white'}>All Programs</option>
                          {programsList
                            .filter(prog => {
                              // Check if department selection matches by ID or by department name
                              const matches = selectedDepartment === 'all' || 
                                prog.departmentId === selectedDepartment || 
                                prog.department === selectedDepartment;
                              
                              console.log('DEBUG - Program filter:', {
                                progName: prog.name,
                                progDeptId: prog.departmentId,
                                progDept: prog.department,
                                selectedDept: selectedDepartment,
                                matches: matches
                              });
                              
                              return matches;
                            })
                            .map(prog => (
                              <option key={prog.id} value={prog.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                                {prog.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {/* Program selector for HoD when scheduling */}
                  {userRole === 'hod' && (
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Program</label>
                      <select 
                        value={selectedProgram}
                        onChange={(e) => setSelectedProgram(e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                            : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      >
                        <option value="all" className={darkMode ? 'bg-gray-800' : 'bg-white'}>All Programs</option>
                        {programsList
                          .filter(prog => {
                            // Check by department ID or department name
                            const hodDept = departments.find(d => d.name === userDepartment);
                            return prog.departmentId === hodDept?.id || 
                              prog.department === userDepartment || 
                              prog.departmentName === userDepartment;
                          })
                          .map(prog => (
                            <option key={prog.id} value={prog.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                              {prog.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Course</label>
                    <select 
                      value={currentEvent.courseId}
                      onChange={(e) => handleFormChange('courseId', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                          : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    >
                      <option value="" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Select Course</option>
                      {courses
                        .filter(course => {
                          // Department filter
                          let departmentMatch = true;
                          if (userRole === 'admin' && selectedDepartment !== 'all') {
                            departmentMatch = course.departmentId === selectedDepartment || 
                              course.isCrossCutting;
                          } else if (userRole === 'hod') {
                            // For HoD, only show courses from their department or cross-cutting
                            const hodDept = departments.find(d => d.name === userDepartment);
                            departmentMatch = course.departmentId === hodDept?.id || 
                              course.departmentName === userDepartment || 
                              course.isCrossCutting;
                          }
                          
                          // Program filter
                          let programMatch = true;
                          if (selectedProgram !== 'all') {
                            programMatch = course.programId === selectedProgram || 
                              (course.isCrossCutting && Array.isArray(course.crossCuttingPrograms) && 
                               course.crossCuttingPrograms.includes(selectedProgram));
                          }
                          
                          console.log('DEBUG - Course filter:', {
                            courseName: course.name,
                            courseCode: course.code,
                            courseDeptId: course.departmentId,
                            courseDeptName: course.departmentName,
                            courseProgramId: course.programId,
                            isCrossCutting: course.isCrossCutting,
                            crossCuttingPrograms: course.crossCuttingPrograms,
                            selectedDept: selectedDepartment,
                            selectedProgram: selectedProgram,
                            departmentMatch: departmentMatch,
                            programMatch: programMatch
                          });
                          
                          return departmentMatch && programMatch;
                        })
                        .map(course => (
                          <option key={course.id} value={course.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                            {course.code} - {course.name} {course.isCrossCutting ? '(Cross-Cutting)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {/* Cross-cutting course indicator */}
                  {currentEvent.courseId && currentEvent.isCrossCutting && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      darkMode ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-purple-100 border border-purple-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" 
                          className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M7 7h.01M7 17h.01M17 7h.01M17 17h.01M7 12h.01M12 7h.01M12 12h.01M12 17h.01M17 12h.01M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0 0c2.5 0 4.5-4.5 4.5-10S14.5 2 12 2 7.5 6.5 7.5 12s2 10 4.5 10z" />
                        </svg>
                        <div>
                          <h4 className={`font-medium text-sm ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                            Cross-Cutting Course
                          </h4>
                          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            This course is shared across multiple programs.
                          </p>
                          
                          {currentEvent.crossCuttingPrograms && currentEvent.crossCuttingPrograms.length > 0 ? (
                            <div className="mt-2">
                              <h5 className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Shared with:
                              </h5>
                              <div className={`max-h-24 overflow-y-auto p-2 rounded ${
                                darkMode ? 'bg-gray-800' : 'bg-white'
                              }`}>
                                {currentEvent.crossCuttingPrograms.map(cp => {
                                  const program = programsList.find(p => p.id === (typeof cp === 'object' ? cp.programId : cp));
                                  
                                  return program ? (
                                    <div key={typeof cp === 'object' ? cp.programId : cp} 
                                      className={`text-xs py-1 px-2 mb-1 rounded flex items-center justify-between ${
                                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                      }`}
                                    >
                                      <span>{program.name}</span>
                                      {typeof cp === 'object' && cp.yearOffered && (
                                        <span className={`ml-2 px-1.5 py-0.5 rounded ${
                                          darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                          Year {cp.yearOffered}
                                        </span>
                                      )}
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className={`mt-2 text-xs italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              No specific programs defined for cross-cutting.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Session Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        className={`p-2 rounded border text-center cursor-pointer ${
                          currentEvent.sessionType === 'LH' 
                            ? (darkMode ? 'bg-blue-900/40 border-blue-700 text-blue-300' : 'bg-blue-100 border-blue-200 text-blue-800') 
                            : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100')
                        }`}
                        onClick={() => handleFormChange('sessionType', 'LH')}
                      >
                        <span className="text-sm font-medium">Lecture Hour (LH)</span>
                      </div>
                      <div 
                        className={`p-2 rounded border text-center cursor-pointer ${
                          currentEvent.sessionType === 'PH' 
                            ? (darkMode ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-green-100 border-green-200 text-green-800') 
                            : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100')
                        }`}
                        onClick={() => handleFormChange('sessionType', 'PH')}
                      >
                        <span className="text-sm font-medium">Practical Hour (PH)</span>
                      </div>
                      <div 
                        className={`p-2 rounded border text-center cursor-pointer ${
                          currentEvent.sessionType === 'TH' 
                            ? (darkMode ? 'bg-yellow-900/40 border-yellow-700 text-yellow-300' : 'bg-yellow-100 border-yellow-200 text-yellow-800') 
                            : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100')
                        }`}
                        onClick={() => handleFormChange('sessionType', 'TH')}
                      >
                        <span className="text-sm font-medium">Tutorial Hour (TH)</span>
                      </div>
                      <div 
                        className={`p-2 rounded border text-center cursor-pointer ${
                          currentEvent.sessionType === 'CH' 
                            ? (darkMode ? 'bg-red-900/40 border-red-700 text-red-300' : 'bg-red-100 border-red-200 text-red-800') 
                            : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100')
                        }`}
                        onClick={() => handleFormChange('sessionType', 'CH')}
                      >
                        <span className="text-sm font-medium">Clinical Hour (CH)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date</label>
                      <input 
                        type="date"
                        value={currentEvent.eventDate}
                        onChange={(e) => handleFormChange('eventDate', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                            : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        required
                      />
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Must be within semester: {semesterDates.startDate} - {semesterDates.endDate}
                      </p>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Day</label>
                      <select 
                        value={currentEvent.dayOfWeek}
                        onChange={(e) => handleFormChange('dayOfWeek', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                            : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      >
                        <option value="" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Select Day</option>
                        <option value="1" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Monday</option>
                        <option value="2" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Tuesday</option>
                        <option value="3" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Wednesday</option>
                        <option value="4" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Thursday</option>
                        <option value="5" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Friday</option>
                        <option value="6" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Saturday</option>
                        <option value="7" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Sunday</option>
                      </select>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Auto-selected from date
                        </p>
                    </div>
                  </div>
                  
                    <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Room</label>
                    <select 
                      value={currentEvent.roomId}
                      onChange={(e) => handleFormChange('roomId', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                          : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    >
                      <option value="" className={darkMode ? 'bg-gray-800' : ''}>Select Room (Optional)</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                          {room.name} ({room.type}) - Capacity: {room.capacity}
                          </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Start Time</label>
                      <select 
                        value={currentEvent.startTime}
                        onChange={(e) => handleFormChange('startTime', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                            : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      >
                        <option value="" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Select Time</option>
                        {getTimeSlots().map(time => (
                          <option key={time} value={time} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>End Time</label>
                      <select 
                        value={currentEvent.endTime}
                        onChange={(e) => handleFormChange('endTime', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:ring-blue-600 focus:border-blue-600' 
                            : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      >
                        <option value="" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Select Time</option>
                        {getTimeSlots().map(time => (
                          <option key={time} value={time} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Program Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        className={`p-2 rounded border text-center cursor-pointer ${
                          currentEvent.programType === 'day' 
                            ? (darkMode ? 'bg-blue-900/40 border-blue-700 text-blue-300' : 'bg-blue-100 border-blue-200 text-blue-800') 
                            : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100')
                        }`}
                        onClick={() => handleFormChange('programType', 'day')}
                      >
                        <span className="text-sm font-medium">Day Program (8AM-5PM)</span>
                      </div>
                      <div 
                        className={`p-2 rounded border text-center cursor-pointer ${
                          currentEvent.programType === 'evening' 
                            ? (darkMode ? 'bg-purple-900/40 border-purple-700 text-purple-300' : 'bg-purple-100 border-purple-200 text-purple-800') 
                            : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100')
                        }`}
                        onClick={() => handleFormChange('programType', 'evening')}
                      >
                        <span className="text-sm font-medium">Evening Program (5PM-9PM)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="isRecurring"
                      checked={currentEvent.isRecurring}
                      onChange={(e) => handleFormChange('isRecurring', e.target.checked)}
                      className={`h-4 w-4 rounded ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-600' 
                          : 'border-gray-300 text-blue-600 focus:ring-blue-500'
                      }`}
                    />
                    <label htmlFor="isRecurring" className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Recurring (weekly)
                    </label>
                  </div>
                  
                  {currentEvent.isRecurring && currentEvent.dayOfWeek && (
                    <p className={`text-sm py-2 px-3 rounded ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      This lecture will repeat every {
                        currentEvent.dayOfWeek === '1' ? 'Monday' :
                        currentEvent.dayOfWeek === '2' ? 'Tuesday' :
                        currentEvent.dayOfWeek === '3' ? 'Wednesday' :
                        currentEvent.dayOfWeek === '4' ? 'Thursday' :
                        currentEvent.dayOfWeek === '5' ? 'Friday' :
                        currentEvent.dayOfWeek === '6' ? 'Saturday' :
                        'Sunday'
                      } throughout the semester.
                    </p>
                  )}
                  
                  {/* Schedule Check section */}
                  <div className={`mt-3 p-3 rounded-lg ${
                    darkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                          Schedule Check
                        </h3>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          The system will automatically check for conflicts when scheduling:
                        </p>
                        <ul className={`text-xs mt-1 list-disc pl-4 space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          <li>Lecturer conflicts: The same lecturer cannot teach multiple classes at the same time</li>
                          <li>Student group conflicts: The same student group (program/year/semester) cannot have multiple classes at the same time</li>
                          <li>Room conflicts: The same room cannot be double-booked for different classes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="flex justify-end gap-2">
                <button 
                    type="button"
                  onClick={resetAndCloseModal}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      darkMode 
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button 
                    type="button"
                  onClick={handleAddEvent}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Schedule Lecture
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Semester settings modal */}
      {showSemesterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowSemesterModal(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Set Semester Dates
                  </h3>
                  <button 
                    onClick={() => setShowSemesterModal(false)}
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
                    <label className="block text-sm font-medium mb-1">Semester Start Date</label>
                    <input
                      type="date"
                      value={semesterDates.startDate}
                      onChange={(e) => setSemesterDates(prev => ({ ...prev, startDate: e.target.value }))}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Semester End Date</label>
                    <input
                      type="date"
                      value={semesterDates.endDate}
                      onChange={(e) => setSemesterDates(prev => ({ ...prev, endDate: e.target.value }))}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Calendar className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                        Semester Planning
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      Setting the semester dates helps in planning and visualizing the entire academic period. The timetable will be specific to this semester.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={() => setShowSemesterModal(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleUpdateSemesterDates}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700`}
                >
                  Save Dates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowExportModal(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Export Schedule
                  </h3>
                  <button 
                    onClick={() => setShowExportModal(false)}
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
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Choose a format to export your {currentView} schedule:
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  <div 
                    className={`p-4 rounded-lg flex items-center cursor-pointer transition ${
                      exportFormat === 'csv' 
                        ? (darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200') 
                        : (darkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-200')
                    } border`}
                    onClick={() => setExportFormat('csv')}
                  >
                    <div className={`p-2 rounded-full mr-3 ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>CSV Format</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Spreadsheet format, best for data analysis
                      </p>
                    </div>
                    {exportFormat === 'csv' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-auto text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  <div 
                    className={`p-4 rounded-lg flex items-center cursor-pointer transition ${
                      exportFormat === 'html' 
                        ? (darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200') 
                        : (darkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-200')
                    } border`}
                    onClick={() => setExportFormat('html')}
                  >
                    <div className={`p-2 rounded-full mr-3 ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>HTML Format</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Web page format, best for viewing in browsers
                      </p>
                    </div>
                    {exportFormat === 'html' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-auto text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  <div 
                    className={`p-4 rounded-lg flex items-center cursor-pointer transition ${
                      exportFormat === 'pdf' 
                        ? (darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200') 
                        : (darkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-200')
                    } border`}
                    onClick={() => setExportFormat('pdf')}
                  >
                    <div className={`p-2 rounded-full mr-3 ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>PDF Format</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Document format, best for printing and sharing
                      </p>
                    </div>
                    {exportFormat === 'pdf' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-auto text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end`}>
                <button 
                  className={`mr-2 px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  onClick={exportSchedule}
                >
                  Export {exportFormat.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Event Detail Modal */}
      {showEventDetailModal && <EventDetailModal />}
    </div>
  );
};

EnhancedScheduleCalendar.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  userDepartment: PropTypes.string
};

export default EnhancedScheduleCalendar;

