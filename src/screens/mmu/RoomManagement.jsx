import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Building, Edit, PlusCircle, Search, Trash } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase/firebase';

const RoomManagement = ({ darkMode, userRole }) => {
  // Only admins should have full access to this screen
  const isAdmin = userRole === 'admin';
  
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentRoom, setCurrentRoom] = useState({
    name: '',
    building: '',
    capacity: '',
    type: 'lecture', // 'lecture' or 'lab'
    facilities: [],
    notes: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState('');

  // Available room facilities
  const availableFacilities = [
    'Projector', 'Smart Board', 'Computer Workstations', 'WiFi', 
    'Air Conditioning', 'Sound System', 'Lab Equipment', 'Videoconferencing'
  ];

  // Fetch rooms data
  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        // Fetch rooms
        const roomsSnapshot = await getDocs(collection(db, 'rooms'));
        const roomsData = roomsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRooms(roomsData);

        // Extract unique buildings
        const uniqueBuildings = [...new Set(roomsData.map(room => room.building))].filter(Boolean);
        setBuildings(uniqueBuildings);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        toast.error('Failed to load rooms data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(room => {
    const query = searchQuery.toLowerCase();
    return (
      room.name.toLowerCase().includes(query) ||
      room.building.toLowerCase().includes(query) ||
      room.type.toLowerCase().includes(query) ||
      (room.notes && room.notes.toLowerCase().includes(query))
    );
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentRoom(prev => ({
      ...prev,
      [name]: name === 'capacity' ? (value === '' ? '' : parseInt(value)) : value
    }));
  };

  // Add facility to room
  const handleAddFacility = () => {
    if (selectedFacility && !currentRoom.facilities.includes(selectedFacility)) {
      setCurrentRoom(prev => ({
        ...prev,
        facilities: [...prev.facilities, selectedFacility]
      }));
      setSelectedFacility('');
    }
  };

  // Remove facility from room
  const handleRemoveFacility = (facility) => {
    setCurrentRoom(prev => ({
      ...prev,
      facilities: prev.facilities.filter(f => f !== facility)
    }));
  };

  // Reset form
  const resetForm = () => {
    setCurrentRoom({
      name: '',
      building: '',
      capacity: '',
      type: 'lecture',
      facilities: [],
      notes: ''
    });
    setEditMode(false);
    setSelectedFacility('');
    setShowAddModal(false);
  };

  // Submit form to add or edit room
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!currentRoom.name || !currentRoom.building || !currentRoom.capacity) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editMode) {
        // Update existing room
        await updateDoc(doc(db, 'rooms', currentRoom.id), {
          name: currentRoom.name,
          building: currentRoom.building,
          capacity: currentRoom.capacity,
          type: currentRoom.type,
          facilities: currentRoom.facilities,
          notes: currentRoom.notes,
          updatedAt: new Date()
        });
        
        // Update local state
        setRooms(prev => prev.map(room => 
          room.id === currentRoom.id ? { ...currentRoom, updatedAt: new Date() } : room
        ));
        
        toast.success('Room updated successfully');
      } else {
        // Add new room
        const docRef = await addDoc(collection(db, 'rooms'), {
          name: currentRoom.name,
          building: currentRoom.building,
          capacity: currentRoom.capacity,
          type: currentRoom.type,
          facilities: currentRoom.facilities,
          notes: currentRoom.notes,
          createdAt: new Date()
        });
        
        // Update local state
        setRooms(prev => [...prev, { 
          id: docRef.id, 
          ...currentRoom, 
          createdAt: new Date() 
        }]);
        
        // Update buildings list if necessary
        if (!buildings.includes(currentRoom.building)) {
          setBuildings(prev => [...prev, currentRoom.building]);
        }
        
        toast.success('Room added successfully');
      }
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error(editMode ? 'Failed to update room' : 'Failed to add room');
    }
  };

  // Edit room
  const handleEditRoom = (room) => {
    setCurrentRoom(room);
    setEditMode(true);
    setShowAddModal(true);
  };

  // Delete room
  const handleDeleteRoom = async (roomId) => {
    if (window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
        setRooms(prev => prev.filter(room => room.id !== roomId));
        toast.success('Room deleted successfully');
      } catch (error) {
        console.error('Error deleting room:', error);
        toast.error('Failed to delete room');
      }
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Room Management
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Manage lecture rooms and laboratories
          </p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className={`mt-4 md:mt-0 flex items-center px-4 py-2 rounded-lg ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            <span>Add New Room</span>
          </button>
        )}
      </div>
      
      {/* Search and filters */}
      <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search rooms..."
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
      </div>
      
      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-lg font-medium text-gray-500 dark:text-gray-400">Loading rooms...</span>
        </div>
      ) : (
        <>
          {/* Rooms list */}
          {filteredRooms.length === 0 ? (
            <div className={`p-6 rounded-lg text-center ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} shadow-md`}>
              <Building className="mx-auto h-12 w-12 mb-3 text-gray-400" />
              <p className="text-lg mb-2">No rooms found</p>
              <p>
                {searchQuery 
                  ? `No rooms match your search for "${searchQuery}"`
                  : 'Start by adding some rooms to the system'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map(room => (
                <div 
                  key={room.id} 
                  className={`rounded-lg shadow-md overflow-hidden ${
                    darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
                  }`}
                >
                  <div className={`p-4 ${room.type === 'lab' 
                    ? (darkMode ? 'bg-blue-900/30 border-b border-blue-900/50' : 'bg-blue-50 border-b border-blue-100') 
                    : (darkMode ? 'bg-gray-700/50 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200')
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {room.name}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {room.building}
                        </p>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        room.type === 'lab' 
                          ? (darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800') 
                          : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800')
                      }`}>
                        {room.type === 'lab' ? 'Laboratory' : 'Lecture Room'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between mb-3">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Capacity:</span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{room.capacity} seats</span>
                    </div>
                    
                    {room.facilities && room.facilities.length > 0 && (
                      <div className="mb-3">
                        <span className={`text-sm block mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Facilities:</span>
                        <div className="flex flex-wrap gap-2">
                          {room.facilities.map(facility => (
                            <span 
                              key={facility} 
                              className={`text-xs px-2 py-1 rounded-full ${
                                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {facility}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {room.notes && (
                      <div className="mb-3">
                        <span className={`text-sm block mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Notes:</span>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{room.notes}</p>
                      </div>
                    )}
                    
                    {isAdmin && (
                      <div className="flex justify-end mt-4 gap-2">
                        <button
                          onClick={() => handleEditRoom(room)}
                          className={`p-2 rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className={`p-2 rounded-md ${
                            darkMode 
                              ? 'bg-red-900/20 hover:bg-red-900/30 text-red-400' 
                              : 'bg-red-50 hover:bg-red-100 text-red-600'
                          }`}
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Add/Edit Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={resetForm}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editMode ? 'Edit Room' : 'Add New Room'}
                  </h3>
                  <button 
                    onClick={resetForm}
                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Modal body */}
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Room Name*
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={currentRoom.name}
                          onChange={handleInputChange}
                          required
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                          placeholder="e.g. LR-101"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Building*
                        </label>
                        <input
                          type="text"
                          name="building"
                          value={currentRoom.building}
                          onChange={handleInputChange}
                          required
                          list="buildings"
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                          placeholder="e.g. Science Block"
                        />
                        <datalist id="buildings">
                          {buildings.map((building, index) => (
                            <option key={index} value={building} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Capacity*
                        </label>
                        <input
                          type="number"
                          name="capacity"
                          value={currentRoom.capacity}
                          onChange={handleInputChange}
                          required
                          min="1"
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                          placeholder="e.g. 40"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Room Type*
                        </label>
                        <select
                          name="type"
                          value={currentRoom.type}
                          onChange={handleInputChange}
                          required
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        >
                          <option value="lecture">Lecture Room</option>
                          <option value="lab">Laboratory</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Facilities
                      </label>
                      <div className="flex gap-2 mb-2">
                        <select
                          value={selectedFacility}
                          onChange={(e) => setSelectedFacility(e.target.value)}
                          className={`flex-grow p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        >
                          <option value="">Select a facility</option>
                          {availableFacilities
                            .filter(f => !currentRoom.facilities.includes(f))
                            .map(facility => (
                              <option key={facility} value={facility}>{facility}</option>
                            ))
                          }
                        </select>
                        <button
                          type="button"
                          onClick={handleAddFacility}
                          disabled={!selectedFacility}
                          className={`px-3 py-1 rounded-md ${
                            darkMode 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-200 disabled:text-gray-400'
                          }`}
                        >
                          Add
                        </button>
                      </div>
                      
                      {currentRoom.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {currentRoom.facilities.map(facility => (
                            <div 
                              key={facility} 
                              className={`inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full ${
                                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {facility}
                              <button
                                type="button"
                                onClick={() => handleRemoveFacility(facility)}
                                className="ml-1 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={currentRoom.notes}
                        onChange={handleInputChange}
                        rows="3"
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        placeholder="Any additional information about this room..."
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                {/* Modal footer */}
                <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                  <button 
                    type="button"
                    onClick={resetForm}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                  
                  <button 
                    type="submit"
                    className={`px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700`}
                  >
                    {editMode ? 'Update Room' : 'Add Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

RoomManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired
};

export default RoomManagement; 