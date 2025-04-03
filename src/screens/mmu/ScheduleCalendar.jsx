import {
    AlertTriangle,
    BookOpen,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Filter,
    Plus,
    Search,
    User
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useState } from 'react';

const ScheduleCalendar = ({ darkMode, userRole, userDepartment = 'Computer Science' }) => {
  const [currentView, setCurrentView] = useState('week'); // 'day', 'week', 'month'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [semesterDates, setSemesterDates] = useState({
    startDate: '2023-09-01',
    endDate: '2023-12-15'
  });
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [unscheduledView, setUnscheduledView] = useState(false);
  const [currentEvent, setCurrentEvent] = useState({
    title: '',
    courseId: '',
    lecturerId: '',
    roomId: '',
    startTime: '',
    endTime: '',
    dayOfWeek: '',
    isRecurring: true,
    isCrossCutting: false,
    crossCuttingDepartments: [],
    crossCuttingPrograms: []
  });

  // Mock courses for dropdown
  const courses = [
    { id: 1, name: 'Introduction to Programming', code: 'BIT 1201', department: 'Business Information Technology', lecturer: 'Prof. Mary Johnson', isCrossCutting: true },
    { id: 2, name: 'Database Systems', code: 'CS 2104', department: 'Computer Science', lecturer: 'Dr. John Smith', isCrossCutting: false },
    { id: 3, name: 'Software Engineering', code: 'SE 3201', department: 'Software Engineering', lecturer: 'Dr. Elizabeth Brown', isCrossCutting: false },
    { id: 4, name: 'Web Development', code: 'CS 2302', department: 'Computer Science', lecturer: 'Jane Williams', isCrossCutting: false },
    { id: 5, name: 'Operating Systems', code: 'CS 3105', department: 'Computer Science', lecturer: null, isCrossCutting: false },
  ];

  // Mock rooms for dropdown
  const rooms = [
    { id: 1, name: 'CS Lab 1', capacity: 40, building: 'Block A' },
    { id: 2, name: 'CS Lab 2', capacity: 30, building: 'Block A' },
    { id: 3, name: 'Lecture Hall 1', capacity: 100, building: 'Block B' },
    { id: 4, name: 'Lecture Hall 2', capacity: 80, building: 'Block B' },
    { id: 5, name: 'Seminar Room 1', capacity: 25, building: 'Block C' },
  ];

  // Mock schedule events
  const scheduleEvents = [
    { id: 1, title: 'Introduction to Programming', courseId: 1, courseName: 'Introduction to Programming', courseCode: 'BIT 1201', lecturerId: 2, lecturer: 'Prof. Mary Johnson', roomId: 3, room: 'Lecture Hall 1', dayOfWeek: 1, startTime: '09:00', endTime: '11:00', isRecurring: true, department: 'Business Information Technology', isCrossCutting: true },
    { id: 2, title: 'Database Systems', courseId: 2, courseName: 'Database Systems', courseCode: 'CS 2104', lecturerId: 1, lecturer: 'Dr. John Smith', roomId: 4, room: 'Lecture Hall 2', dayOfWeek: 1, startTime: '14:00', endTime: '16:00', isRecurring: true, department: 'Computer Science', isCrossCutting: false },
    { id: 3, title: 'Software Engineering', courseId: 3, courseName: 'Software Engineering', courseCode: 'SE 3201', lecturerId: 3, lecturer: 'Dr. Elizabeth Brown', roomId: 5, room: 'Seminar Room 1', dayOfWeek: 2, startTime: '11:00', endTime: '13:00', isRecurring: true, department: 'Software Engineering', isCrossCutting: false },
    { id: 4, title: 'Web Development', courseId: 4, courseName: 'Web Development', courseCode: 'CS 2302', lecturerId: 4, lecturer: 'Jane Williams', roomId: 1, room: 'CS Lab 1', dayOfWeek: 3, startTime: '09:00', endTime: '12:00', isRecurring: true, department: 'Computer Science', isCrossCutting: false },
    { id: 5, title: 'Database Systems Lab', courseId: 2, courseName: 'Database Systems', courseCode: 'CS 2104', lecturerId: 1, lecturer: 'Dr. John Smith', roomId: 2, room: 'CS Lab 2', dayOfWeek: 4, startTime: '14:00', endTime: '16:00', isRecurring: true, department: 'Computer Science', isCrossCutting: false },
  ];

  // Mock collision alerts
  const collisions = [
    { id: 1, type: 'lecturer', description: 'Prof. Mary Johnson has overlapping classes', events: [1, 6] },
    { id: 2, type: 'room', description: 'Lecture Hall 1 double-booked', events: [1, 7] },
    { id: 3, type: 'student_group', description: 'BIT Year 1 students have overlapping classes', events: [1, 8] },
  ];

  // Mock departments for selection
  const allDepartments = [
    { id: 1, name: 'Computer Science' },
    { id: 2, name: 'Business Information Technology' },
    { id: 3, name: 'Software Engineering' },
    { id: 4, name: 'Business Administration' },
    { id: 5, name: 'Mechanical Engineering' },
    { id: 6, name: 'Electrical Engineering' }
  ];

  // Mock programs for selection
  const allPrograms = [
    { id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSc. CS', departmentId: 1 },
    { id: 2, name: 'Bachelor of Business Information Technology', code: 'BBIT', departmentId: 2 },
    { id: 3, name: 'Master of Science in Computer Science', code: 'MSc. CS', departmentId: 1 },
    { id: 4, name: 'Diploma in Computer Science', code: 'DCS', departmentId: 1 },
    { id: 5, name: 'Bachelor of Software Engineering', code: 'BSE', departmentId: 3 },
    { id: 6, name: 'Bachelor of Business Administration', code: 'BBA', departmentId: 4 },
    { id: 7, name: 'Higher Diploma in Networking', code: 'HDN', departmentId: 1 },
  ];

  // Unscheduled lectures - courses without allocated time slots
  const unscheduledLectures = [
    { id: 101, code: 'CS 4101', name: 'Artificial Intelligence', department: 'Computer Science', lecturer: 'Dr. Alan Turing' },
    { id: 102, code: 'BIT 3203', name: 'IT Project Management', department: 'Business Information Technology', lecturer: 'Prof. Grace Hopper', isCrossCutting: true },
    { id: 103, code: 'SE 4301', name: 'Advanced Software Testing', department: 'Software Engineering', lecturer: 'Not Assigned' }
  ];

  // Days of the week
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Time slots from 8am to 8pm in 1-hour increments
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

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

  const handleAddEvent = () => {
    // Validate required fields
    if (!currentEvent.courseId || !currentEvent.roomId || !currentEvent.startTime || !currentEvent.endTime) {
      alert('Please fill all required fields');
      return;
    }
    
    // For HoD role, ensure they can only schedule lectures for their department
    if (userRole === 'hod') {
      const selectedCourse = courses.find(c => c.id.toString() === currentEvent.courseId);
      
      // Get department of the selected course (in a real app, this would come from your API)
      const courseDepartment = selectedCourse?.department || 'Computer Science';
      const isCrossCutting = selectedCourse?.isCrossCutting || false;
      
      // Check if course belongs to the HoD's department or is cross-cutting
      if (!isCrossCutting && courseDepartment !== userDepartment) {
        alert(`As a Head of Department, you can only schedule lectures for courses in your department (${userDepartment}) or cross-cutting courses.`);
        return;
      }
    }
    
    // In a real app, you would make an API call to add the event
    console.log('Adding event:', {
      ...currentEvent,
      isCrossCutting: courses.find(c => c.id.toString() === currentEvent.courseId)?.isCrossCutting || false
    });
    
    alert(`Lecture for ${currentEvent.title} has been scheduled${courses.find(c => c.id.toString() === currentEvent.courseId)?.isCrossCutting ? ' (This is a cross-cutting course and will appear in multiple departments\' schedules)' : ''}`);
    resetAndCloseModal();
  };

  const handleSlotClick = (day, time) => {
    setCurrentEvent(prev => ({
      ...prev,
      dayOfWeek: day,
      startTime: time,
      endTime: getEndTime(time)
    }));
    setShowAddEventModal(true);
  };

  const getEndTime = (startTime) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHour = (hours + 2) % 24; // Default 2-hour slot
    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleFormChange = (field, value) => {
    if (field === 'courseId') {
      const selectedCourse = courses.find(c => c.id.toString() === value);
      setCurrentEvent(prev => ({
        ...prev,
        [field]: value,
        title: selectedCourse ? selectedCourse.name : '',
        lecturerId: selectedCourse && selectedCourse.lecturer 
          ? courses.findIndex(c => c.lecturer === selectedCourse.lecturer) + 1 
          : ''
      }));
    } else {
      setCurrentEvent(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const resetAndCloseModal = () => {
    setCurrentEvent({
      title: '',
      courseId: '',
      lecturerId: '',
      roomId: '',
      startTime: '',
      endTime: '',
      dayOfWeek: '',
      isRecurring: true,
      isCrossCutting: false,
      crossCuttingDepartments: [],
      crossCuttingPrograms: []
    });
    setShowAddEventModal(false);
  };

  const getEventPosition = (event) => {
    // This function calculates the position of events in the timetable grid
    const startHour = parseInt(event.startTime.split(':')[0]);
    const endHour = parseInt(event.endTime.split(':')[0]);
    const startOffset = startHour - 8; // 8am is the first slot
    const duration = endHour - startHour;
    
    return {
      gridRowStart: startOffset + 2, // +2 because of header rows
      gridRowEnd: `span ${duration}`
    };
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

  // Function to filter schedules based on view and search
  const filterSchedules = () => {
    let filtered = [...scheduleEvents];
    
    // Filter by user role and department
    if (userRole === 'hod') {
      filtered = filtered.filter(event => 
        event.department === userDepartment || event.isCrossCutting
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

  // Generate events function - moved up to fix reference error
  const generateEvents = () => {
    // Get filtered events based on current filters
    const filteredEvents = filterSchedules();
    
    // In a real app, filter based on user department and include cross-cutting courses
    if (userRole === 'hod') {
      // For HoD, show department-specific courses and cross-cutting courses
      return filteredEvents
        .filter(event => event.department === userDepartment || event.isCrossCutting)
        .map(event => ({
          id: event.id,
          title: event.title,
          courseCode: event.courseCode,
          lecturer: event.lecturer,
          room: event.room,
          day: daysOfWeek[event.dayOfWeek - 1],
          startTime: event.startTime,
          endTime: event.endTime,
          isCrossCutting: event.isCrossCutting,
          department: event.department
        }));
    } else {
      // For admin, show all courses
      return filteredEvents.map(event => ({
        id: event.id,
        title: event.title,
        courseCode: event.courseCode,
        lecturer: event.lecturer,
        room: event.room,
        day: daysOfWeek[event.dayOfWeek - 1],
        startTime: event.startTime,
        endTime: event.endTime,
        isCrossCutting: event.isCrossCutting,
        department: event.department
      }));
    }
  };

  // Mock data - this would be fetched from your API in a real app
  const mockEvents = generateEvents();
  
  const renderWeekView = () => {
    // Generate time slots for the week view
    const hours = [];
    for (let i = 8; i <= 18; i++) {
      hours.push(`${i}:00`);
    }

    return (
      <div className="overflow-x-auto">
        <div className={`min-w-[800px] border rounded-lg ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Days of the week header */}
          <div className="grid grid-cols-6 divide-x divide-y">
            <div className={`p-3 ${darkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              Time
            </div>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
              <div 
                key={day} 
                className={`p-3 text-center font-medium ${darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Time slots */}
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-6 divide-x divide-y">
              <div className={`p-2 text-center ${darkMode ? 'bg-gray-800/50 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {hour}
              </div>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                // Find events for this day and time slot
                const eventsForSlot = mockEvents.filter(
                  event => event.day === day && 
                  event.startTime.split(':')[0] === hour.split(':')[0]
                );

                return (
                  <div 
                    key={`${day}-${hour}`} 
                    className={`p-2 relative h-16 ${
                      darkMode ? 'hover:bg-gray-800 border-gray-700' : 'hover:bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => handleSlotClick(day, hour)}
                  >
                    {eventsForSlot.map(event => (
                      <div 
                        key={event.id}
                        className={`absolute left-0 right-0 mx-1 p-2 rounded-md text-xs ${
                          event.isCrossCutting 
                            ? (darkMode ? 'bg-purple-900/30 text-purple-300 border border-purple-800/30' : 'bg-purple-100 text-purple-800 border border-purple-200')
                            : (darkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-800/30' : 'bg-blue-100 text-blue-800 border border-blue-200')
                        }`}
                        style={getEventPosition(event)}
                      >
                        <div className="font-medium truncate">
                          {event.title}
                          {event.isCrossCutting && (
                            <span className="ml-1 text-xs px-1 py-0.5 rounded-sm bg-opacity-50 bg-purple-900 text-purple-200">CC</span>
                          )}
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>{event.room}</span>
                          <span>{event.startTime}-{event.endTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleCrossCuttingChange = (checked) => {
    setCurrentEvent(prev => ({
      ...prev,
      isCrossCutting: checked,
      // Reset selections if unchecking
      crossCuttingDepartments: checked ? prev.crossCuttingDepartments : [],
      crossCuttingPrograms: checked ? prev.crossCuttingPrograms : []
    }));
  };

  const handleDepartmentSelection = (deptId) => {
    setCurrentEvent(prev => {
      const isSelected = prev.crossCuttingDepartments.includes(deptId);
      return {
        ...prev,
        crossCuttingDepartments: isSelected
          ? prev.crossCuttingDepartments.filter(id => id !== deptId)
          : [...prev.crossCuttingDepartments, deptId]
      };
    });
  };

  const handleProgramSelection = (programId) => {
    setCurrentEvent(prev => {
      const isSelected = prev.crossCuttingPrograms.includes(programId);
      return {
        ...prev,
        crossCuttingPrograms: isSelected
          ? prev.crossCuttingPrograms.filter(id => id !== programId)
          : [...prev.crossCuttingPrograms, programId]
      };
    });
  };

  const resolveCollision = (collisionId) => {
    // In a real app, you would handle the collision resolution here
    alert(`Resolving collision ${collisionId}. In a real app, this would open a detailed view to help resolve the conflict.`);
  };

  const exportSchedule = () => {
    // In a real app, this would generate a PDF/Excel file
    const formatType = currentView === 'day' ? 'daily' : 
                       currentView === 'week' ? 'weekly' : 'monthly';
    
    alert(`Exporting ${formatType} schedule for ${userDepartment} department...`);
    
    // Mock download - in a real app, you'd generate and download the file
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute(
      'download', 
      `lecture-schedule-${userDepartment}-${formatType}-${new Date().toISOString().split('T')[0]}.pdf`
    );
    link.click();
  };

  return (
    <div className="p-6">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Lecture Schedule
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {userRole === 'admin'
              ? 'Schedule lectures and manage room allocations across all departments'
              : 'Schedule lectures and manage room allocations for your department'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSemesterModal(true)}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              darkMode 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <Calendar className="h-5 w-5 mr-2" /> 
            <span>Set Semester Dates</span>
          </button>
          
          <button 
            onClick={() => setShowAddEventModal(true)}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus className="h-5 w-5 mr-2" /> 
            <span>Schedule Lecture</span>
          </button>
        </div>
      </div>

      {/* Semester info and controls */}
      <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Current Semester</h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {new Date(semesterDates.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} - 
              {new Date(semesterDates.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setUnscheduledView(!unscheduledView)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                unscheduledView 
                  ? (darkMode ? 'bg-indigo-900/30 border-indigo-800 text-indigo-300' : 'bg-indigo-100 border-indigo-200 text-indigo-700')
                  : (darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600')
              }`}
            >
              {unscheduledView ? 'View Calendar' : 'View Unscheduled'}
            </button>
            
            <button 
              onClick={exportSchedule}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                darkMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              Download Schedule
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendar controls - restored */}
      {!unscheduledView && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevious}
              className={`p-2 rounded-lg ${
                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {formatDateRange()}
            </div>
            
            <button 
              onClick={handleNext}
              className={`p-2 rounded-lg ${
                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center rounded-lg border px-3 py-1.5 md:min-w-[200px] ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
            }`}>
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <input 
                type="text"
                placeholder="Search lectures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`outline-none border-none ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
                }`}
              />
            </div>
            
            <div className={`border rounded-lg overflow-hidden ${
              darkMode ? 'border-gray-700' : 'border-gray-300'
            }`}>
              <div className="flex divide-x">
                <button 
                  onClick={() => handleViewChange('day')}
                  className={`px-3 py-1.5 text-sm ${
                    currentView === 'day'
                      ? (darkMode 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-gray-100 text-gray-800')
                      : (darkMode 
                          ? 'text-gray-400 hover:bg-gray-800' 
                          : 'text-gray-600 hover:bg-gray-50')
                  }`}
                >
                  Day
                </button>
                <button 
                  onClick={() => handleViewChange('week')}
                  className={`px-3 py-1.5 text-sm ${
                    currentView === 'week'
                      ? (darkMode 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-gray-100 text-gray-800')
                      : (darkMode 
                          ? 'text-gray-400 hover:bg-gray-800' 
                          : 'text-gray-600 hover:bg-gray-50')
                  }`}
                >
                  Week
                </button>
                <button 
                  onClick={() => handleViewChange('month')}
                  className={`px-3 py-1.5 text-sm ${
                    currentView === 'month'
                      ? (darkMode 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-gray-100 text-gray-800')
                      : (darkMode 
                          ? 'text-gray-400 hover:bg-gray-800' 
                          : 'text-gray-600 hover:bg-gray-50')
                  }`}
                >
                  Month
                </button>
              </div>
            </div>
            
            <button className={`p-2 rounded-lg border ${
              darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'
            }`}>
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Collision alerts */}
      {!unscheduledView && collisions.length > 0 && (
        <div className="mb-6">
          <h2 className={`text-lg font-semibold mb-3 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <AlertTriangle className={`h-5 w-5 mr-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            <span>Collision Alerts</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collisions.map(collision => (
              <div 
                key={collision.id}
                className={`border p-4 rounded-lg ${
                  darkMode 
                    ? 'bg-red-900/20 border-red-800/30 text-white' 
                    : 'bg-red-50 border-red-100 text-gray-800'
                }`}
              >
                <div className="font-medium mb-2">
                  {collision.type === 'lecturer' ? (
                    <div className="flex items-center">
                      <User className={`h-4 w-4 mr-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                      <span>Lecturer Collision</span>
                    </div>
                  ) : collision.type === 'room' ? (
                    <div className="flex items-center">
                      <Calendar className={`h-4 w-4 mr-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                      <span>Room Collision</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <BookOpen className={`h-4 w-4 mr-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                      <span>Student Group Collision</span>
                    </div>
                  )}
                </div>
                <p className={`text-sm mb-3 ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                  {collision.description}
                </p>
                <div className="flex justify-end">
                  <button 
                    onClick={() => resolveCollision(collision.id)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      darkMode 
                        ? 'bg-red-800/30 hover:bg-red-800/50 text-white' 
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}>
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled lectures view */}
      {unscheduledView ? (
        <div className={`border rounded-lg overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Course Code
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Course Name
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Department
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Lecturer
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Type
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {unscheduledLectures.map(lecture => (
                <tr key={lecture.id} className={darkMode ? 'bg-gray-900' : 'bg-white'}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {lecture.code}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {lecture.name}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {lecture.department}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {lecture.lecturer}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                    {lecture.isCrossCutting ? (
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                      }`}>
                        Cross-Cutting
                      </span>
                    ) : (
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                      }`}>
                        Regular
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setCurrentEvent({
                          ...currentEvent,
                          title: lecture.name,
                          courseId: lecture.id,
                          isCrossCutting: lecture.isCrossCutting || false
                        });
                        setShowAddEventModal(true);
                      }}
                      className={`text-indigo-600 hover:text-indigo-900 ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : ''}`}
                    >
                      Schedule
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Calendar view goes here (renderWeekView function) */
        <div className="mb-6 overflow-x-auto">
          {renderWeekView()}
        </div>
      )}

      {/* Add lecture modal */}
      {showAddEventModal && (
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
                    Schedule Lecture
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
                  <div>
                    <label className="block text-sm font-medium mb-1">Course</label>
                    <select 
                      value={currentEvent.courseId}
                      onChange={(e) => handleFormChange('courseId', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="">Select Course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.name} {course.isCrossCutting ? '(Cross-Cutting)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Day</label>
                      <select 
                        value={currentEvent.dayOfWeek}
                        onChange={(e) => handleFormChange('dayOfWeek', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">Select Day</option>
                        {daysOfWeek.map((day, index) => (
                          <option key={index} value={index + 1}>{day}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Room</label>
                      <select 
                        value={currentEvent.roomId}
                        onChange={(e) => handleFormChange('roomId', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">Select Room</option>
                        {rooms.map(room => (
                          <option key={room.id} value={room.id}>
                            {room.name} ({room.building})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Time</label>
                      <select 
                        value={currentEvent.startTime}
                        onChange={(e) => {
                          const startTime = e.target.value;
                          handleFormChange('startTime', startTime);
                          handleFormChange('endTime', getEndTime(startTime));
                        }}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">Select Time</option>
                        {timeSlots.map((time, index) => (
                          <option key={index} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">End Time</label>
                      <select 
                        value={currentEvent.endTime}
                        onChange={(e) => handleFormChange('endTime', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">Select Time</option>
                        {timeSlots.map((time, index) => (
                          <option key={index} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="isRecurring"
                      checked={currentEvent.isRecurring}
                      onChange={(e) => handleFormChange('isRecurring', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="isRecurring" className="text-sm">
                      Recurring (weekly)
                    </label>
                  </div>

                  <div className="flex items-center mt-2">
                    <input 
                      type="checkbox" 
                      id="isCrossCutting"
                      checked={currentEvent.isCrossCutting || (courses.find(c => c.id.toString() === currentEvent.courseId)?.isCrossCutting || false)}
                      disabled={courses.find(c => c.id.toString() === currentEvent.courseId)?.isCrossCutting || false}
                      onChange={(e) => handleCrossCuttingChange(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="isCrossCutting" className="text-sm">
                      Cross-Cutting Course {courses.find(c => c.id.toString() === currentEvent.courseId)?.isCrossCutting ? '(This course is already marked as cross-cutting)' : ''}
                    </label>
                  </div>
                  
                  {/* Department selection for cross-cutting courses */}
                  {(currentEvent.isCrossCutting || courses.find(c => c.id.toString() === currentEvent.courseId)?.isCrossCutting) && (
                    <div className="mt-3 pl-6">
                      <label className="block text-sm font-medium mb-2">Cross-cutting setup:</label>
                      
                      {/* Program selection within department */}
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Select programs within your department:</p>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2 rounded">
                          {allPrograms
                            .filter(program => {
                              const dept = allDepartments.find(d => d.id === program.departmentId);
                              return dept?.name === userDepartment;
                            })
                            .map(program => (
                              <div key={program.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`prog-${program.id}`}
                                  checked={currentEvent.crossCuttingPrograms.includes(program.id)}
                                  onChange={() => handleProgramSelection(program.id)}
                                  className="mr-2"
                                />
                                <label htmlFor={`prog-${program.id}`} className="text-sm">
                                  {program.code} - {program.name}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Only admins can set cross-cutting across departments */}
                      {userRole === 'admin' && (
                        <div>
                          <p className="text-sm font-medium mb-1">Select departments for cross-department courses:</p>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2 rounded">
                            {allDepartments.map(dept => (
                              <div key={dept.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`dept-${dept.id}`}
                                  checked={currentEvent.crossCuttingDepartments.includes(dept.id)}
                                  onChange={() => handleDepartmentSelection(dept.id)}
                                  className="mr-2"
                                />
                                <label htmlFor={`dept-${dept.id}`} className="text-sm">
                                  {dept.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Schedule check information */}
                  <div className={`p-3 mt-4 rounded-lg ${
                    darkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                        Schedule Check
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      The system will automatically check for collisions with existing lectures for the same lecturer, room, or student groups.
                    </p>
                  </div>
                  
                  {/* Cross-cutting explanation (conditionally rendered) */}
                  {(courses.find(c => c.id.toString() === currentEvent.courseId)?.isCrossCutting || currentEvent.isCrossCutting) && (
                    <div className={`p-3 mt-4 rounded-lg ${
                      darkMode ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-purple-50 border border-purple-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Calendar className={`h-5 w-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                        <span className={`text-sm font-medium ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                          Cross-Cutting Course
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                        This course will appear in the schedules of all departments and programs. It is viewable by all Heads of Departments.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={resetAndCloseModal}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleAddEvent}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700`}
                >
                  Schedule Lecture
                </button>
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
                      Setting the semester dates helps in planning and visualizing the entire academic period.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={() => setShowSemesterModal(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={() => {
                    // Validate dates
                    if (new Date(semesterDates.startDate) >= new Date(semesterDates.endDate)) {
                      alert('End date must be after start date');
                      return;
                    }
                    
                    // Save semester dates
                    alert(`Semester dates set from ${semesterDates.startDate} to ${semesterDates.endDate}`);
                    setShowSemesterModal(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700`}
                >
                  Save Dates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ScheduleCalendar.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  userDepartment: PropTypes.string
};

export default ScheduleCalendar; 