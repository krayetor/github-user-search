import React, { use, useState } from "react";
import { fetchUserData } from "../services/githubServices";

function Search() {
    const [username, setUsername] = useState('');
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // reset states before new search
        setLoading(true);
        setError(false);
        setUserData(null);

        try {
            const data = await fetchUserData(username);
            console.log("API DATA:", data);
            setUserData(data);
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            {/* search form */}
            <form onSubmit={handleSubmit} className="flex gap-4 mb-8 bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg">
                <input
                    type="text"
                    placeholder="Enter Github username..."
                    className="flex-1 bg-slate-900 border-slate-600 text-white placeholder-gray-400 rounded-md py-2 px-4 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
                >
                    Search
                </button>
            </form>

            {/* conditional rendering section */}
            <div className="text-center">

                {/* loading state */}
                {loading && (
                    <p className="text-lg text-gray-300 animate-pulse">Loading...</p>
                )}

                {/* error state */}
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
                        Looks like we cant find the user
                    </div>
                )}

                {/* success state (display basic info) */}
                {userData && (
                    <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 shadow-xl flex flex-col items-center animate-fade-in">
                        <img
                            src={userData.avatar_url}
                            alt={`${userData.login}'s avatar`}
                            className="w-32 h-32 rounded-full border-green-500 mb-4 shadow-lg"
                        />
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {userData.name || userData.login}
                        </h2>
                        <a
                            href={userData.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 hover:underline underline-offset-4 font-medium"
                        >
                            View GitHub Profile
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Search;