import { useState, useEffect, useRef } from "react";
import AnimatedAvatar from "@/components/AnimatedAvatar";

// TypeScript declaration for chatbot global objects
declare global {
  interface Window {
    n8nChatbot?: {
      open: () => void;
      close: () => void;
    };
    ElevenLabsConvAI?: {
      open: () => void;
      close: () => void;
    };
  }
  
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
      };
    }
  }
}

interface Position {
  x: number;
  y: number;
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const elevenLabsScriptRef = useRef<HTMLScriptElement | null>(null);
  const chatBannerRef = useRef<HTMLDivElement | null>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('chatbot-position');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('chatbot-position', JSON.stringify(position));
    }
  }, [position]);

  // Handle drag start
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    if (chatBannerRef.current) {
      const rect = chatBannerRef.current.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    }
  };

  // Handle drag move
  const handleDragMove = (clientX: number, clientY: number) => {
    if (isDragging) {
      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const elementWidth = chatBannerRef.current?.offsetWidth || 280;
      const elementHeight = chatBannerRef.current?.offsetHeight || 150;
      
      // Constrain within viewport
      const constrainedX = Math.max(0, Math.min(newX, viewportWidth - elementWidth));
      const constrainedY = Math.max(0, Math.min(newY, viewportHeight - elementHeight));
      
      setPosition({ x: constrainedX, y: constrainedY });
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  useEffect(() => {
    // Load the n8n chatbot script when component mounts
    const loadN8nChatbot = () => {
      if (scriptRef.current) return; // Already loaded

      const script = document.createElement('script');
      script.type = 'module';
      script.defer = true;
      script.innerHTML = `
        import Chatbot from "https://cdn.n8nchatui.com/v1/embed.js";
        Chatbot.init({
          "n8nChatUrl": "https://n8n.srv982383.hstgr.cloud/webhook/9b8ef8e3-0311-4910-9a9b-d05309a29777/chat",
          "metadata": {},
          "theme": {
            "button": {
              "backgroundColor": "#23665a",
              "right": 20,
              "bottom": 20,
              "size": 80,
              "iconColor": "#f5f4ef",
              "customIconSrc": "https://i.ibb.co/7bzcppC/pngwing-com-removebg-preview.png",
              "customIconSize": 95,
              "customIconBorderRadius": 0,
              "autoWindowOpen": {
                "autoOpen": false,
                "openDelay": 2
              },
              "borderRadius": "circle"
            },
            "tooltip": {
              "showTooltip": false,
              "tooltipMessage": "Hi There 👋",
              "tooltipBackgroundColor": "#a9ccc7",
              "tooltipTextColor": "#1c1c1c",
              "tooltipFontSize": 15,
              "tooltipPosition": "right"
            },
            "chatWindow": {
              "borderRadiusStyle": "rounded",
              "avatarBorderRadius": 30,
              "messageBorderRadius": 8,
              "showTitle": true,
              "title": "HotelRBS AI Assistance",
              "titleAvatarSrc": "https://www.svgrepo.com/show/339963/chat-bot.svg",
              "avatarSize": 30,
              "welcomeMessage": "Welcome to HotelRBS! 😊",
              "errorMessage": "Please connect to the HotelRBS Team",
              "backgroundColor": "#ffffff",
              "height": ${window.innerWidth <= 768 ? 450 : 520},
              "width": ${window.innerWidth <= 768 ? (window.innerWidth <= 480 ? 320 : 350) : 400},
              "fontSize": 16,
              "starterPrompts": [
                "What kind of hotels can use HotelRBS?",
                "What are the key features of the online booking ?"
              ],
              "starterPromptFontSize": 15,
              "renderHTML": false,
              "clearChatOnReload": false,
              "showScrollbar": false,
              "botMessage": {
                "backgroundColor": "#178070",
                "textColor": "#fafafa",
                "showAvatar": true,
                "avatarSrc": "https://www.svgrepo.com/show/334455/bot.svg",
                "showCopyToClipboardIcon": false
              },
              "userMessage": {
                "backgroundColor": "#efeeeb",
                "textColor": "#050505",
                "showAvatar": true,
                "avatarSrc": "https://i.ibb.co/7bzcppC/pngwing-com-removebg-preview.png"
              },
              "textInput": {
                "placeholder": "Type your query",
                "backgroundColor": "#ffffff",
                "textColor": "#1e1e1f",
                "sendButtonColor": "#23665a",
                "maxChars": 200,
                "maxCharsWarningMessage": "You exceeded the characters limit. Please input less than 200 characters.",
                "autoFocus": false,
                "borderRadius": 2,
                "sendButtonBorderRadius": 50
              }
            }
          }
        });
      `;
      
      document.head.appendChild(script);
      scriptRef.current = script;
    };

    // Load ElevenLabs voice assistant script only when needed
    const loadElevenLabsChatbot = () => {
      // Check if script already exists in DOM or is already loaded
      const existingScript = document.querySelector('script[src*="elevenlabs"]');
      if (elevenLabsScriptRef.current || existingScript) {
        console.log('ElevenLabs script already loaded, skipping...');
        return; // Already loaded
      }

      // Check if custom element is already defined
      if (customElements.get('elevenlabs-convai')) {
        console.log('ElevenLabs custom element already defined, skipping...');
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      script.type = 'text/javascript';
      
      script.onload = () => {
        console.log('ElevenLabs script loaded successfully');
      };
      
      script.onerror = () => {
        console.error('Failed to load ElevenLabs script');
        elevenLabsScriptRef.current = null;
      };
      
      document.head.appendChild(script);
      elevenLabsScriptRef.current = script;
    };

    loadN8nChatbot();
    loadElevenLabsChatbot();

    // Cleanup function - Don't remove scripts as they register custom elements
    // that can't be re-registered
    return () => {
      // Clean up n8n script only (not ElevenLabs to avoid re-registration issues)
      if (scriptRef.current && scriptRef.current.parentNode) {
        try {
          document.head.removeChild(scriptRef.current);
          scriptRef.current = null;
        } catch (e) {
          console.log('Script already removed');
        }
      }
      // Don't remove ElevenLabs script to prevent custom element re-registration errors
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    // Trigger the n8n chatbot to open/close
    if (window.n8nChatbot) {
      if (isOpen) {
        window.n8nChatbot.close();
      } else {
        window.n8nChatbot.open();
      }
    }
  };

  return (
    <>
      {/* ElevenLabs Voice Assistant Element */}
      <elevenlabs-convai agent-id="agent_4001k5g6qn5te3xr3s0qpss5capb"></elevenlabs-convai>

      {/* Chatbot Container with Call Banner */}
      <div className="chatbot-container">
        {/* Have a Call Banner - Draggable */}
        <div 
          ref={chatBannerRef}
          className={`call-banner ${isDragging ? 'dragging' : ''}`}
          style={{
            left: position.x !== 0 ? `${position.x}px` : undefined,
            top: position.y !== 0 ? `${position.y}px` : undefined,
            bottom: position.y !== 0 ? 'auto' : undefined,
            right: position.x !== 0 ? 'auto' : undefined,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          title="Drag to reposition"
        >
          <div className="call-banner-content">
            <div className="call-icon">📞</div>
            <div className="call-text">
              <div className="call-title">
                <span style={{ marginRight: '4px' }}>⋮⋮</span>
                Need help?
              </div>
              <button 
                className="call-button" 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('tel:+1234567890');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <span className="call-button-icon">📞</span>
                Start a call
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animated Avatar - triggers n8n chatbot - OUTSIDE container for dragging */}
      <AnimatedAvatar onClick={handleToggle} isOpen={isOpen} />
    </>
  );
};

export default ChatBot;