import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DestinationPicker,
  DatePicker,
  GuestSelector,
  SearchButton,
} from "./CustomSearchComponents";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface Props {
  isSticky?: boolean;
}

const NewCustomSearchBar = ({ isSticky = false }: Props) => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  
  // Set default dates to reasonable values (1 week from now, 3 days stay)
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() + 7); // 1 week from now
  
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 10); // 3 days later
  
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEndDate);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [roomGuests, setRoomGuests] = useState<Array<{adults: number; children: number; childrenAges: number[]}>>([]);
  const [showDestinations, setShowDestinations] = useState(false);
  const [showCheckinPicker, setShowCheckinPicker] = useState(false);
  const [showCheckoutPicker, setShowCheckoutPicker] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Preferences Dialog State
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const [nationality, setNationality] = useState('AE');
  const [currency, setCurrency] = useState('AED');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const clickedInsideSearch =
        searchBarRef.current?.contains(target as Node) ?? false;

      if (!clickedInsideSearch) {
        setShowDestinations(false);
        setShowCheckinPicker(false);
        setShowCheckoutPicker(false);
        setShowGuests(false);
        setIsExpanded(false);
        setActiveField(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    // Show preferences dialog before searching
    setShowPreferencesDialog(true);
  };

  const performSearch = () => {
    const params = new URLSearchParams({
      destination: destination || "Riyadh",
      guests: (adults + children).toString(),
      adults: adults.toString(),
      children: children.toString(),
      rooms: rooms.toString(),
      nationality: nationality || 'AE',
      currency: currency || 'AED'
    });

    // Add children ages if there are children
    if (children > 0 && childrenAges.length > 0) {
      params.set("childrenAges", childrenAges.join(","));
    }

    // Add room guest distribution if available
    if (roomGuests.length > 0) {
      params.set("roomGuests", JSON.stringify(roomGuests));
    }

    // Format dates in local timezone (YYYY-MM-DD) to avoid timezone shift issues
    if (startDate) {
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      params.set("checkIn", `${year}-${month}-${day}`);
    }
    if (endDate) {
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      params.set("checkOut", `${year}-${month}-${day}`);
    }

    console.log('🔍 Searching with preferences:', { nationality, currency });
    navigate(`/search?${params.toString()}`);
    setShowPreferencesDialog(false);
  };

  const handleFieldFocus = (field: string) => {
    setIsExpanded(true);
    setActiveField(field);

    // Close all other dropdowns
    setShowDestinations(false);
    setShowCheckinPicker(false);
    setShowCheckoutPicker(false);
    setShowGuests(false);

    // Open the relevant dropdown
    switch (field) {
      case "destination":
        setShowDestinations(true);
        break;
      case "checkin":
        setShowCheckinPicker(true);
        break;
      case "checkout":
        setShowCheckoutPicker(true);
        break;
      case "guests":
        setShowGuests(true);
        break;
    }
  };

  const handleSearchClick = () => {
    if (!isExpanded) {
      handleFieldFocus("destination");
    } else {
      handleSearch();
    }
  };

  return (
    <div className="w-full">
      <div
        ref={searchBarRef}
        className={`bg-background border border-border rounded-full shadow-search transition-all duration-300 ${
          isExpanded ? "scale-105 shadow-card-hover" : "hover:shadow-card-hover"
        } ${isSticky ? "scale-90" : ""} backdrop-blur-sm mx-0`}
      >
        <div className="flex items-center px-6 pr-4">
          {/* Where */}
          <div className="flex-1">
            <DestinationPicker
              value={destination}
              onChange={setDestination}
              isOpen={showDestinations}
              onOpenChange={(open) => {
                setShowDestinations(open);
                if (open) handleFieldFocus("destination");
              }}
            />
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border"></div>

          {/* Check in */}
          <div className="flex-1">
            <DatePicker
              date={startDate}
              onDateChange={setStartDate}
              isOpen={showCheckinPicker}
              onOpenChange={(open) => {
                setShowCheckinPicker(open);
                if (open) handleFieldFocus("checkin");
              }}
              type="checkin"
            />
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border"></div>

          {/* Check out */}
          <div className="flex-1">
            <DatePicker
              date={endDate}
              onDateChange={setEndDate}
              isOpen={showCheckoutPicker}
              onOpenChange={(open) => {
                setShowCheckoutPicker(open);
                if (open) handleFieldFocus("checkout");
              }}
              type="checkout"
              minDate={startDate}
            />
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border"></div>

          {/* Who */}
          <div className="flex-1">
            <GuestSelector
              adults={adults}
              children={children}
              rooms={rooms}
              childrenAges={childrenAges}
              roomGuests={roomGuests}
              onAdultsChange={setAdults}
              onChildrenChange={setChildren}
              onRoomsChange={setRooms}
              onChildrenAgesChange={setChildrenAges}
              onRoomGuestsChange={setRoomGuests}
              isOpen={showGuests}
              onOpenChange={(open) => {
                setShowGuests(open);
                if (open) handleFieldFocus("guests");
              }}
            />
          </div>

          {/* Search Button */}
          <div className="p-1">
            <SearchButton onSearch={handleSearchClick} expanded={isExpanded} />
          </div>

          {/* Animated Video in the blank space */}
          <div className="flex items-center ml-2">
            <video
              src="/animated-video.mp4"
              alt="Animated Search Element"
              autoPlay
              loop
              muted
              playsInline
              style={{ width: "110px", height: "85px", objectFit: "contain" }}
              className="rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Preferences Dialog */}
      <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
        <DialogContent 
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
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

export default NewCustomSearchBar;
