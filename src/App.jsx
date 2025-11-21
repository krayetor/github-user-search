import React, { useState } from "react";
import Search from "./components/Search";

function App() {
  // will use this later to store data
  const [users, setUsers] = useState([]);

  const handleSearch = async (username) => {
    try {
      const results = await searchUsers(username);
      setUsers(results);
      console.log(results); // check console to see data
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 font-sans">
      {/* Header / navbar */}
      <header className="bg-slate-800 p-4 shadow-md border-b border-slate-700">
        <div className="container mx-auto flex items-center gap-3">
          {/* GitHub icon for academic purposes */}
          <svg
            viewBox="0 0 98 96"
            width="36"
            height="36"
            xmlns="http://www.w3.org/2000/svg"
            className="text-white hover:text-green-500 transition-colors duration-300 cursor-pointer"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
              fill="currentColor"
            />
          </svg>
          <h1 className="text-xl font-bold tracking-wide">
            GitHub User Search
          </h1>
        </div>
      </header>

      {/* main content area */}
      <main className="max-w-3xl mx-auto p-4 w-full">
        <Search />
      </main>

      {/* footer with disclaimer */}
      <footer className="mt-12 text-center text-slate-500 text-sm py-6">
        <p className="mt-2">
          developed by{' '}
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
    </div>
  );
}

export default App;