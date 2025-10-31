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


const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const elevenLabsScriptRef = useRef<HTMLScriptElement | null>(null);

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
          "n8nChatUrl": "https://n8n.srv982383.hstgr.cloud/webhook/27dc8f3f-135a-46ed-9a6f-149c8b9eb778/chat",
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
      <elevenlabs-convai agent-id="agent_7601k8adqn77ec9bhk69g39k19fp"></elevenlabs-convai>

      {/* Animated Avatar - triggers n8n chatbot */}
      <AnimatedAvatar onClick={handleToggle} isOpen={isOpen} />
    </>
  );
};

export default ChatBot;