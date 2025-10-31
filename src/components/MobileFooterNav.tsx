import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, Tag, Globe } from 'lucide-react';
import homeIcon from '@/assets/home-icon.png';
import destinationIcon from '@/assets/destination-icon.png';
import dealsIcon from '@/assets/deals-icon.png';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const MobileFooterNav: React.FC = () => {
  const location = useLocation();
  const [currentLanguage, setCurrentLanguage] = useState("English");

  // Debug logging
  console.log('MobileFooterNav rendering with language:', currentLanguage);

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
  ];

  const handleLanguageChange = (language: {
    code: string;
    name: string;
    flag: string;
  }) => {
    setCurrentLanguage(language.name);
    localStorage.setItem("language", language.code);
    console.log(`Language changed to ${language.name}`);
  };

  const navigation = [
    { 
      name: "Hotels", 
      href: "/", 
      icon: Home, 
      customIcon: homeIcon,
      label: "Hotels"
    },
    {
      name: "Destinations",
      href: "/destinations",
      icon: MapPin,
      customIcon: destinationIcon,
      label: "Destinations"
    },
    { 
      name: "Deals", 
      href: "/deals", 
      icon: Tag, 
      customIcon: dealsIcon,
      label: "Deals"
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="mobile-footer-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around px-2 py-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
              isActive(item.href)
                ? 'text-primary bg-primary/10'
                : 'text-gray-600 hover:text-primary hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center mb-1">
              <img
                src={item.customIcon}
                alt={item.name}
                className={`w-5 h-5 transition-all duration-200 ${
                  isActive(item.href) ? 'opacity-100' : 'opacity-70'
                }`}
              />
            </div>
            <span className={`text-xs font-medium transition-all duration-200 ${
              isActive(item.href) ? 'text-primary' : 'text-gray-600'
            }`}>
              {item.label}
            </span>
          </Link>
        ))}
        
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1 text-gray-600 hover:text-primary hover:bg-gray-50 cursor-pointer bg-red-100 border border-red-300">
              <div className="flex items-center justify-center mb-1">
                <Globe className="w-5 h-5 transition-all duration-200 opacity-70" />
              </div>
              <span className="text-xs font-medium transition-all duration-200">
                {currentLanguage === "English" ? "EN" : currentLanguage === "العربية" ? "AR" : "FR"}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="z-[10000] bg-background border shadow-lg"
          >
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => handleLanguageChange(language)}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <span>{language.flag}</span>
                <span>{language.name}</span>
                {currentLanguage === language.name && (
                  <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default MobileFooterNav;
