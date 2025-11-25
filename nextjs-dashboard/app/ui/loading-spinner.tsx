'use client';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {/* Animated circles */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Outer circle */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
          
          {/* Spinning circle 1 */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-500"
            style={{
              animation: 'spin 1s linear infinite'
            }}
          ></div>
          
          {/* Spinning circle 2 (reverse) */}
          <div 
            className="absolute inset-3 rounded-full border-4 border-transparent border-b-indigo-600"
            style={{
              animation: 'spin 1.5s linear infinite reverse'
            }}
          ></div>
          
          {/* Center dot */}
          <div className="absolute inset-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg"></div>
        </div>
        
        {/* Animated text */}
        <div className="mb-6">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 tracking-wide">
            Loading
            <span 
              className="inline-block ml-1"
              style={{
                animation: 'bounce 1.4s infinite'
              }}
            >
              .
            </span>
            <span 
              className="inline-block"
              style={{
                animation: 'bounce 1.4s infinite 0.2s'
              }}
            >
              .
            </span>
            <span 
              className="inline-block"
              style={{
                animation: 'bounce 1.4s infinite 0.4s'
              }}
            >
              .
            </span>
          </p>
        </div>
        
        {/* Pulsing dots */}
        <div className="flex justify-center gap-2">
          <div 
            className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          ></div>
          <div 
            className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.2s'
            }}
          ></div>
          <div 
            className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.4s'
            }}
          ></div>
        </div>
        
        {/* Sub text */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">Please wait...</p>
        
        {/* Inline styles for animations */}
        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes bounce {
            0%, 80%, 100% {
              opacity: 0.5;
              transform: translateY(0);
            }
            40% {
              opacity: 1;
              transform: translateY(-10px);
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
