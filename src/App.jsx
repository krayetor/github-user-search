import React, { useState, useEffect } from "react";
import Search from "./components/Search";
import { Analytics } from "@vercel/analytics/react";

function App() {

  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // get the html tag specifically
    const root = window.document.documentElement;

    // safety check: if the browser hasn't loaded the tag yet, stop
    if (!root) return;
    // add or remove the class

    if (theme === 'dark') {
    root.classList.add('dark');
    } else {
    root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-300">

      {/* Header / navbar */}
      <header className="sticky top-4 z-50 mx-auto w-[95%] max-w-3xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-gray-200 dark:border-slate-700/50 p-4 shadow-xl rounded-full px-6 py-3 mb-4 transition-colors duration-300">

        <div className="flex items-center justify-between">
          
          <div className="flex items-center justify-between w-full">
            {/* GitHub icon for academic purposes */}

            {/* left side: logo + title */}
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 16 16"
                width="32"
                height="32"
                fill="currentColor"
                className="text-gray-900 dark:text-white hover:text-green-500 dark:hover:text-green-500 transition-colors duration-300 cursor-pointer"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
              <h1 className="text-lg font-bold tracking-wide sm:block">
                GitHub User Search
              </h1>
            </div>

            {/* right side: theme toggle button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-yellow-300 hover:scale-110 transition-all duration-300"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                /* sun icon (for dark mode) */
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              ): (
                /* Moon Icon (for Light Mode) */
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* main content area */}
      <main className="w-full max-w-3xl mx-auto p-4 flex-1 flex flex-col justify-center">
        <Search />
      </main>

      {/* footer with disclaimer */}
      <footer className="text-center text-gray-500 dark:text-slate-500 text-sm py-6">
        <p className="mt-2">
          Developed by{' '}
          <a 
            href="https://x.com/krayetor"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-400 underline underline-offser-4 hover:text-green-400 transition-colors duration-300"
          >
            @krayetor
          </a>
        </p>
        <p>Not affiliated with or endorsed by GitHub Inc.</p>
      </footer>

      <Analytics />
      
    </div>
  );
}

export default App;