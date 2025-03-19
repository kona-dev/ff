'use client'
import { useState, useRef, useEffect } from "react";
import { default as NextImage } from "next/image";
import { Righteous } from 'next/font/google';
import { setCookie, getCookie, formatDate } from '@/lib/cookies';

const righteous = Righteous({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

// Add this utility function above the Home component or where appropriate
const normalizeInput = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[_\-\.]/g, ' ') // Replace underscores, hyphens, periods with spaces
    .replace(/\s+/g, ' ')     // Replace multiple spaces with a single space
    .trim();                  // Remove leading/trailing whitespace
};

// Add this utility function alongside normalizeInput
const formatNameForDisplay = (name: string): string => {
  return name.replace(/_/g, ' ');
};

// Add this function to check if we've passed midnight PST
const hasPastMidnightPST = () => {
  const now = new Date();
  const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
  const lastResetDate = getCookie('lastResetDate');
  
  if (!lastResetDate) return true;
  
  const savedDate = new Date(lastResetDate);
  return pstDate.toISOString().split('T')[0] !== savedDate.toISOString().split('T')[0];
};

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [availableHints, setAvailableHints] = useState(0);
  const [viewedHints, setViewedHints] = useState(0);
  const [borderAnimationOffsets, setBorderAnimationOffsets] = useState<number[]>([0, 0, 0]);
  const [isTitleFadingOut, setIsTitleFadingOut] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<{
    _id: string;
    name: string;
    imageUrl: string;
    hints: string[];
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyItem, setDailyItem] = useState<{
    name: string;
    imageUrl: string;
    hints: string[];
    position: { x: number; y: number };
  } | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const [correctGuessIndex, setCorrectGuessIndex] = useState<number | null>(null);
  const [imageRotation, setImageRotation] = useState(0);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(200);
  const [nextResetTime, setNextResetTime] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState('center'); // Default transform origin
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBugFormVisible, setIsBugFormVisible] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Thank you for your help!");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Helper function to update game state cookie
  const updateGameStateCookie = (additionalState = {}) => {
    const today = formatDate(new Date());
    const gameState = {
      date: today,
      guesses,
      viewedHints,
      hasWon,
      availableHints,
      showHints: showHints,
      ...additionalState
    };
    
    setCookie('feetdle_game_state', JSON.stringify(gameState), 1); // Store for 1 day
  };

  // Update the useEffect that loads game state at mount
  useEffect(() => {
    // Check completion cookie first
    const today = formatDate(new Date());
    const completionCookie = getCookie('feetdle_completion');
    const gameStateCookie = getCookie('feetdle_game_state');
    const hasStartedCookie = getCookie('feetdle_started');
    
    // Only expand if user has started the game
    if (hasStartedCookie === 'true') {
      setIsExpanded(true);
    }
    
    if (completionCookie === today) {
      setIsCompleted(true);
      setIsExpanded(true); // Always show if completed
      
      // Only fetch daily item if not already fetched
      if (!dailyItem) {
        const fetchDailyItem = async () => {
          try {
            const response = await fetch('/api/daily-item');
            const data = await response.json();
            
            if (data.item) {
              setDailyItem(data.item);
              setHasWon(true);
              setGuesses([data.item.name]);
              setCorrectGuessIndex(0);
              // Set hint state for completed game
              setAvailableHints(3);
              setViewedHints(3); 
              setShowHints(true);
            }
          } catch (error) {
            console.error('Error fetching daily item:', error);
          }
        };
        
        fetchDailyItem();
      }
    }

    // Load saved game state
    if (gameStateCookie) {
      try {
        const gameState = JSON.parse(gameStateCookie);
        if (gameState.date === today) {
          // Only expand if game was started
          if (hasStartedCookie === 'true') {
            setIsExpanded(true);
          }
          setGuesses(gameState.guesses || []);
          
          // Update hint state
          setViewedHints(gameState.viewedHints || 0);
          const calculatedHints = Math.min(Math.floor((gameState.guesses?.length || 0) / 5), 3);
          setAvailableHints(calculatedHints);
          
          // Set showHints based on saved state or calculate it
          if (gameState.showHints !== undefined) {
            setShowHints(gameState.showHints);
          } else {
            setShowHints(calculatedHints > 0);
          }
          
          setHasWon(gameState.hasWon);
          
          // If user has won in the saved state
          if (gameState.hasWon) {
            setHasWon(true);
            setIsCompleted(true);
            setCorrectGuessIndex(0);
            setIsExpanded(true); // Always show if won
          }
        } else {
          // Clear old game state if it's from a different day
          setCookie('feetdle_game_state', '', 0);
        }
      } catch (error) {
        console.error('Error parsing game state cookie:', error);
      }
    }
  }, [dailyItem]);

  // Calculate available hints based on guess count
  useEffect(() => {
    setAvailableHints(Math.min(Math.floor(guesses.length / 5), 3));
    
    // Reduce zoom level by 5% for each guess ONLY if zoom is enabled
    if (zoomEnabled && guesses.length > 0) {
      const newZoomLevel = Math.max(50, 200 - (guesses.length * 5));
      setZoomLevel(newZoomLevel);
    }
  }, [guesses.length, zoomEnabled]);

  // Generate random animation offsets when component mounts
  useEffect(() => {
    setBorderAnimationOffsets([
      Math.random() * -10, // Random offset between 0 and -10s
      Math.random() * -10,
      Math.random() * -10
    ]);
  }, []);

  // Fetch items from the API when component mounts
  useEffect(() => {
    const fetchItems = async () => {
      try {
        console.log('Attempting to fetch items...');
        const response = await fetch('/api/items', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.items) {
          console.log('Items fetched successfully:', data.items.length);
          setItems(data.items);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        // Don't set items if there's an error, but still set loading to false
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchItems();
  }, []);

  // Fetch daily item from the API when component mounts
  useEffect(() => {
    const fetchDailyItem = async () => {
      try {
        const response = await fetch('/api/daily-item');
        const data = await response.json();
        
        if (data.item) {
          // Debug the position data structure
          console.log('=====================================');
          console.log('Raw API item response:', JSON.stringify(data.item, null, 2));
          console.log('API position value:', data.item.position);
          console.log('API position type:', typeof data.item.position);
          console.log('API position has x:', data.item.position?.hasOwnProperty('x'));
          console.log('API position has y:', data.item.position?.hasOwnProperty('y'));
          console.log('=====================================');
          
          // Ensure position is properly formatted
          let position = { x: 3, y: 3 }; // Default position
          
          if (data.item.position) {
            if (typeof data.item.position === 'object' && data.item.position !== null) {
              // Extract x and y values, ensuring they are valid numbers
              // Check if we have the expected structure with direct x,y properties
              if (data.item.position.hasOwnProperty('x') && data.item.position.hasOwnProperty('y')) {
                const x = Number(data.item.position.x) || 3;
                const y = Number(data.item.position.y) || 3;
                
                position = {
                  x: Math.min(Math.max(x, 1), 5),
                  y: Math.min(Math.max(y, 1), 5)
                };
                
                console.log('Position extracted directly from object:', position);
              } 
              // Check if position might be double-nested (position.position.x, position.position.y)
              else if (data.item.position.position && 
                      typeof data.item.position.position === 'object' &&
                      data.item.position.position.hasOwnProperty('x') && 
                      data.item.position.position.hasOwnProperty('y')) {
                const x = Number(data.item.position.position.x) || 3;
                const y = Number(data.item.position.position.y) || 3;
                
                position = {
                  x: Math.min(Math.max(x, 1), 5),
                  y: Math.min(Math.max(y, 1), 5)
                };
                
                console.log('Position extracted from nested structure:', position);
              }
              // Try to find x,y in any property of the position object
              else {
                console.log('Searching for x,y in position properties...');
                const positionObj = data.item.position;
                
                // Check each property of the position object to find one that looks like coordinates
                for (const key in positionObj) {
                  const val = positionObj[key];
                  if (typeof val === 'object' && val !== null && 
                      val.hasOwnProperty('x') && val.hasOwnProperty('y')) {
                    const x = Number(val.x) || 3;
                    const y = Number(val.y) || 3;
                    
                    position = {
                      x: Math.min(Math.max(x, 1), 5),
                      y: Math.min(Math.max(y, 1), 5)
                    };
                    
                    console.log(`Found position in ${key} property:`, position);
                    break;
                  }
                }
              }
            } else if (typeof data.item.position === 'string') {
              // Handle string position format if it exists
              const positionMap: Record<string, {x: number, y: number}> = {
                'top left': {x: 1, y: 1},
                'top middle': {x: 3, y: 1},
                'top right': {x: 5, y: 1},
                'middle left': {x: 1, y: 3},
                'middle': {x: 3, y: 3},
                'middle right': {x: 5, y: 3},
                'bottom left': {x: 1, y: 5},
                'bottom middle': {x: 3, y: 5},
                'bottom right': {x: 5, y: 5}
              };
              
              position = positionMap[data.item.position] || {x: 3, y: 3};
              console.log('Converted string position to:', position);
            }
          }
          
          console.log('Final position being used:', position);
          
          setDailyItem({
            ...data.item,
            position: position
          });
          
          // Testing logs - remove in production
          console.log('-------------------------------------');
          console.log('🔑 Today\'s correct answer:', data.item.name);
          console.log('🔍 Normalized answer:', normalizeInput(data.item.name));
          console.log('📍 Position:', `x: ${position.x}, y: ${position.y}`);
          console.log('💡 Hints:', data.item.hints);
          console.log('-------------------------------------');
        }
      } catch (error) {
        console.error('Error fetching daily item:', error);
        // Fallback to first item if daily item fetch fails
        if (items.length > 0) {
          setDailyItem({
            ...items[0],
            position: { x: 3, y: 3 } // Default to center position
          });
        }
      }
    };
    
    if (!isLoading && items.length > 0 && !isCompleted) {
      fetchDailyItem();
    }
  }, [isLoading, items, isCompleted]);

  // Add this function for an accurate timer
  const calculateTimeUntilReset = () => {
    const now = new Date();
    
    // Convert to PST for consistency
    const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    
    // Create midnight time for the next day
    const tomorrow = new Date(pstDate);
    tomorrow.setDate(pstDate.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // Calculate difference in milliseconds
    const diffMs = tomorrow.getTime() - pstDate.getTime();
    
    // Convert to hours and minutes
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Update your timer useEffect to include reset check
  useEffect(() => {
    const checkAndResetGame = () => {
      if (hasPastMidnightPST()) {
        // Reset all game states
        setGuesses([]);
        setViewedHints(0);
        setHasWon(false);
        setCorrectGuessIndex(null);
        setIsCompleted(false);
        setShowHints(false);
        
        // Clear cookies
        setCookie('feetdle_game_state', '', 0);
        setCookie('feetdle_completion', '', 0);
        setCookie('feetdle_started', '', 0);
        
        // Set new reset date
        const now = new Date();
        const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        setCookie('lastResetDate', pstDate.toISOString().split('T')[0], 1);
        
        // Fetch new daily item
        window.location.reload();
      }
      
      setNextResetTime(calculateTimeUntilReset());
    };
    
    checkAndResetGame();
    const interval = setInterval(checkAndResetGame, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Update the zoom effect to consider position
  useEffect(() => {
    if (dailyItem && dailyItem.position) {
      console.log('Updating zoom origin based on position:', dailyItem.position);
      
      // Ensure position values are valid numbers between 1-5
      const validPosition = {
        x: Math.min(Math.max(Number(dailyItem.position.x) || 3, 1), 5),
        y: Math.min(Math.max(Number(dailyItem.position.y) || 3, 1), 5)
      };
      
      if (validPosition.x !== dailyItem.position.x || validPosition.y !== dailyItem.position.y) {
        console.log('Corrected invalid position values:', validPosition);
      }
      
      const origin = getTransformOrigin(validPosition);
      setZoomOrigin(origin);
      
      console.log('Zoom origin set to:', origin);
    } else {
      console.log('No position data available, using default center origin');
      setZoomOrigin('center');
    }
  }, [dailyItem]);

  // Update the preloadImage function
  const preloadImage = (src: string) => {
    return new Promise<void>((resolve, reject) => {
      setImageLoaded(false); // Reset loaded state immediately when function is called
      
      const img = new Image();
      img.src = src;
      img.onload = () => {
        // Small delay to prevent flash
        setTimeout(() => {
          setImageLoaded(true);
          resolve();
        }, 50);
      };
      img.onerror = () => {
        setImageLoaded(false);
        reject(new Error('Failed to load image'));
      };
    });
  };

  // Update the useEffect to handle image preloading
  useEffect(() => {
    if (dailyItem && dailyItem.imageUrl) {
      preloadImage(dailyItem.imageUrl).catch(error => {
        console.error('Error preloading image:', error);
        setImageLoaded(false);
      });
    } else {
      setImageLoaded(false);
    }
  }, [dailyItem]);

  // Update the hint toggle function to save state in cookie
  const toggleHints = () => {
    if (availableHints > 0) {
      // If hints are not showing, turn them on
      if (!showHints) {
        setShowHints(true);
      }
      
      // Only increment viewedHints if we haven't seen all available hints
      if (viewedHints < availableHints) {
        // Show one more hint
        const newViewedHints = viewedHints + 1;
        setViewedHints(newViewedHints);
        // Save state to cookie
        updateGameStateCookie({ showHints: true, viewedHints: newViewedHints });
      }
    } else {
      setShowHints(false);
    }
  };

  // Update handleGuess to save game state after each guess
  const handleGuess = () => {
    if (inputValue.trim() && !hasWon && !isCompleted) {
      const normalizedInput = normalizeInput(inputValue);
      
      // Always add the guess to the list
      const newGuesses = [inputValue, ...guesses];
      setGuesses(newGuesses);
      
      // Check if the guess is correct
      if (dailyItem && normalizeInput(dailyItem.name) === normalizedInput) {
        setHasWon(true);
        setCorrectGuessIndex(0);
        setIsCompleted(true);
        
        // Ensure zoom is enabled and set to maximum zoom-out
        setZoomEnabled(true);
        setZoomLevel(1); // Set to minimum zoom level for full image view
        // Also set the zoom origin to center to see the full image
        setZoomOrigin('center');
        
        // Set the completion cookie with today's date
        const today = formatDate(new Date());
        setCookie('feetdle_completion', today, 365);
        
        // Also update game state
        updateGameStateCookie({ hasWon: true });
      } else {
        // Update game state for incorrect guess
        updateGameStateCookie({ guesses: newGuesses });
      }
      
      setInputValue('');
    }
  };

  const rotateImage = () => {
    // Rotate the image by 90 degrees
    setImageRotation((prev) => (prev + 90) % 360);
    
    // Keep the same zoom origin when rotating
    // This ensures rotation happens around the zoomed point
  };

  const toggleZoom = () => {
    const newZoomEnabled = !zoomEnabled;
    setZoomEnabled(newZoomEnabled);
    
    if (newZoomEnabled) {
      // When toggled ON: Apply zoom based on guess count
      const calculatedZoom = Math.max(50, 200 - (guesses.length * 5));
      setZoomLevel(calculatedZoom);
    } else {
      // When toggled OFF: Force zoom at 200%
      setZoomLevel(200);
    }
  };

  const getTransformOrigin = (position: { x: number; y: number }): string => {
    // Convert the 1-5 grid to percentage values (0%, 25%, 50%, 75%, 100%)
    // For a grid from 1-5, we need to map:
    // 1 → 0%, 2 → 25%, 3 → 50%, 4 → 75%, 5 → 100%
    const xPercentage = ((position.x - 1) / 4 * 100) + '%';
    const yPercentage = ((position.y - 1) / 4 * 100) + '%';
    
    console.log(`Position (${position.x}, ${position.y}) maps to origin: ${xPercentage} ${yPercentage}`);
    
    return `${xPercentage} ${yPercentage}`;
  };

  const handleBugSubmit = async () => {
    if (!bugDescription.trim()) {
      setShowToast(true);
      setToastMessage("Please enter a bug description first");
      setToastType("error");
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    try {
      const response = await fetch('/api/send-bug-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: bugDescription }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Bug description submitted:', bugDescription);
        setBugDescription('');
        setIsBugFormVisible(false);
        setShowToast(true);
        setToastMessage("Thank you for your help!");
        setToastType("success");
        setTimeout(() => setShowToast(false), 3000);
      } else {
        console.error('Failed to send bug report:', data.error || 'Unknown error');
        setShowToast(true);
        setToastMessage(`Error: ${data.error || 'Failed to send bug report'}`);
        setToastType("error");
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      setShowToast(true);
      setToastMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setToastType("error");
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Add this to your main useEffect for initialization
  useEffect(() => {
    const initializeGame = async () => {
      // Force reset check based on PST time
      const now = new Date();
      const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
      const todayPST = pstDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get the saved date from cookies
      const savedGameState = getCookie('feetdle_game_state');
      let gameState = null;
      
      if (savedGameState) {
        try {
          gameState = JSON.parse(savedGameState);
        } catch (e) {
          console.error("Error parsing game state:", e);
        }
      }
      
      // Reset if no saved state or date is different
      const needsReset = !gameState || gameState.date !== todayPST;
      
      if (needsReset) {
        console.log("Resetting game state for new day:", todayPST);
        
        // Reset all game states
        setGuesses([]);
        setViewedHints(0);
        setHasWon(false);
        setCorrectGuessIndex(null);
        setIsCompleted(false);
        setShowHints(false);
        
        // Save the reset state
        updateGameStateCookie({ date: todayPST });
        
        // Also store the current PST date as lastResetDate
        setCookie('lastResetDate', todayPST, 7);
      } else {
        console.log("Loading existing game state for:", gameState.date);
        
        // Load saved state
        if (gameState.guesses) setGuesses(gameState.guesses);
        if (gameState.viewedHints !== undefined) setViewedHints(gameState.viewedHints);
        if (gameState.hasWon !== undefined) setHasWon(gameState.hasWon);
        if (gameState.showHints !== undefined) setShowHints(gameState.showHints);
      }
    };

    initializeGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add this to your handleGuess function after updating state
  useEffect(() => {
    // Save current game state to cookies whenever it changes
    if (guesses.length > 0) {
      setCookie('guesses', JSON.stringify(guesses), 1);
    }
    
    if (viewedHints > 0) {
      setCookie('viewedHints', viewedHints.toString(), 1);
    }
    
    if (hasWon) {
      setCookie('hasWon', 'true', 1);
    }
  }, [guesses, viewedHints, hasWon]);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white relative overflow-hidden">
      {/* Simplified Background */}
      <div className="absolute inset-0 w-full h-full z-0">
        <div className="absolute inset-0">
          <div className="w-full h-full opacity-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
              style={{
                background: 'radial-gradient(circle, #4a4a4a 0%, #2a2a2a 50%, transparent 80%)',
                filter: 'blur(100px)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Header/Nav */}
      <header className="relative bg-transparent p-4 z-10">
        <nav className="container mx-auto flex justify-between items-center">
          <h1 className={`text-2xl font-bold ${righteous.className} flex items-center`}>
            <span className="
              bg-gradient-to-r from-[#8d5524] via-[#c68642] via-[#e0ac69] via-[#f1c27d] via-[#ffdbac] to-[#8d5524]
              bg-[length:200%_100%] bg-clip-text text-transparent
              animate-gradient-flow
              text-shadow-glow
            ">
              feetdle
            </span>
          </h1>
          
          <div className="flex-1 flex justify-center items-center">
            {/* Next Reset Timer - Only show when user has won */}
            {hasWon && nextResetTime && (
              <div className="
                bg-black/50 backdrop-blur-sm 
                border border-green-500/30 rounded-lg
                px-4 py-2 shadow-xl
                flex items-center
                translate-x-4
              ">
                <span className="text-gray-400 mr-2">Next puzzle:</span>
                <span className="text-green-400 font-mono">{nextResetTime}</span>
              </div>
            )}
          </div>
          
          <a 
            href="https://produceitem.xyz" 
            className="
              animate-gradient bg-gradient-to-r from-white/60 via-gray-400/60 to-white/60 
              bg-[length:200%_100%] bg-clip-text text-transparent 
              hover:text-gray-400 transition-colors
            "
          >
            more by produceitem
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative flex-grow container mx-auto p-4 z-10 flex flex-col items-center justify-center">
        <div className="relative flex justify-center">
          <div className={`
            bg-black/50 backdrop-blur-sm rounded-lg border border-gray-800 shadow-xl 
            flex flex-col p-6 transition-all duration-700 ease-in-out mb-6
            ${isExpanded ? 'w-[500px] aspect-[4/5]' : 'w-[400px] aspect-[3/2]'}
            relative
          `}>
            <div className={`
              text-center transition-all duration-700 ease-in-out
              ${isExpanded ? 'mt-1 mb-2' : 'flex-1 flex flex-col justify-center'}
              ${isTitleFadingOut && !isExpanded ? 'animate-fade-out' : ''}
            `}>
              <h2 className={`
                font-bold ${righteous.className} pb-1
                flex items-center justify-center transition-all duration-700
                ${isExpanded ? 'text-5xl' : 'text-7xl'}
              `}>
                <span className="
                  bg-gradient-to-r from-[#8d5524] via-[#c68642] via-[#e0ac69] via-[#f1c27d] via-[#ffdbac] to-[#8d5524]
                  bg-[length:200%_100%] bg-clip-text text-transparent
                  animate-gradient-flow
                ">
                  feetdle
                </span>
              </h2>
              {!isExpanded && (
                <p className={`text-gray-400 text-m ${righteous.className}`}>
                  embrace your inner{" "}       
                  <span className="
                    animate-gradient bg-gradient-to-r from-[#FFFF00]/100 via-[#FFFFA0]/100 via-[#FFD700]/100 via-[#FFFFD0]/100 to-[#FFFF00]/100 
                    bg-[length:200%_100%] bg-clip-text text-transparent
                    text-shadow-glow-yellow
                  ">
                  freak. 
                  </span>
                </p>
              )}
            </div>
            
            {isExpanded && (
              <div className="opacity-0 animate-fade-in flex flex-col gap-4 mt-6">
                {/* Action Buttons */}
                <div className="flex gap-2 justify-center items-center">
                  <button 
                    onClick={rotateImage}
                    className="
                    w-10 h-8
                    bg-black/30 border border-gray-800 
                    rounded-lg shadow-xl
                    text-gray-300 hover:text-white
                    backdrop-blur-sm
                    transition-colors duration-300
                    hover:bg-white/10
                    flex items-center justify-center
                    relative
                    group
                  ">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-max px-2 py-1 bg-black/80 text-gray-300 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      rotate image
                    </div>
                  </button>
                  <button 
                    onClick={toggleZoom}
                    className={`
                    w-10 h-8
                    bg-black/30 border
                    rounded-lg shadow-xl
                    backdrop-blur-sm
                    transition-all duration-300
                    flex items-center justify-center
                    relative
                    group
                    ${zoomEnabled 
                      ? 'text-[#FFFF00] border-[#FFFF00]/30 hover:bg-[#FFFF00]/10' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10 border-gray-800'}
                  `}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-max px-2 py-1 bg-black/80 text-gray-300 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {zoomEnabled ? "guesses zoom out picture" : "zoom disabled"}
                    </div>
                  </button>
                  <button 
                    onClick={toggleHints}
                    disabled={availableHints <= viewedHints || viewedHints >= 3}
                    className={`
                    w-10 h-8
                    bg-black/30 border border-gray-800 
                    rounded-lg shadow-xl
                    backdrop-blur-sm
                    transition-all duration-300
                    flex items-center justify-center
                    relative
                    group
                    ${availableHints > viewedHints && viewedHints < 3
                      ? 'text-[#FFFF00] border-[#FFFF00]/30 hover:bg-[#FFFF00]/10 cursor-pointer' 
                      : 'text-gray-300 hover:text-white hover:bg-white/10'}
                    ${availableHints <= viewedHints || viewedHints >= 3 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 9a3 3 0 0 1 6 0c0 2-3 3-3 3m.5 4h.01" />
                    </svg>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-max px-2 py-1 bg-black/80 text-gray-300 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {viewedHints >= 3 
                        ? "all hints given" 
                        : availableHints > viewedHints 
                          ? "View available hint" 
                          : `hint available in ${Math.min(5 - (guesses.length % 5), 5)} guesses`}
                    </div>
                  </button>
                </div>

                {/* Image Container */}
                <div 
                  className="relative w-full aspect-square rounded-lg overflow-hidden animated-border"
                  style={{ 
                    cursor: isExpanded ? 'zoom-in' : 'default'
                  }}
                  onClick={(e) => {
                    if (isExpanded) {
                      // When clicking on the image after expanding, update zoom origin
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      
                      // Set the zoom origin to the click point
                      const newZoomOrigin = `${x}% ${y}%`;
                      setZoomOrigin(newZoomOrigin);
                      
                      console.log(`Click at (${x.toFixed(2)}%, ${y.toFixed(2)}%) - Setting zoom origin: ${newZoomOrigin}`);
                      
                      // If zoom is disabled, enable it on click
                      if (!zoomEnabled) {
                        setZoomEnabled(true);
                        // Calculate zoom level based on guess count
                        const calculatedZoom = Math.max(50, 200 - (guesses.length * 5));
                        setZoomLevel(calculatedZoom);
                      }
                    }
                  }}
                >
                  <div 
                    className="absolute inset-0"
                    style={{
                      transform: `rotate(${imageRotation}deg)`,
                      transformOrigin: 'center',
                      transition: 'transform 0.3s ease-out'
                    }}
                  >
                    {dailyItem && dailyItem.imageUrl && (
                      <NextImage
                        src={dailyItem.imageUrl}
                        alt="Guess this item"
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, 500px"
                        className="object-cover transition-transform duration-300 ease-out" 
                        style={{
                          transformOrigin: zoomOrigin,
                          transform: hasWon ? 'scale(1)' : `scale(${zoomEnabled ? zoomLevel / 100 : 2})`,
                          opacity: imageLoaded ? 1 : 0,
                        }}
                        onLoad={() => {
                          setImageLoaded(true);
                          // Log image transform information for debugging
                          console.log('Image loaded with transform:');
                          console.log('- Transform origin:', zoomOrigin);
                          console.log('- Scale:', hasWon ? 1 : (zoomEnabled ? zoomLevel / 100 : 2));
                          console.log('- Rotation:', imageRotation);
                          console.log('- Position:', dailyItem.position);
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Input Field and Button Container - Hide if won */}
                {!hasWon && (
                  <div className="flex gap-2">
                    <div className="
                      flex-grow bg-black/30 
                      border border-gray-800 rounded-lg
                      backdrop-blur-sm shadow-xl
                      relative
                      z-50
                    ">
                      <input 
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleGuess();
                          }
                        }}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        placeholder="enter guess here"
                        className="
                          w-full py-2 px-4
                          bg-transparent
                          text-white placeholder-gray-500
                          border-none outline-none
                          focus:ring-0
                        "
                      />
                    </div>
                    <button 
                      onClick={handleGuess}
                      className={`
                        px-6 py-2
                        bg-black/30 border border-gray-800 
                        rounded-lg shadow-xl
                        text-gray-300 text-lg
                        backdrop-blur-sm
                        transition-all duration-300
                        
                        hover:bg-gradient-to-r hover:from-[#FFFF00]/10 hover:via-[#FFD700]/10 hover:to-[#FFFF00]/10
                        hover:border-[#FFFF00]/30 hover:text-[#FFFF00]
                        ${righteous.className}
                        flex items-center justify-center
                      `}
                    >
                      guess
                    </button>
                  </div>
                )}

                {/* Win Message */}
                {hasWon && (
                  <div className="
                    bg-gradient-to-r from-green-500/20 via-green-400/20 to-green-500/20
                    border border-green-500/30 rounded-lg
                    p-4 text-center
                    animate-fade-in
                  ">
                    <h3 className={`${righteous.className} text-green-400 text-xl mb-1`}>
                      Correct!
                    </h3>
                    <p className="text-gray-300">
                      You guessed the feet of the day! | <span className="text-green-400 font-semibold">{dailyItem?.name ? formatNameForDisplay(dailyItem.name) : ''}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hints Box */}
          {isExpanded && showHints && (
            <div className={`
              absolute left-full ml-4
              w-[250px]
              bg-black/50 backdrop-blur-sm 
              rounded-lg border border-gray-800 shadow-xl
              p-4
              opacity-0 -translate-x-4
              animate-slide-in
              transition-all duration-500 ease-in-out
            `}>
              <h3 className={`
                text-lg mb-2 ${righteous.className}
                animate-gradient bg-gradient-to-r from-[#8A2BE2]/90 via-[#4169E1]/90 to-[#8A2BE2]/90 
                bg-[length:200%_100%] bg-clip-text text-transparent
              `}>
                Hints
              </h3>
              <div className="space-y-2 relative pt-1 pb-1">
                {viewedHints >= 1 && dailyItem?.hints && dailyItem.hints.length >= 1 && (
                  <div className="pl-4 relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#8A2BE2] via-[#4169E1] to-[#8A2BE2] bg-[length:100%_300%]"
                      style={{
                        animation: `gradientMove 10s infinite linear`,
                        animationDelay: `${borderAnimationOffsets[0]}s`
                      }}
                    ></div>
                    <p className="text-gray-500">{dailyItem.hints[0].replace(/^-\s*/, '')}</p>
                  </div>
                )}
                {viewedHints >= 2 && dailyItem?.hints && dailyItem.hints.length >= 2 && (
                  <div className="pl-4 relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#8A2BE2] via-[#4169E1] to-[#8A2BE2] bg-[length:100%_300%]"
                      style={{
                        animation: `gradientMove 10s infinite linear`,
                        animationDelay: `${borderAnimationOffsets[1]}s`
                      }}
                    ></div>
                    <p className="text-gray-500">{dailyItem.hints[1].replace(/^-\s*/, '')}</p>
                  </div>
                )}
                {viewedHints >= 3 && dailyItem?.hints && dailyItem.hints.length >= 3 && (
                  <div className="pl-4 relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#8A2BE2] via-[#4169E1] to-[#8A2BE2] bg-[length:100%_300%]"
                      style={{
                        animation: `gradientMove 10s infinite linear`,
                        animationDelay: `${borderAnimationOffsets[2]}s`
                      }}
                    ></div>
                    <p className="text-gray-500">{dailyItem.hints[2].replace(/^-\s*/, '')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!isExpanded && (
          <button
            onClick={() => {
              setIsTitleFadingOut(true);
              setCookie('feetdle_started', 'true', 1);
              // Delay the expansion to allow the fade-out animation to complete
              setTimeout(() => {
                setIsExpanded(true);
                setIsTitleFadingOut(false);
              }, 700);
            }}
            className="
              px-8 py-2 border border-gray-600 rounded-md
              text-gray-300 font-[Righteous]
              transition-all duration-500
              hover:bg-gradient-to-r hover:from-[#FFFF00]/10 hover:via-[#FFD700]/10 hover:to-[#FFFF00]/10
              hover:border-[#FFFF00]/30 hover:text-[#FFFF00]
            "
          >
            get freaky
          </button>
        
        )}

        {/* Guesses Container */}
        {isExpanded && guesses.length > 0 && (
          <div className="w-[500px] relative z-[10]">
            <div className="flex flex-col gap-2">
              {guesses.map((guess, index) => (
                <div 
                  key={index}
                  className={`
                    backdrop-blur-sm rounded-lg 
                    border shadow-xl 
                    p-4 w-full
                    ${correctGuessIndex === index 
                      ? 'bg-green-500/20 border-green-500/50' 
                      : 'bg-black/50 border-gray-800'}
                  `}
                >
                  <p className={`${correctGuessIndex === index ? 'text-green-400' : 'text-gray-300'}`}>
                    {formatNameForDisplay(guess)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative bg-black border-t border-gray-800 py-2 shadow-2xl">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <a 
            href="https://produceitem.xyz" 
            className="
              animate-gradient bg-gradient-to-r from-white/60 via-gray-400/60 to-white/60 
              bg-[length:200%_100%] bg-clip-text text-transparent
              hover:text-white transition-colors
            "
          >
            produceitem
          </a>
          <p className="
            animate-gradient bg-gradient-to-r from-white/60 via-gray-400/60 to-white/60 
            bg-[length:200%_100%] bg-clip-text text-transparent
          ">
            &copy; 2024 feetdle - all rights reserved.
          </p>
          <a href="/about" className="
            animate-gradient bg-gradient-to-r from-white/60 via-gray-400/60 to-white/60 
            bg-[length:200%_100%] bg-clip-text text-transparent
            hover:text-white transition-colors
          ">
            about
          </a>
        </div>
        
        {/* Ko-fi button - fixed positioning */}
        <div className="absolute bottom-full left-4 mb-4 flex flex-col items-start">
          <div className="relative mb-2 px-2 py-1 bg-black/30 rounded-full text-sm text-gray-300 opacity-80 shadow-lg backdrop-blur-sm animate-bob">
            we can&apos;t have ads!
            <div className="absolute bottom-0 left-8 w-4 h-4 transform translate-y-2">
              <svg viewBox="0 0 24 24" className="w-full h-full text-gray-300 fill-current">
                <path d="M20 12l-8 8-8-8h5V4h6v8z" />
              </svg>
            </div>
          </div>
          
          <a
            href="https://ko-fi.com/produceitem"
            target="_blank"
            rel="noopener noreferrer"
            className={`
              bg-black/30 border border-gray-800 
              text-gray-300 font-bold py-2 px-4 rounded-full
              shadow-lg backdrop-blur-sm
              transition-all duration-300
              hover:bg-gradient-to-r hover:from-blue-500/10 hover:via-blue-600/10 hover:to-blue-500/10
              hover:border-blue-500/30 hover:text-blue-400
              flex items-center gap-2
            `}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            support on ko-fi
          </a>
        </div>
        
        <div className="absolute bottom-full right-0 mb-4 mr-4">
          <div 
            className={`
              transition-all duration-300 ease-in-out
              ${isBugFormVisible 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
              }
            `}
          >
            <div className="bg-black/50 border border-gray-800 rounded-lg p-4 shadow-xl backdrop-blur-sm">
              <textarea
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                placeholder="Describe the bug... or request more feet!"
                className="w-full p-2 bg-transparent text-white border border-gray-700 rounded-md mb-2 focus:border-gray-500 focus:outline-none transition-colors duration-200"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBugFormVisible(false)}
                  className="flex-1 bg-gray-700/50 text-gray-300 font-bold py-2 px-4 rounded-md shadow-lg transition-all duration-200 hover:bg-gray-600/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBugSubmit}
                  className="flex-1 bg-gradient-to-r from-green-500/80 to-green-700/80 text-white font-bold py-2 px-4 rounded-md shadow-lg transition-all duration-200 hover:from-green-500 hover:to-green-700"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsBugFormVisible(true)}
            className={`
              bg-black/30 border border-gray-800 
              text-gray-300 font-bold py-2 px-4 rounded-full
              shadow-lg backdrop-blur-sm
              transition-all duration-300
              hover:bg-gradient-to-r hover:from-red-500/10 hover:via-red-600/10 hover:to-red-500/10
              hover:border-red-500/30 hover:text-red-500
              ${isBugFormVisible ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}
              relative z-10
            `}
          >
            Found a bug?
          </button>
        </div>
        <div 
          className={`
            absolute bottom-full right-0 mb-16 mr-4 py-2 px-4 rounded-md shadow-lg
            transition-all duration-300 ease-in-out
            ${showToast 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-4 pointer-events-none'
            }
            ${toastType === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}
          `}
        >
          {toastMessage}
        </div>
      </footer>
    </div>
  );
}
