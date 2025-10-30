import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  ChevronDown,
  ChevronUp,
  X,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getCountryList,
  getCityList,
} from '@/services/hotelCodeApi';

interface MobileSearchBarProps {
  className?: string;
}

interface Country {
  Code: string;
  Name: string;
}

interface City {
  CityCode: string;
  CityName: string;
  CountryCode: string;
}

interface RoomGuests {
  adults: number;
  children: number;
  childrenAges: number[];
}

const MobileSearchBar: React.FC<MobileSearchBarProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchData, setSearchData] = useState({
    destination: '',
    checkIn: '',
    checkOut: '',
    guests: 2,
    adults: 2,
    children: 0,
    rooms: 1
  });

  // Preferences Dialog State
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const [nationality, setNationality] = useState('AE');
  const [currency, setCurrency] = useState('AED');

  // Room-by-room guest configuration
  const [roomGuests, setRoomGuests] = useState<RoomGuests[]>([
    { adults: 2, children: 0, childrenAges: [] }
  ]);
  
  // For API-based destination search
  const [searchInput, setSearchInput] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [searchStep, setSearchStep] = useState<'country' | 'city'>('country');
  const destinationRef = useRef<HTMLDivElement>(null);

  // Room management functions
  const addRoom = () => {
    if (roomGuests.length < 5) {
      setRoomGuests([...roomGuests, { adults: 1, children: 0, childrenAges: [] }]);
    }
  };

  const removeRoom = (index: number) => {
    if (roomGuests.length > 1) {
      setRoomGuests(roomGuests.filter((_, i) => i !== index));
    }
  };

  const updateRoomAdults = (roomIndex: number, adults: number) => {
    const updated = [...roomGuests];
    updated[roomIndex].adults = Math.max(1, Math.min(10, adults));
    setRoomGuests(updated);
  };

  const updateRoomChildren = (roomIndex: number, children: number) => {
    const updated = [...roomGuests];
    const newChildren = Math.max(0, Math.min(5, children));
    updated[roomIndex].children = newChildren;
    
    // Adjust childrenAges array
    if (newChildren > updated[roomIndex].childrenAges.length) {
      // Add default ages for new children
      updated[roomIndex].childrenAges = [
        ...updated[roomIndex].childrenAges,
        ...Array(newChildren - updated[roomIndex].childrenAges.length).fill(5)
      ];
    } else {
      // Remove excess ages
      updated[roomIndex].childrenAges = updated[roomIndex].childrenAges.slice(0, newChildren);
    }
    
    setRoomGuests(updated);
  };

  const updateChildAge = (roomIndex: number, childIndex: number, age: number) => {
    const updated = [...roomGuests];
    updated[roomIndex].childrenAges[childIndex] = age;
    setRoomGuests(updated);
  };

  const getTotalGuests = () => {
    return roomGuests.reduce((total, room) => total + room.adults + room.children, 0);
  };

  const getGuestLabel = () => {
    const totalGuests = getTotalGuests();
    const rooms = roomGuests.length;
    return `${totalGuests} Guest${totalGuests > 1 ? 's' : ''}, ${rooms} Room${rooms > 1 ? 's' : ''}`;
  };

  const handleSearch = () => {
    // Show preferences dialog before searching
    setShowPreferencesDialog(true);
  };

  const performSearch = () => {
    // Calculate totals
    const totalAdults = roomGuests.reduce((sum, room) => sum + room.adults, 0);
    const totalChildren = roomGuests.reduce((sum, room) => sum + room.children, 0);
    const allChildrenAges = roomGuests.flatMap(room => room.childrenAges);
    
    const params = new URLSearchParams({
      destination: searchData.destination || 'Riyadh',
      guests: getTotalGuests().toString(),
      adults: totalAdults.toString(),
      children: totalChildren.toString(),
      rooms: roomGuests.length.toString(),
      childrenAges: allChildrenAges.join(','),
      roomGuests: JSON.stringify(roomGuests),
      checkIn: searchData.checkIn || new Date().toISOString().split('T')[0],
      checkOut: searchData.checkOut || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      nationality: nationality || 'AE',
      currency: currency || 'AED'
    });

    console.log('🔍 Searching with preferences:', { nationality, currency });
    navigate(`/search?${params.toString()}`);
    setIsOpen(false);
    setShowPreferencesDialog(false);
  };

  // Load countries when destination field is focused
  const loadCountries = async () => {
    if (countries.length > 0) return; // Already loaded
    
    setIsLoadingCountries(true);
    try {
      console.log('📍 Fetching countries...');
      const response = await getCountryList();
      if (response.CountryList && response.CountryList.length > 0) {
        setCountries(response.CountryList);
        setFilteredCountries(response.CountryList);
        console.log('✅ Loaded', response.CountryList.length, 'countries');
      }
    } catch (error) {
      console.error('❌ Error loading countries:', error);
    } finally {
      setIsLoadingCountries(false);
    }
  };
  
  // Load cities for selected country
  const loadCities = async (countryCode: string) => {
    setIsLoadingCities(true);
    try {
      console.log('🏙️ Fetching cities for country:', countryCode);
      const response = await getCityList(countryCode);
      if (response.CityList && response.CityList.length > 0) {
        setCities(response.CityList);
        setFilteredCities(response.CityList);
        console.log('✅ Loaded', response.CityList.length, 'cities');
      }
    } catch (error) {
      console.error('❌ Error loading cities:', error);
    } finally {
      setIsLoadingCities(false);
    }
  };
  
  // Filter based on search input
  useEffect(() => {
    if (searchStep === 'country') {
      if (searchInput.trim() === '') {
        setFilteredCountries(countries);
      } else {
        const filtered = countries.filter(country =>
          country.Name.toLowerCase().includes(searchInput.toLowerCase())
        );
        setFilteredCountries(filtered);
      }
    } else if (searchStep === 'city') {
      if (searchInput.trim() === '') {
        setFilteredCities(cities);
      } else {
        const filtered = cities.filter(city =>
          city.CityName.toLowerCase().includes(searchInput.toLowerCase())
        );
        setFilteredCities(filtered);
      }
    }
  }, [searchInput, searchStep, countries, cities]);
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (destinationRef.current && !destinationRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle country selection
  const handleCountrySelect = async (country: Country) => {
    console.log('🌍 Selected country:', country.Name);
    setSelectedCountry(country);
    setSearchInput('');
    setSearchStep('city');
    setShowResults(true);
    await loadCities(country.Code);
  };
  
  // Handle city selection
  const handleCitySelect = (city: City) => {
    console.log('🏙️ Selected city:', city.CityName);
    const destination = `${city.CityName}, ${selectedCountry?.Name || ''}`;
    setSearchData(prev => ({ ...prev, destination }));
    setSearchInput(destination);
    setShowResults(false);
  };
  
  // Handle input focus
  const handleDestinationFocus = () => {
    setShowResults(true);
    if (searchStep === 'country') {
      loadCountries();
    }
  };
  
  // Reset to country selection
  const handleBackToCountries = () => {
    setSearchStep('country');
    setSelectedCountry(null);
    setSearchInput('');
    setCities([]);
    setFilteredCities([]);
  };

  return (
    <div className={`mobile-search-bar ${className}`}>
      {/* Mobile Search Trigger Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-14 px-4 text-left font-normal bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-gray-600" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 font-medium">
                  {searchData.destination || 'Where are you going?'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {searchData.checkIn && searchData.checkOut 
                    ? `${searchData.checkIn} • ${searchData.checkOut} • ${getGuestLabel()}`
                    : 'Enter details'
                  }
                </div>
              </div>
            </div>
            <Search className="h-5 w-5 text-primary" />
          </Button>
        </SheetTrigger>

        <SheetContent 
          side="bottom" 
          className="h-[90vh] bg-white rounded-t-2xl border-0 shadow-2xl"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Search Hotels</h2>
            </div>

            {/* Search Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Destination - Two-step API Search */}
              <div className="space-y-2" ref={destinationRef}>
                <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                    {searchStep === 'country' ? 'Select Country' : 'Select City'}
                </Label>
                  {searchStep === 'city' && selectedCountry && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToCountries}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      ← Back to countries
                    </Button>
                  )}
                </div>
                
                {selectedCountry && searchStep === 'city' && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                    Selected: <span className="font-medium">{selectedCountry.Name}</span>
                  </div>
                )}
                
                <div className="relative">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        setShowResults(true);
                      }}
                      onFocus={handleDestinationFocus}
                      placeholder={searchStep === 'country' ? 'Search for a country...' : 'Search for a city...'}
                      className="h-12 pl-10 pr-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {(isLoadingCountries || isLoadingCities) && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
                    )}
                  </div>
                  
                  {/* Country Results */}
                  {showResults && searchStep === 'country' && !isLoadingCountries && filteredCountries.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCountries.map((country, index) => (
                        <button
                          key={index}
                          onClick={() => handleCountrySelect(country)}
                          className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                        >
                          <span className="text-sm text-gray-900 font-medium">{country.Name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* City Results */}
                  {showResults && searchStep === 'city' && !isLoadingCities && filteredCities.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCities.map((city, index) => (
                        <button
                        key={index}
                          onClick={() => handleCitySelect(city)}
                          className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                        >
                          <MapPin className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900">{city.CityName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Loading State */}
                  {(isLoadingCountries || isLoadingCities) && showResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        <p className="text-sm text-gray-600">
                          {searchStep === 'country' ? 'Loading countries...' : 'Loading cities...'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* No Results */}
                  {showResults && !isLoadingCountries && !isLoadingCities && searchInput && 
                   ((searchStep === 'country' && filteredCountries.length === 0) || 
                    (searchStep === 'city' && filteredCities.length === 0)) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                      <p className="text-sm text-gray-500 text-center">
                        No {searchStep === 'country' ? 'countries' : 'cities'} found
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Check-in Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Check in
                </Label>
                <Input
                  type="date"
                  value={searchData.checkIn}
                  onChange={(e) => setSearchData(prev => ({ ...prev, checkIn: e.target.value }))}
                  className="h-12 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Check-out Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Check out
                </Label>
                <Input
                  type="date"
                  value={searchData.checkOut}
                  onChange={(e) => setSearchData(prev => ({ ...prev, checkOut: e.target.value }))}
                  className="h-12 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  min={searchData.checkIn || new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Guests - Room by Room Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                    Guests & Rooms
                </Label>
                  <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {getGuestLabel()}
                  </div>
                </div>

                {/* Room Cards */}
                <div className="space-y-3">
                  {roomGuests.map((room, roomIndex) => (
                    <div 
                      key={roomIndex} 
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3"
                    >
                      {/* Room Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary text-white text-xs font-bold px-2 py-1 rounded">
                            Room {roomIndex + 1}
                          </div>
                        </div>
                        {roomGuests.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRoom(roomIndex)}
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>

                      {/* Adults */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 font-medium">Adults</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateRoomAdults(roomIndex, room.adults - 1)}
                              disabled={room.adults <= 1}
                              className="h-8 w-8 p-0 rounded-full"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-semibold">{room.adults}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateRoomAdults(roomIndex, room.adults + 1)}
                              disabled={room.adults >= 10}
                              className="h-8 w-8 p-0 rounded-full"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 font-medium">Children</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateRoomChildren(roomIndex, room.children - 1)}
                              disabled={room.children <= 0}
                              className="h-8 w-8 p-0 rounded-full"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-semibold">{room.children}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateRoomChildren(roomIndex, room.children + 1)}
                              disabled={room.children >= 5}
                              className="h-8 w-8 p-0 rounded-full"
                            >
                              +
                    </Button>
                          </div>
                        </div>

                        {/* Children Ages */}
                        {room.children > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-gray-600">Ages of children at check-out:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {room.childrenAges.map((age, childIndex) => (
                                <div key={childIndex} className="space-y-1">
                                  <Label className="text-xs text-gray-600">Child {childIndex + 1}</Label>
                                  <select
                                    value={age}
                                    onChange={(e) => updateChildAge(roomIndex, childIndex, parseInt(e.target.value))}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
                                  >
                                    {Array.from({ length: 18 }, (_, i) => i).map(ageOption => (
                                      <option key={ageOption} value={ageOption}>
                                        {ageOption} {ageOption === 1 ? 'year' : 'years'}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Room Button */}
                {roomGuests.length < 5 && (
                  <Button
                    variant="outline"
                    onClick={addRoom}
                    className="w-full border-dashed border-2 border-gray-300 hover:border-primary hover:bg-primary/5"
                  >
                    + Add Another Room
                  </Button>
                )}

                {/* Apply Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => setIsOpen(false)}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            {/* Search Button */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <Button 
                onClick={handleSearch}
                className="search-button w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Search className="h-5 w-5 mr-2" />
                Search Hotels
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preferences Dialog */}
      <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Search Preferences</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Select your nationality and preferred currency for hotel search (optional)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Nationality Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Nationality
              </Label>
              <Select value={nationality} onValueChange={setNationality}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="AE">🇦🇪 United Arab Emirates (AE)</SelectItem>
                  <SelectItem value="SA">🇸🇦 Saudi Arabia (SA)</SelectItem>
                  <SelectItem value="US">🇺🇸 United States (US)</SelectItem>
                  <SelectItem value="GB">🇬🇧 United Kingdom (GB)</SelectItem>
                  <SelectItem value="IN">🇮🇳 India (IN)</SelectItem>
                  <SelectItem value="PK">🇵🇰 Pakistan (PK)</SelectItem>
                  <SelectItem value="BD">🇧🇩 Bangladesh (BD)</SelectItem>
                  <SelectItem value="EG">🇪🇬 Egypt (EG)</SelectItem>
                  <SelectItem value="JO">🇯🇴 Jordan (JO)</SelectItem>
                  <SelectItem value="KW">🇰🇼 Kuwait (KW)</SelectItem>
                  <SelectItem value="OM">🇴🇲 Oman (OM)</SelectItem>
                  <SelectItem value="QA">🇶🇦 Qatar (QA)</SelectItem>
                  <SelectItem value="BH">🇧🇭 Bahrain (BH)</SelectItem>
                  <SelectItem value="CA">🇨🇦 Canada (CA)</SelectItem>
                  <SelectItem value="AU">🇦🇺 Australia (AU)</SelectItem>
                  <SelectItem value="DE">🇩🇪 Germany (DE)</SelectItem>
                  <SelectItem value="FR">🇫🇷 France (FR)</SelectItem>
                  <SelectItem value="IT">🇮🇹 Italy (IT)</SelectItem>
                  <SelectItem value="ES">🇪🇸 Spain (ES)</SelectItem>
                  <SelectItem value="CN">🇨🇳 China (CN)</SelectItem>
                  <SelectItem value="JP">🇯🇵 Japan (JP)</SelectItem>
                  <SelectItem value="KR">🇰🇷 South Korea (KR)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default: UAE (AE) if not selected
              </p>
            </div>

            {/* Currency Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Preferred Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">🇦🇪 AED - UAE Dirham</SelectItem>
                  <SelectItem value="SAR">🇸🇦 SAR - Saudi Riyal</SelectItem>
                  <SelectItem value="USD">🇺🇸 USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">🇪🇺 EUR - Euro</SelectItem>
                  <SelectItem value="GBP">🇬🇧 GBP - British Pound</SelectItem>
                  <SelectItem value="INR">🇮🇳 INR - Indian Rupee</SelectItem>
                  <SelectItem value="PKR">🇵🇰 PKR - Pakistani Rupee</SelectItem>
                  <SelectItem value="BDT">🇧🇩 BDT - Bangladeshi Taka</SelectItem>
                  <SelectItem value="EGP">🇪🇬 EGP - Egyptian Pound</SelectItem>
                  <SelectItem value="JPY">🇯🇵 JPY - Japanese Yen</SelectItem>
                  <SelectItem value="CNY">🇨🇳 CNY - Chinese Yuan</SelectItem>
                  <SelectItem value="AUD">🇦🇺 AUD - Australian Dollar</SelectItem>
                  <SelectItem value="CAD">🇨🇦 CAD - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default: AED if not selected. Note: Payment will be in AED only.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                // Skip preferences - use defaults
                setNationality('AE');
                setCurrency('AED');
                setShowPreferencesDialog(false);
                performSearch();
              }}
              className="flex-1 sm:flex-none"
            >
              Skip
            </Button>
            <Button
              onClick={performSearch}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileSearchBar;
