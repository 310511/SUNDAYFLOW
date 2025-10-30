import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FakeMapView from "@/components/FakeMapView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  Heart,
  Share,
  MapPin,
  Wifi,
  Car,
  Coffee,
  Users,
  Calendar,
  ArrowLeft,
  Waves,
  Dumbbell,
  UtensilsCrossed,
  Shield,
  AirVent,
  Tv,
  Bath,
  Bed,
  Shirt,
} from "lucide-react";
import Loader from "@/components/ui/Loader";
import HotelRoomDetails from "@/components/HotelRoomDetails";
import HotelMap from "@/components/HotelMap";
import { AvailabilitySection } from "@/components/AvailabilitySection";
import { prebookHotel } from "@/services/bookingapi";
import { searchHotels, getHotelDetails } from "@/services/hotelApi";
import { APP_CONFIG, getCurrentDate, getDateFromNow } from "@/config/constants";
import { storeHotelAndRoom } from "@/services/hotelStorageApi";
import { addToWishlist, isHotelInWishlist, removeFromWishlist } from "@/services/wishlistApi";
import { useAuth } from "@/hooks/useAuth";
import { hotels as localHotels } from "@/data/hotels";
import { getCurrencySymbol, convertHotelPrices } from "@/services/currencyConverter";

const HotelDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  // Extract search parameters (will be redefined below)
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCheckingWishlist, setIsCheckingWishlist] = useState(false);
  const [hotelDetails, setHotelDetails] = useState<any>(null);
  const [hotelCoordinates, setHotelCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setIsLoading] = useState(false);
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [selectedBookingCode, setSelectedBookingCode] = useState<string | null>(null);
  const [prebookLoading, setPrebookLoading] = useState(false);
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const [searchingForBookingCode, setSearchingForBookingCode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [searchingAvailability, setSearchingAvailability] = useState(false);
  // console.log(HotelDetails , " details")
  console.log(id ,'id')
  
  // Extract search parameters at component level
  const checkIn = urlSearchParams.get("checkIn");
  const checkOut = urlSearchParams.get("checkOut");
  const guests = urlSearchParams.get("guests");
  const adults = parseInt(urlSearchParams.get("adults") || "2");
  const children = parseInt(urlSearchParams.get("children") || "0");
  const rooms = urlSearchParams.get("rooms");
  const childrenAgesParam = urlSearchParams.get("childrenAges");
  const roomGuestsParam = urlSearchParams.get("roomGuests");
  
  // Parse children ages
  const childrenAges = childrenAgesParam 
    ? childrenAgesParam.split(",").map(age => parseInt(age))
    : [];
  
  // Parse room guests distribution
  const roomGuests = roomGuestsParam
    ? JSON.parse(roomGuestsParam)
    : [];

  // Handler for availability changes
  const handleAvailabilityChange = async (params: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    rooms: number;
    childrenAges?: number[];
    roomGuests?: any[];
  }) => {
    console.log('🔄 Availability changed:', params);
    setSearchingAvailability(true);
    
    try {
      // Build PaxRooms structure for availability check
      let paxRooms;
      
      if (params.roomGuests && params.roomGuests.length > 0) {
        // Use detailed room guest distribution
        paxRooms = params.roomGuests.map((room: any) => ({
          Adults: room.adults || 1,
          Children: room.children || 0,
          ChildrenAges: room.childrenAges || [],
        }));
        console.log('✅ Using detailed room guest distribution:', paxRooms);
      } else {
        // Distribute guests across rooms
        const roomsCount = params.rooms;
        const adultsPerRoom = Math.floor(params.adults / roomsCount);
        const childrenPerRoom = Math.floor(params.children / roomsCount);
        
        paxRooms = Array.from({ length: roomsCount }, (_, index) => {
          const isLastRoom = index === roomsCount - 1;
          const roomAdults = isLastRoom ? params.adults - (adultsPerRoom * (roomsCount - 1)) : adultsPerRoom;
          const roomChildren = isLastRoom ? params.children - (childrenPerRoom * (roomsCount - 1)) : childrenPerRoom;
          
          const startIdx = index * childrenPerRoom;
          const endIdx = isLastRoom ? params.childrenAges?.length || 0 : startIdx + childrenPerRoom;
          const roomChildrenAges = params.childrenAges?.slice(startIdx, endIdx) || [];
          
          return {
            Adults: Math.max(1, roomAdults),
            Children: roomChildren,
            ChildrenAges: roomChildrenAges,
          };
        });
        console.log('✅ Using distributed guests across rooms:', paxRooms);
      }
      
      // Check hotel availability for new dates and guests
      console.log('🔍 Checking hotel availability for new parameters...');
      
      // Get nationality and currency from URL params
      const nationality = urlSearchParams.get("nationality") || APP_CONFIG.DEFAULT_GUEST_NATIONALITY;
      const currency = urlSearchParams.get("currency") || APP_CONFIG.DEFAULT_CURRENCY;
      
      const apiSearchParams = {
        CheckIn: params.checkIn,
        CheckOut: params.checkOut,
        HotelCodes: id,
        GuestNationality: nationality,
        PreferredCurrencyCode: currency,
        PaxRooms: paxRooms,
        IsDetailResponse: true,
        ResponseTime: APP_CONFIG.DEFAULT_RESPONSE_TIME
      };
      
      const searchResponse = await Promise.race([
        searchHotels(apiSearchParams),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Availability check timeout after 60 seconds')), 60000)
        )
      ]);
      console.log('🔍 Availability check response:', searchResponse);
      
      // Convert prices if response is in USD and preferred currency is different
      if (searchResponse?.HotelResult && searchResponse.HotelResult.Currency === "USD" && currency !== "USD") {
        console.log(`💱 Converting search response prices from USD to ${currency}`);
        searchResponse.HotelResult = convertHotelPrices(searchResponse.HotelResult, currency);
      }
      
      // Check if hotel is available
      if (searchResponse?.Status?.Code === '204' || searchResponse?.Status?.Code === 204) {
        console.log('❌ Hotel not available for the selected dates and guests');
        toast({
          title: "Hotel Not Available",
          description: "This hotel is not available for your selected dates and number of guests. Redirecting to search results...",
          variant: "destructive",
        });
        
        // Redirect to search results with the new parameters
        setTimeout(() => {
          const searchParams = new URLSearchParams();
          searchParams.set('checkIn', params.checkIn);
          searchParams.set('checkOut', params.checkOut);
          searchParams.set('adults', params.adults.toString());
          searchParams.set('children', params.children.toString());
          searchParams.set('rooms', params.rooms.toString());
          
          if (params.childrenAges && params.childrenAges.length > 0) {
            searchParams.set('childrenAges', params.childrenAges.join(','));
          }
          
          if (params.roomGuests && params.roomGuests.length > 0) {
            searchParams.set('roomGuests', JSON.stringify(params.roomGuests));
          }
          
          // Get the destination from the current hotel details
          if (hotelDetails) {
            searchParams.set('destination', `${hotelDetails.CityName}, ${hotelDetails.CountryName}`);
          }
          
          navigate(`/search?${searchParams.toString()}`);
          setSearchingAvailability(false);
        }, 2000);
        
        return;
      }
      
      // Check if we got valid hotel results
      if (!searchResponse?.HotelResult?.length || searchResponse.HotelResult.length === 0) {
        console.log('❌ No hotel results found for the new parameters');
        toast({
          title: "Hotel Not Available",
          description: "This hotel is not available for your selected dates and number of guests. Redirecting to search results...",
          variant: "destructive",
        });
        
        // Redirect to search results
        setTimeout(() => {
          const searchParams = new URLSearchParams();
          searchParams.set('checkIn', params.checkIn);
          searchParams.set('checkOut', params.checkOut);
          searchParams.set('adults', params.adults.toString());
          searchParams.set('children', params.children.toString());
          searchParams.set('rooms', params.rooms.toString());
          
          if (params.childrenAges && params.childrenAges.length > 0) {
            searchParams.set('childrenAges', params.childrenAges.join(','));
          }
          
          if (params.roomGuests && params.roomGuests.length > 0) {
            searchParams.set('roomGuests', JSON.stringify(params.roomGuests));
          }
          
          if (hotelDetails) {
            searchParams.set('destination', `${hotelDetails.CityName}, ${hotelDetails.CountryName}`);
          }
          
          navigate(`/search?${searchParams.toString()}`);
          setSearchingAvailability(false);
        }, 2000);
        
        return;
      }
      
      // Hotel is available - update URL and continue
      console.log('✅ Hotel is available! Updating parameters...');
      toast({
        title: "Hotel Available",
        description: "Great! This hotel is available for your selected dates.",
      });
      
      const newParams = new URLSearchParams(urlSearchParams.toString());
      newParams.set('checkIn', params.checkIn);
      newParams.set('checkOut', params.checkOut);
      newParams.set('adults', params.adults.toString());
      newParams.set('children', params.children.toString());
      newParams.set('rooms', params.rooms.toString());
      
      if (params.childrenAges && params.childrenAges.length > 0) {
        newParams.set('childrenAges', params.childrenAges.join(','));
      } else {
        newParams.delete('childrenAges');
      }
      
      // Add room guests distribution if available
      if (params.roomGuests && params.roomGuests.length > 0) {
        newParams.set('roomGuests', JSON.stringify(params.roomGuests));
      }
      
      // Navigate with new parameters - this will trigger a re-search via useEffect
      navigate(`/hotel/${id}?${newParams.toString()}`, { replace: true });
      
      // Scroll to rooms section after a brief delay
      setTimeout(() => {
        const roomsSection = document.getElementById('available-rooms-section');
        if (roomsSection) {
          roomsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setSearchingAvailability(false);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error checking hotel availability:', error);
      toast({
        title: "Error",
        description: "Unable to check hotel availability. Please try again.",
        variant: "destructive",
      });
      setSearchingAvailability(false);
    }
  };

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showRoomDetails) {
        handleCloseRoomDetails();
        }
      }
    };

    if (showRoomDetails) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showRoomDetails]);

   const fetchHotelDetails = async (hotelCode: string) => {
    setIsLoading(true);
    try {
      // Get preferred currency from URL
      const currency = urlSearchParams.get("currency") || "AED";
      
      const response = await getHotelDetails(hotelCode);
      let hotelDetailsData = response.HotelDetails;
      
      // Convert prices from USD to preferred currency
      if (hotelDetailsData && hotelDetailsData.Currency === "USD" && currency !== "USD") {
        console.log(`💱 Converting hotel details prices from USD to ${currency}`);
        hotelDetailsData = convertHotelPrices(hotelDetailsData, currency);
      }
      
      setHotelDetails(hotelDetailsData);
    } catch (error) {
      console.error("Error fetching hotel details from API:", error);
      
      // Fallback to local data if API fails
      console.log("🔄 Attempting to load from local data with ID:", hotelCode);
      const localHotel = localHotels.find(h => h.id === hotelCode);
      
      if (localHotel) {
        console.log("✅ Found hotel in local data:", localHotel.name);
        
        // Transform local hotel data to match API structure
        const transformedHotel = {
          HotelCode: localHotel.id,
          HotelName: localHotel.name,
          HotelRating: localHotel.rating,
          Address: localHotel.location,
          CityName: localHotel.location.split(',')[0] || localHotel.location,
          CountryName: "Saudi Arabia",
          Price: localHotel.price,
          Currency: "USD",
          FrontImage: localHotel.images[0],
          Images: localHotel.images,
          Description: `Welcome to ${localHotel.name}, a ${localHotel.rating}-star accommodation in ${localHotel.location}. Experience comfort and luxury with our premium amenities.`,
          Amenities: localHotel.amenities,
          Latitude: localHotel.coordinates?.lat || 24.7136,
          Longitude: localHotel.coordinates?.lng || 46.6753,
          // Add a flag to indicate this is local data
          _isLocalData: true
        };
        
        setHotelDetails(transformedHotel);
        
        // Set coordinates for map
        if (localHotel.coordinates) {
          setHotelCoordinates({
            lat: localHotel.coordinates.lat,
            lng: localHotel.coordinates.lng
          });
        }
      } else {
        console.error("❌ Hotel not found in local data either");
      }
    } finally {
      setIsLoading(false);
    }
  };



  // const fetchHotelDetails = async (hotelCode: string) => {
  //   setIsLoading(true);
  //   try {
  //     const response = await getHotelDetails(hotelCode);
  //     setHotelDetails(response.HotelDetails);
  //   } catch (error) {
  //     console.error("Error fetching hotel details:", error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const fetchBookingCode = async () => {
    console.log('🔍 fetchBookingCode called with id:', id);
    console.log('🔍 Current state - searchingForBookingCode:', searchingForBookingCode);
    
    if (!id) {
      console.log('❌ No id provided');
      return;
    }
    
    // Check if this is a local hotel (simple numeric ID or ID from local data)
    const isLocalHotel = localHotels.some(h => h.id === id);
    if (isLocalHotel) {
      console.log('ℹ️ This is a local hotel. Skipping booking code fetch.');
      setBookingCode(null);
      return;
    }
    
    // Prevent multiple simultaneous calls
    if (searchingForBookingCode) {
      console.log('⏳ Already searching for booking code, skipping...');
      return;
    }
    
    setSearchingForBookingCode(true);
    console.log('🚀 Starting booking code fetch...');
    try {
      // Use today to tomorrow dates for availability check
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      let parsedCheckIn = checkIn;
      let parsedCheckOut = checkOut;
      
      // If no dates provided in URL, use today to tomorrow
      if (!checkIn || !checkOut) {
        parsedCheckIn = formatDate(today);
        parsedCheckOut = formatDate(tomorrow);
        console.log('📅 Using today to tomorrow dates:', parsedCheckIn, 'to', parsedCheckOut);
      } else {
        // Parse ISO dates to YYYY-MM-DD format
        console.log('📅 Raw checkIn:', checkIn);
        console.log('📅 Raw checkOut:', checkOut);
        
        if (checkIn && checkIn.includes('T')) {
          try {
            parsedCheckIn = new Date(checkIn).toISOString().split('T')[0];
            console.log('📅 Parsed checkIn:', parsedCheckIn);
          } catch (error) {
            console.error('Error parsing checkIn date:', checkIn, error);
            parsedCheckIn = formatDate(today);
          }
        }
        
        if (checkOut && checkOut.includes('T')) {
          try {
            parsedCheckOut = new Date(checkOut).toISOString().split('T')[0];
            console.log('📅 Parsed checkOut:', parsedCheckOut);
          } catch (error) {
            console.error('Error parsing checkOut date:', checkOut, error);
            parsedCheckOut = formatDate(tomorrow);
          }
        }
      }
      
      console.log('👥 Raw guests:', guests);
      console.log('🏠 Raw rooms:', rooms);
      
      // Always proceed with search since we now provide default dates
      console.log('✅ Proceeding with search using dates:', parsedCheckIn, 'to', parsedCheckOut);
      // Use rooms parameter if available, otherwise default to 1
      const roomsCount = rooms ? parseInt(rooms) : 1;
      
      console.log('🏠 roomsCount:', roomsCount);
      console.log('👥 adults:', adults);
      console.log('👶 children:', children);
      console.log('📋 roomGuests:', roomGuests);
      console.log('📋 roomGuests length:', roomGuests?.length);
      console.log('📋 roomGuests content:', JSON.stringify(roomGuests, null, 2));
      console.log('🔍 URL params - adults:', urlSearchParams.get("adults"));
      console.log('🔍 URL params - children:', urlSearchParams.get("children"));
      console.log('🔍 URL params - rooms:', urlSearchParams.get("rooms"));
      console.log('🔍 URL params - roomGuests:', urlSearchParams.get("roomGuests"));
      
      // Validate that parsing was successful
      if (isNaN(roomsCount)) {
        console.log('❌ Invalid room count');
        setBookingCode(null);
        return;
      }
      
      // Build PaxRooms structure based on room guest distribution or defaults
      let paxRooms;
      
      // Check if roomGuests has meaningful data (not just default 1 adult per room)
      const hasDetailedRoomGuests = roomGuests && roomGuests.length > 0 && 
        roomGuests.some((room: any) => room.adults > 1 || room.children > 0);
      
      if (hasDetailedRoomGuests) {
        // Use the detailed room guest distribution from search bar
        paxRooms = roomGuests.map((room: any) => ({
          Adults: room.adults || 1,
          Children: room.children || 0,
          ChildrenAges: room.childrenAges || [],
        }));
        console.log('✅ Using detailed room guest distribution:', paxRooms);
      } else {
        // Fallback: distribute guests across rooms
        const adultsPerRoom = Math.floor(adults / roomsCount);
        const childrenPerRoom = Math.floor(children / roomsCount);
        
        paxRooms = Array.from({ length: roomsCount }, (_, index) => {
          const isLastRoom = index === roomsCount - 1;
          const roomAdults = isLastRoom ? adults - (adultsPerRoom * (roomsCount - 1)) : adultsPerRoom;
          const roomChildren = isLastRoom ? children - (childrenPerRoom * (roomsCount - 1)) : childrenPerRoom;
          
          // Distribute children ages across rooms
          const startIdx = index * childrenPerRoom;
          const endIdx = isLastRoom ? childrenAges.length : startIdx + childrenPerRoom;
          const roomChildrenAges = childrenAges.slice(startIdx, endIdx);
          
          return {
            Adults: Math.max(1, roomAdults), // At least 1 adult per room
            Children: roomChildren,
            ChildrenAges: roomChildrenAges,
          };
        });
        console.log('✅ Using distributed guests across rooms:', paxRooms);
      }
      
      // Get nationality and currency from URL params
      const nationality = urlSearchParams.get("nationality") || APP_CONFIG.DEFAULT_GUEST_NATIONALITY;
      const currency = urlSearchParams.get("currency") || APP_CONFIG.DEFAULT_CURRENCY;
      
      const apiSearchParams = {
        CheckIn: parsedCheckIn,
        CheckOut: parsedCheckOut,
        HotelCodes: id,
        GuestNationality: nationality,
        PreferredCurrencyCode: currency,
        PaxRooms: paxRooms,
        IsDetailResponse: true,
        ResponseTime: APP_CONFIG.DEFAULT_RESPONSE_TIME
      };
      
      // Try to get booking code from hotel details first (faster)
      console.log('🚀 Trying to get booking code from hotel details...');
      try {
        const hotelDetailsResponse = await getHotelDetails(id);
          if (hotelDetailsResponse?.Rooms?.BookingCode) {
            console.log('✅ Found booking code from hotel details:', hotelDetailsResponse.Rooms.BookingCode);
            setBookingCode(hotelDetailsResponse.Rooms.BookingCode);
            return;
          }
        } catch (error) {
          console.log('⚠️ Hotel details approach failed, trying search API...');
        }
        
        // Fallback to search API
        console.log('🔍 Calling search API to get booking code...');
        const searchResponse = await Promise.race([
          searchHotels(apiSearchParams),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Search request timeout after 60 seconds')), 60000)
          )
        ]);
        
        console.log('🔍 Search response:', searchResponse);
        console.log('🔍 HotelResult:', searchResponse?.HotelResult);
        
        // Convert prices if response is in USD and preferred currency is different
        if (searchResponse?.HotelResult && currency !== "USD") {
          const hotelResult = searchResponse.HotelResult;
          if (Array.isArray(hotelResult)) {
            searchResponse.HotelResult = hotelResult.map((hotel: any) => 
              hotel.Currency === "USD" ? convertHotelPrices(hotel, currency) : hotel
            );
          } else if (hotelResult.Currency === "USD") {
            searchResponse.HotelResult = convertHotelPrices(hotelResult, currency);
          }
          console.log(`💱 Converted booking code search prices to ${currency}`);
        }
        
        // Check if hotel is available
        if (searchResponse?.Status?.Code === '204' || searchResponse?.Status?.Code === 204) {
          console.log('❌ Hotel not available for the selected dates');
          toast({
            title: "Hotel Not Available",
            description: "This hotel is not available for today to tomorrow. Please try different dates or select another hotel.",
            variant: "destructive",
          });
          setBookingCode(null);
          return;
        }
        
        if (searchResponse?.HotelResult) {
          const hotel = searchResponse.HotelResult;
          console.log('🔍 Hotel data:', hotel);
          console.log('🔍 Is array?', Array.isArray(hotel));
          
          // Handle both array and object structures
          if (Array.isArray(hotel)) {
            console.log('🔍 Array length:', hotel.length);
            const foundHotel = hotel.find(h => h.HotelCode === id);
            console.log('🔍 Found hotel:', foundHotel);
            
            if (foundHotel) {
              // Extract coordinates - API uses "Lattitude" with double 't'
              if (foundHotel.Lattitude !== undefined && foundHotel.Longitude !== undefined) {
                const lat = parseFloat(foundHotel.Lattitude);
                const lng = parseFloat(foundHotel.Longitude);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                  setHotelCoordinates({ lat, lng });
                  console.log('🗺️ Set coordinates from found hotel:', { lat, lng });
                } else {
                  console.log('⚠️ Coordinates are not valid numbers');
                }
              } else {
                console.log('⚠️ No coordinates in found hotel');
              }
              
              if (foundHotel.Rooms) {
                
                if (Array.isArray(foundHotel.Rooms) && foundHotel.Rooms.length > 0) {
                  const foundBookingCode = foundHotel.Rooms[0].BookingCode;
                  setBookingCode(foundBookingCode);
                  console.log('✅ Found booking code from search (array):', foundBookingCode);
                  return;
                } else if (foundHotel.Rooms.BookingCode) {
                  // Handle object structure where Rooms is an object
                  const foundBookingCode = foundHotel.Rooms.BookingCode;
                  setBookingCode(foundBookingCode);
                  console.log('✅ Found booking code from search (object):', foundBookingCode);
                  return;
                }
              }
            }
          } else if (hotel.HotelCode) {
            // Extract coordinates - API uses "Lattitude" with double 't'
            if (hotel.Lattitude && hotel.Longitude) {
              setHotelCoordinates({
                lat: parseFloat(hotel.Lattitude),
                lng: parseFloat(hotel.Longitude)
              });
              console.log('🗺️ Set coordinates from single hotel:', {
                lat: hotel.Lattitude,
                lng: hotel.Longitude
              });
            }
            
            // Handle object structure where Rooms is an object
            if (hotel.Rooms && (hotel.HotelCode === id || hotel.HotelCode === String(id))) {
              if (hotel.Rooms.BookingCode) {
                const foundBookingCode = hotel.Rooms.BookingCode;
                setBookingCode(foundBookingCode);
                console.log('✅ Found booking code from search (single):', foundBookingCode);
                return;
              }
            }
          } else {
            console.log('⚠️ Unknown hotel structure:', hotel);
          }
        }
        
        // If we reach here, no booking code was found
        console.log('❌ No booking code found for hotel');
        toast({
          title: "Booking Code Not Available",
          description: "Unable to get booking information for this hotel. Please try again later.",
          variant: "destructive",
        });
        setBookingCode(null);
      }
    catch (error) {
      console.error("Error fetching booking code:", error);
      // Set booking code to null if search fails
      setBookingCode(null);
    } finally {
      setSearchingForBookingCode(false);
    }
  };

  const handleViewRoomDetails = (bookingCode: string) => {
    setSelectedBookingCode(bookingCode);
    setShowRoomDetails(true);
  };

  const handleCloseRoomDetails = () => {
    setShowRoomDetails(false);
    setSelectedBookingCode(null);
  };

  const handleRoomSelect = (room: any) => {
    setSelectedRoom(room);
    setBookingCode(room.BookingCode);
    console.log("Selected room:", room);
    // Close the room details after selection
    setShowRoomDetails(false);
  };


  const handleReserveClick = async () => {
    console.log("🔍 Debug - checkIn:", checkIn);
    console.log("🔍 Debug - checkOut:", checkOut);
    console.log("🔍 Debug - guests:", guests);
    console.log("🔍 Debug - rooms:", rooms);
    
    // 🔒 SECURITY: Check if user is logged in FIRST
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in or sign up before reserving a room.",
        variant: "destructive",
      });
      // Scroll to top to show login button
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Check if a room is selected
    if (!selectedRoom) {
      toast({
        title: "Room Selection Required",
        description: "Please select a room before proceeding to reserve.",
        variant: "destructive",
      });
      return;
    }
    
    if (!bookingCode) {
      console.error("No booking code available, trying to fetch again...");
      // Try to fetch booking code again
      await fetchBookingCode();
      if (!bookingCode) {
        toast({
          title: "Booking Code Missing",
          description: "Booking code is not available. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setPrebookLoading(true);
    try {
      console.log("🔒 Starting prebook process with booking code:", bookingCode);

      const prebookResponse = await prebookHotel({
        BookingCode: bookingCode,
        PaymentMode: "Limit",
      });

      console.log("✅ Prebook successful:", prebookResponse);

      // Check if prebook was successful
      if (prebookResponse.Status && prebookResponse.Status.Code === "200") {
        // Generate booking reference ID (user is guaranteed to be logged in at this point)
        try {
          const userData = JSON.parse(localStorage.getItem('userData') || 'null');
          if (userData && userData.customer_id) {
            console.log("🔍 Generating booking reference ID...");
            const { generateBookingReference } = await import('@/services/authApi');
            const bookingRefResult = await generateBookingReference(userData.customer_id);
            localStorage.setItem('booking_reference_id', bookingRefResult.booking_reference_id);
            console.log("✅ Booking reference ID generated:", bookingRefResult.booking_reference_id);
          } else {
            // This should never happen now, but keeping as failsafe
            console.error("❌ User data missing despite authentication check!");
            toast({
              title: "Authentication Error",
              description: "Please log out and log in again.",
              variant: "destructive",
            });
            setPrebookLoading(false);
            return;
          }
        } catch (refError) {
          console.error("⚠️ Failed to generate booking reference:", refError);
          toast({
            title: "Booking Reference Error",
            description: "Failed to generate booking reference. Please try again.",
            variant: "destructive",
          });
          setPrebookLoading(false);
          return;
        }
        
        // Store hotel and room details in custom backend before navigating
        try {
          console.log("💾 Storing hotel and room details to custom backend...");
          
          if (hotelDetails && selectedRoom) {
            await storeHotelAndRoom(hotelDetails, selectedRoom, bookingCode);
            console.log("✅ Hotel and room details stored successfully");
          } else {
            console.warn("⚠️ Missing hotel or room data for storage");
            console.warn("  - Hotel data:", hotelDetails ? 'Available' : 'MISSING');
            console.warn("  - Room data:", selectedRoom ? 'Available' : 'MISSING');
          }
        } catch (storageError) {
          console.error("❌ Failed to store hotel/room details:", storageError);
          // Don't fail the booking if storage fails, just log it
        }

        // Store the BookingCode with prebook data (prebook returns same code)
        console.log('🔑 BookingCode from selected room:', bookingCode);
        console.log('🔑 This BookingCode will be used throughout: Search → Prebook → Booking');
        
        // Convert prebook response prices from USD to preferred currency
        const currency = urlSearchParams.get("currency") || "AED";
        let convertedPrebookResponse = prebookResponse;
        
        if (prebookResponse.HotelResult && prebookResponse.HotelResult.Currency === "USD" && currency !== "USD") {
          console.log(`💱 Converting prebook response prices from USD to ${currency}`);
          convertedPrebookResponse = {
            ...prebookResponse,
            HotelResult: convertHotelPrices(prebookResponse.HotelResult, currency)
          };
        }
        
        // Add BookingCode to prebookData for easy access
        convertedPrebookResponse = {
          ...convertedPrebookResponse,
          BookingCode: bookingCode // Ensure BookingCode is at top level
        };

        // Navigate to booking page with hotel code and prebook data
        navigate(`/booking/${hotelDetails.HotelCode}`, {
          state: {
            prebookData: convertedPrebookResponse,
            bookingCode: bookingCode, // Same BookingCode from room selection
            selectedRoom: selectedRoom, // Pass the selected room with its BookingCode
            hotelDetails: hotelDetails,
            checkIn: checkIn,
            checkOut: checkOut,
            guests: guests,
            rooms: rooms,
            adults: adults,
            children: children,
            childrenAges: childrenAges,
            roomGuests: roomGuests,
          },
        });
      } else {
        // Handle prebook failure
        console.error("Prebook failed:", prebookResponse);
        alert(
          `Prebook failed: ${
            prebookResponse.Status?.Description || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("💥 Prebook error:", error);
      alert(
        `Prebook failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setPrebookLoading(false);
    }
  };


  // Check if hotel is in wishlist
  const checkWishlistStatus = async () => {
    if (!user || !user.customer_id || !id) return;
    
    setIsCheckingWishlist(true);
    try {
      const inWishlist = await isHotelInWishlist(user.customer_id, id);
      setIsFavorite(inWishlist);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    } finally {
      setIsCheckingWishlist(false);
    }
  };

  // Handle wishlist toggle
  const handleWishlistToggle = async () => {
    if (!isAuthenticated || !user || !user.customer_id) {
      toast({
        title: "Login Required",
        description: "Please log in to add hotels to your wishlist.",
        variant: "destructive",
      });
      return;
    }

    if (!hotelDetails) return;

    try {
      if (!isFavorite) {
        // Add to wishlist with current search parameters
        await addToWishlist({
          customer_id: user.customer_id,
          hotel_code: hotelDetails.HotelCode,
          hotel_name: hotelDetails.HotelName,
          hotel_rating: hotelDetails.HotelRating || 0,
          address: hotelDetails.Address,
          city: hotelDetails.CityName,
          country: hotelDetails.CountryName,
          price: hotelDetails.Price || 0,
          currency: hotelDetails.Currency || 'USD',
          image_url: hotelDetails.FrontImage || (hotelDetails.Images && hotelDetails.Images[0]) || '',
          search_params: {
            checkIn: checkIn || '',
            checkOut: checkOut || '',
            guests: guests || '',
            adults: adults.toString(),
            children: children.toString(),
            rooms: rooms || '',
            childrenAges: childrenAgesParam || '',
            roomGuests: roomGuestsParam || '',
          },
        });

        setIsFavorite(true);
        toast({
          title: "Added to Wishlist",
          description: `${hotelDetails.HotelName} has been added to your wishlist.`,
        });
      } else {
        // Remove from wishlist
        await removeFromWishlist(user.customer_id, hotelDetails.HotelCode);
        
        setIsFavorite(false);
        toast({
          title: "Removed from Wishlist",
          description: `${hotelDetails.HotelName} has been removed from your wishlist.`,
        });
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (id) {
      fetchHotelDetails(id);
      fetchBookingCode();
      checkWishlistStatus();
    }
  }, [id, urlSearchParams, user]);

  if (loading) {
    return <Loader />;
  }

  console.log(HotelDetails , " details")

  if (!hotelDetails) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="w-full px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Hotel Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The hotel you're looking for doesn't exist.
          </p>
          <Link to="/search">
            <Button>Back to Search</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (html: string) => {
    return html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/andlt;/g, '<')
      .replace(/andgt;/g, '>')
      .replace(/andamp;/g, '&')
      .replace(/andquot;/g, '"')
      .replace(/and#39;/g, "'");
  };

  // Helper function to extract sections from description
  const extractSections = (description: string) => {
    const decoded = decodeHtmlEntities(description);
    const sections: { [key: string]: string } = {};
    
    // Extract different sections using regex
    const sectionRegex = /<b>([^<]+)<\/b><br\s*\/?>(.*?)(?=<b>|$)/gs;
    let match;
    
    while ((match = sectionRegex.exec(decoded)) !== null) {
      const sectionName = match[1].trim();
      const sectionContent = match[2].trim();
      sections[sectionName] = sectionContent;
    }
    
    return sections;
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case "wifi":
      case "free wifi":
        return <Wifi className="h-4 w-4" />;
      case "parking":
        return <Car className="h-4 w-4" />;
      case "restaurant":
        return <Coffee className="h-4 w-4" />;
      case "pool":
        return <Waves className="h-4 w-4" />;
      case "gym":
        return <Dumbbell className="h-4 w-4" />;
      case "spa":
        return <Bath className="h-4 w-4" />;
      case "ac":
      case "air conditioning":
        return <AirVent className="h-4 w-4" />;
      case "kitchen":
        return <UtensilsCrossed className="h-4 w-4" />;
      case "tv":
        return <Tv className="h-4 w-4" />;
      case "concierge":
        return <Users className="h-4 w-4" />;
      case "workspace":
        return <Bed className="h-4 w-4" />;
      case "laundry":
        return <Shirt className="h-4 w-4" />;
      case "security":
      case "24/7 support":
        return <Shield className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main
        className="w-full px-6 lg:px-8 py-8 pt-header-plus-25"
        style={{
          paddingTop: "calc(var(--header-height-default) + 41px + 19px)",
        }}
      >
        {/* Back Button */}
        <div className="mb-6">
          <Link to="/search">
            <Button variant="ghost" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to search</span>
            </Button>
          </Link>
        </div>

        {/* Hotel Images */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="aspect-[4/3] relative overflow-hidden rounded-xl group">
              <img
                src={
                  hotelDetails.Images?.[currentImageIndex] || 
                  hotelDetails.FrontImage || 
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop"
                }
                alt={`${hotelDetails.HotelName} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-300"
              />
              
              {/* Image Navigation Arrows */}
              {hotelDetails.Images && hotelDetails.Images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => 
                      prev === 0 ? hotelDetails.Images.length - 1 : prev - 1
                    )}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-800" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => 
                      prev === hotelDetails.Images.length - 1 ? 0 : prev + 1
                    )}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-800 rotate-180" />
                  </button>
                  
                  {/* Image Counter */}
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {hotelDetails.Images.length}
                  </div>
                  
                  {/* Dot Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {hotelDetails.Images.slice(0, 5).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex 
                            ? 'bg-white w-6' 
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                      />
                    ))}
                    {hotelDetails.Images.length > 5 && (
                      <span className="text-white text-xs ml-1">+{hotelDetails.Images.length - 5}</span>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Thumbnail Grid */}
            {hotelDetails.Images && hotelDetails.Images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {hotelDetails.Images.slice(0, 5).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex 
                        ? 'border-primary scale-105' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hotel Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {/* API does not provide isNew; can skip */}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon">
                    <Share className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleWishlistToggle}
                    disabled={isCheckingWishlist}
                  >
                    <Heart
                      className={`h-4 w-4 transition-all ${
                        isFavorite ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </Button>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-foreground mb-2">
                {hotelDetails.HotelName}
              </h1>

              <div className="flex items-center space-x-4 text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-black text-black" />
                  <span className="font-medium">
                    {hotelDetails.HotelRating
                      ? hotelDetails.HotelRating
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {hotelDetails.Address}, {hotelDetails.CityName},{" "}
                    {hotelDetails.CountryName}
                  </span>
                </div>
              </div>

              {/* Available Rooms Section - Only show for API hotels */}
              {!hotelDetails._isLocalData && (
                <div id="available-rooms-section" className="mt-8">
                  <div className="space-y-4">
                    {/* Show selected room summary if available */}
                    {selectedRoom && !showRoomDetails && (
                      <div className="border border-primary rounded-lg p-4 bg-primary/5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{selectedRoom.Name}</h4>
                            <p className="text-sm text-muted-foreground">{selectedRoom.MealType}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={selectedRoom.IsRefundable === "true" ? "default" : "destructive"}>
                                {selectedRoom.IsRefundable === "true" ? "Refundable" : "Non-Refundable"}
                              </Badge>
                              {selectedRoom.WithTransfers === "true" && (
                                <Badge variant="outline">With Transfers</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {getCurrencySymbol(selectedRoom.Currency || hotelDetails.Currency || 'AED')} {typeof selectedRoom.TotalFare === 'number' ? selectedRoom.TotalFare.toFixed(2) : parseFloat(selectedRoom.TotalFare).toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">total</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Toggle button */}
                    {!showRoomDetails && (
                      <Button 
                        onClick={() => handleViewRoomDetails(bookingCode || "no-booking-code")}
                        variant="outline"
                        className="w-96"
                      >
                        {selectedRoom ? "Change Room Selection" : "Available Rooms"}
                      </Button>
                    )}
                                          
                    {/* Inline room details */}
                    {showRoomDetails && selectedBookingCode && (
                      <div className="border rounded-lg bg-muted/5">
                        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-background z-10">
                          <h4 className="font-semibold text-lg">Select Your Room</h4>
                          <Button 
                            onClick={handleCloseRoomDetails}
                            variant="ghost"
                            size="sm"
                          >
                            Close
                          </Button>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-4">
                          <HotelRoomDetails 
                            bookingCode={selectedBookingCode} 
                            onClose={handleCloseRoomDetails}
                            onRoomSelect={handleRoomSelect}
                            selectedRoom={selectedRoom}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reserve Button with Couple Video */}
              <div className="flex items-center gap-6 mt-2">
                {hotelDetails._isLocalData ? (
                  <div className="w-96">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Preview Mode:</strong> This is a demo hotel from our catalog.
                      </p>
                      <p className="text-xs text-blue-600">
                        To see live availability and book real hotels, please use the search bar to find available properties.
                      </p>
                      <Link to="/search">
                        <Button 
                          size="lg" 
                          className="w-full mt-3 bg-primary hover:bg-primary/90 text-white"
                        >
                          Search Real Hotels
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-96 bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={handleReserveClick}
                    disabled={!isAuthenticated || prebookLoading || !bookingCode || searchingForBookingCode}
                  >
                    {!isAuthenticated 
                      ? "🔒 Login Required to Reserve" 
                      : searchingForBookingCode 
                        ? "Finding booking code..." 
                        : prebookLoading 
                          ? "Processing..." 
                          : "Reserve"}
                  </Button>
                )}
                <video
                  src="/couple-vacation.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: "200px", borderRadius: "8px" }}
                />
              </div>

              {!hotelDetails._isLocalData && !bookingCode && !searchingForBookingCode && (
                <div className="text-center text-sm text-red-500 mt-2">
                  <p>Booking code not available. Please try again.</p>
                  <button 
                    onClick={fetchBookingCode}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Retry Fetch Booking Code
                  </button>
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground mt-2">
                You won't be charged yet
              </p>
            </div>

            {/* Amenities */}
            <div>
  <h3 className="font-semibold text-foreground mb-4">
    What this place offers
  </h3>
  <div className="flex flex-wrap gap-3">
    {hotelDetails.HotelFacilities &&
      (showAllAmenities
        ? hotelDetails.HotelFacilities
        : hotelDetails.HotelFacilities.slice(0, 6)
      ).map((amenity: string, index: number) => (
        <div
          key={`${amenity}-${index}`}
          className="flex items-center space-x-2 py-1 px-2 rounded-full bg-muted/50"
        >
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {getAmenityIcon(amenity)}
          </div>
          <span className="text-sm font-medium">{amenity}</span>
        </div>
      ))
    }
  </div>

  {/* Show More / Show Less button */}
  {hotelDetails.HotelFacilities && hotelDetails.HotelFacilities.length > 5 && (
    <button
      onClick={() => setShowAllAmenities(!showAllAmenities)}
      className="mt-2 text-primary font-medium text-sm hover:underline"
    >
      {showAllAmenities ? "Show Less" : "Show More"}
    </button>
  )}
</div>
          </div>
        </div>

        {/* Availability Section - Allow users to modify search */}
        <AvailabilitySection
          checkIn={checkIn}
          checkOut={checkOut}
          adults={adults}
          children={children}
          rooms={parseInt(rooms || "1")}
          childrenAges={childrenAges}
          onSearchChange={handleAvailabilityChange}
          isLoading={searchingAvailability}
        />

        {/* Description and Hotel Information */}
        {hotelDetails.Description && (() => {
          const sections = extractSections(hotelDetails.Description);
          return (
            <div className="space-y-6 mb-8">
              {/* About this place */}
              {(sections['Amenities'] || sections['Dining'] || sections['Business Amenities'] || sections['Rooms']) && (
                <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">
              About this place
            </h3>
                    <div className="space-y-4">
                      {sections['Amenities'] && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Amenities</h4>
                          <div 
                            className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: sections['Amenities'] }}
                          />
                        </div>
                      )}
                      {sections['Dining'] && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Dining</h4>
                          <div 
                            className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: sections['Dining'] }}
                          />
                        </div>
                      )}
                      {sections['Business Amenities'] && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Business Amenities</h4>
                          <div 
                            className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: sections['Business Amenities'] }}
                          />
                        </div>
                      )}
                      {sections['Rooms'] && (
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Rooms</h4>
                          <div 
                            className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: sections['Rooms'] }}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attractions */}
              {sections['Attractions'] && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Nearby Attractions
                    </h3>
                    <div 
                      className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sections['Attractions'] }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Location */}
              {sections['Location'] && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Location
                    </h3>
                    <div 
                      className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sections['Location'] }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Check In Instructions */}
              {sections['Check In Instructions'] && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Check In Information
                    </h3>
                    <div 
                      className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sections['Check In Instructions'] }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Fees */}
              {sections['Fees'] && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Fees & Charges
                    </h3>
                    <div 
                      className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sections['Fees'] }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Policies */}
              {sections['Policies'] && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Policies
                    </h3>
                    <div 
                      className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sections['Policies'] }}
                    />
          </CardContent>
        </Card>
              )}
            </div>
          );
        })()}

        {/* Location Map */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Where you'll be
            </h3>
            <HotelMap
              latitude={hotelCoordinates?.lat || 0}
              longitude={hotelCoordinates?.lng || 0}
              hotelName={hotelDetails.HotelName}
              address={`${hotelDetails.Address}, ${hotelDetails.CityName}, ${hotelDetails.CountryName}`}
            />
            <div className="mt-4 flex items-center space-x-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {hotelDetails.Address}, {hotelDetails.CityName}, {hotelDetails.CountryName}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Preview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <Star className="h-5 w-5 fill-black text-black" />
              <span className="text-xl font-semibold">
                {hotelDetails.HotelRating ? hotelDetails.HotelRating : "N/A"} ·
                Guest Reviews
              </span>
            </div>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Guest reviews are not available through the API at this time.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This hotel has a {hotelDetails.HotelRating || "N/A"} star rating.
              </p>
            </div>
          </CardContent>
        </Card>


        
        



      </main>
      <Footer />
    </div>
  );
};

export default HotelDetails;