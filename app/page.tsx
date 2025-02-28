'use client'
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Righteous } from 'next/font/google';

const righteous = Righteous({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [showHints, setShowHints] = useState(false);
  const [availableHints, setAvailableHints] = useState(0);
  const [viewedHints, setViewedHints] = useState(0);
  const [borderAnimationOffsets, setBorderAnimationOffsets] = useState<number[]>([0, 0, 0]);
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
  } | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const [correctGuessIndex, setCorrectGuessIndex] = useState<number | null>(null);
  const [imageRotation, setImageRotation] = useState(0);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(200);
  const [nextResetTime, setNextResetTime] = useState<string>('');

  // Calculate available hints based on guess count
  useEffect(() => {
    setAvailableHints(Math.min(Math.floor(guesses.length / 5), 3));
    
    // Reduce zoom level by 10% for each guess if zoom is enabled
    if (zoomEnabled && guesses.length > 0) {
      const newZoomLevel = Math.max(100, 200 - (guesses.length * 10));
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

  // Update dropdown position when input is focused or window is resized
  useEffect(() => {
    const updatePosition = () => {
      if (isDropdownVisible && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    };
    
    // Update position immediately
    updatePosition();
    
    // Add resize listener to update position when window size changes
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isDropdownVisible, inputValue]);

  // Fetch items from the API when component mounts
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items');
        const data = await response.json();
        
        if (data.items) {
          setItems(data.items);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
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
          setDailyItem(data.item);
        }
      } catch (error) {
        console.error('Error fetching daily item:', error);
        // Fallback to first item if daily item fetch fails
        if (items.length > 0) {
          setDailyItem(items[0]);
        }
      }
    };
    
    if (!isLoading && items.length > 0) {
      fetchDailyItem();
    }
  }, [isLoading, items]);

  // Calculate time until next reset (midnight PST)
  useEffect(() => {
    if (!hasWon) return;

    const calculateTimeUntilReset = () => {
      const now = new Date();
      
      // Calculate PST/PDT time (UTC-7 or UTC-8 depending on daylight saving)
      const pstOffset = -7; // PST is UTC-7 (or -8 during standard time)
      const pstNow = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000));
      
      // Set target time to next midnight PST
      const tomorrow = new Date(pstNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      // Convert back to local time for comparison
      const tomorrowLocal = new Date(tomorrow.getTime() - (pstOffset * 60 * 60 * 1000));
      
      // Calculate difference
      const diff = tomorrowLocal.getTime() - now.getTime();
      
      // Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Update the timer immediately
    setNextResetTime(calculateTimeUntilReset());
    
    // Set up interval to update the timer every second
    const intervalId = setInterval(() => {
      setNextResetTime(calculateTimeUntilReset());
    }, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [hasWon]);

  const handleGuess = () => {
    if (inputValue.trim() && !hasWon) {
      // Check if the input value exists in the items list
      const isValidGuess = items.some(item => 
        item.name.toLowerCase() === inputValue.toLowerCase()
      );
      
      if (!isValidGuess) {
        // If it's not a valid item name, don't add it to guesses
        return;
      }
      
      const newGuesses = [inputValue, ...guesses]; // Add new guess to the beginning
      setGuesses(newGuesses);
      setHasGuessed(true);
      
      // Check if the guess is correct
      if (dailyItem && inputValue.toLowerCase() === dailyItem.name.toLowerCase()) {
        setHasWon(true);
        setCorrectGuessIndex(0); // The newest guess is at index 0
      }
      
      setInputValue(''); // Clear input after guess
    }
  };

  const handleOptionSelect = (option: string) => {
    setInputValue(option);
    setIsDropdownVisible(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsDropdownVisible(true);
  };

  const toggleHints = () => {
    if (availableHints > 0) {
      setShowHints(true);
      setViewedHints(availableHints);
    } else {
      setShowHints(false);
    }
  };

  const rotateImage = () => {
    // Rotate by 90 degrees each time, completing a full 360 rotation
    setImageRotation((prev) => (prev + 90) % 360);
  };

  const toggleZoom = () => {
    setZoomEnabled(prev => !prev);
    // Reset zoom to 200% if enabling, or to 100% if disabling
    setZoomLevel(zoomEnabled ? 100 : 200);
  };

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
          <h1 className={`text-xl font-bold text-white ${righteous.className} flex items-center`}>
            testdle
            <span className="
              animate-gradient bg-gradient-to-r from-white/60 via-gray-400/60 to-white/60 
              bg-[length:200%_100%] bg-clip-text text-transparent
            ">.xyz</span>
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

      {/* Dropdown Portal - Moved to root level */}
      {isDropdownVisible && (
        <div 
          className="fixed bg-black/80 border border-gray-800 rounded-lg backdrop-blur-sm shadow-xl max-h-48 overflow-y-auto z-[9999]
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:bg-black/20
            [&::-webkit-scrollbar-thumb]:bg-gray-800
            [&::-webkit-scrollbar-thumb]:rounded-full"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {isLoading ? (
            <div className="px-4 py-2 text-gray-400">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-2 text-gray-400">No items found</div>
          ) : (
            items.map((item, index) => (
              <button 
                key={item._id}
                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-white/10 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleOptionSelect(item.name);
                }}
              >
                {item.name}
              </button>
            ))
          )}
        </div>
      )}
      

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
            `}>
              <h2 className={`
                font-bold ${righteous.className} pb-1
                flex items-center justify-center transition-all duration-700
                ${isExpanded ? 'text-4xl' : 'text-6xl'}
              `}>
                testdle
                <span className="
                  animate-gradient bg-gradient-to-r from-white/60 via-gray-400/60 to-white/60 
                  bg-[length:200%_100%] bg-clip-text text-transparent py-2
                 
                ">.xyz</span>
              </h2>
              {!isExpanded && (
                <p className={`text-gray-400 text-m ${righteous.className}`}>
                  embrace your inner       
                  <span className="
                    animate-gradient bg-gradient-to-r from-[#FFFF00]/100 via-[#FFD700]/100 to-[#FFFF00]/100 
                    bg-[length:200%_100%] bg-clip-text text-transparent
                  ">
                  beans. 
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
                    bg-black/30 
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
                      {zoomEnabled ? "zoom enabled" : "zoom disabled"}
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
                <div className="
                  w-full aspect-square bg-black/30 
                  border border-gray-800 rounded-lg
                  backdrop-blur-sm shadow-xl
                  flex items-center justify-center
                  overflow-hidden
                ">
                  {dailyItem && dailyItem.imageUrl ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <Image 
                        src={dailyItem.imageUrl}
                        alt="Daily item image"
                        width={500}
                        height={500}
                        className="object-contain transition-all duration-300"
                        style={{ 
                          transform: `rotate(${imageRotation}deg) scale(${zoomLevel/100})`,
                          transformOrigin: 'center'
                        }}
                      />
                    </div>
                  ) : items.length > 0 && items[0].imageUrl ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <Image 
                        src={items[0].imageUrl}
                        alt="Item image"
                        width={500}
                        height={500}
                        className="object-contain transition-all duration-300"
                        style={{ 
                          transform: `rotate(${imageRotation}deg) scale(${zoomLevel/100})`,
                          transformOrigin: 'center'
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500">Image will appear here</p>
                  )}
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
                        onChange={handleInputChange}
                        className="
                          w-full px-4 py-2.5
                          bg-transparent
                          text-white placeholder-gray-500
                          focus:outline-none
                          h-10 flex items-center
                        "
                        placeholder="Enter your guess..."
                        onFocus={() => setIsDropdownVisible(true)}
                        onBlur={() => setTimeout(() => setIsDropdownVisible(false), 200)}
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
                      You guessed today's item: <span className="text-green-400 font-semibold">{dailyItem?.name}</span>
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
                {viewedHints >= 1 && (
                  <div className="pl-4 relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#8A2BE2] via-[#4169E1] to-[#8A2BE2] bg-[length:100%_300%]"
                      style={{
                        animation: `gradientMove 10s infinite linear`,
                        animationDelay: `${borderAnimationOffsets[0]}s`
                      }}
                    ></div>
                    <p className="text-gray-500">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula.</p>
                  </div>
                )}
                {viewedHints >= 2 && (
                  <div className="pl-4 relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#8A2BE2] via-[#4169E1] to-[#8A2BE2] bg-[length:100%_300%]"
                      style={{
                        animation: `gradientMove 10s infinite linear`,
                        animationDelay: `${borderAnimationOffsets[1]}s`
                      }}
                    ></div>
                    <p className="text-gray-500">Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor.</p>
                  </div>
                )}
                {viewedHints >= 3 && (
                  <div className="pl-4 relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#8A2BE2] via-[#4169E1] to-[#8A2BE2] bg-[length:100%_300%]"
                      style={{
                        animation: `gradientMove 10s infinite linear`,
                        animationDelay: `${borderAnimationOffsets[2]}s`
                      }}
                    ></div>
                    <p className="text-gray-500">Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna. Quisque cursus, metus vitae pharetra auctor.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="
              px-10 py-3 border border-gray-600 rounded-md
              text-gray-300 font-[Righteous]
              transition-all duration-500
              hover:bg-gradient-to-r hover:from-[#FFFF00]/10 hover:via-[#FFD700]/10 hover:to-[#FFFF00]/10
              hover:border-[#FFFF00]/30 hover:text-[#FFFF00]
            "
          >
            start
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
                    {guess}
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
            &copy; 2024 testdle - all rights reserved.
          </p>
          <a href="/about" className="
            animate-gradient bg-gradient-to-r from-white/60 via-gray-400/60 to-white/60 
            bg-[length:200%_100%] bg-clip-text text-transparent
            hover:text-white transition-colors
          ">
            about
          </a>
        </div>
      </footer>
    </div>
  );
}
