import React, { useState } from "react";
import { searchUsers, fetchUserData } from "../services/githubService";

function Search() {
    // form state
    const [username, setUsername] = useState('');
    const [location, setLocation] = useState('');
    const [minRepos, setMinRepos] = useState('');

    // data state
    const [users, setUsers] = useState([]); // array of users
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const handleSearch = async (e, newPage = 1) => {
        if (e) e.preventDefault();

        // dont search if empty
        if (!username && !location) return;

        setLoading(true);
        setError(false);

        try {
            // perform the search
            const data = await searchUsers(username, location, minRepos, newPage);

            // fetch details for each user
            const detailedUsers = await Promise.all(
                data.items.map(async (user) => {
                    return await fetchUserDetails(user.login);
                })
            );

            if (newPage === 1) {
                setUsers(detailedUsers);
            } else {
                setUsers(prev => {
                    const existingIds = new Set(prev.map(u => u.id));
                    const uniqueNewUsers = detailedUsers.filter(u => !existingIds.has(u.id));
                    return [...prev, ...uniqueNewUsers];
                })
            }

            // check if there are more results
            setHasMore(data.total_count > newPage * 10);
            setPage(newPage);

        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
       handleSearch(null, page + 1);
    };

    return (
        <div className="w-full mx-auto">
            {/* advanced search form */}
            <form onSubmit={(e) => handleSearch(e, 1)} className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-lg mb-8 transition-colors duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* username input */}
                    <input
                        type="text"
                        placeholder="Username (e.g. krayetor)"
                        className="bg-gray-50 dark:bg-slate-900 border boder-gray-300 dark:border-slate-600 text-gray-900 dark:text-white p-3 rounded focus:outline-none focus:border-green-500"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    {/* location input */}
                    <input
                        type="text"
                        placeholder="Location (e.g. Mars)"
                        className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white p-3 rounded focus:outline-none focus:border-green-500 transition-colors"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* min repo input */}
                    <input
                        type="number"
                        placeholder="Min Repositories"
                        className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white p-3 rounded focus:outline-none focus:border-green-500 w-full md:w-1/3 transition-colors"
                        value={minRepos}
                        onChange={(e) => setMinRepos(e.target.value)}
                    />

                    {/* search button */}
                    <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded w-full md:w-2/3 transition-colors shadow-md hover:shadow-lg"
                    >
                        Search GitHub
                    </button>
                </div>
            </form>

            {/* error state */}
            {error && (
                <div className="text-center text-red-600 dark:text-red-400 mb-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded">
                    Something went wrong. Please try again.
                </div>
            )}

            {/* results grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {users.map((user) => (
                    <div
                        key={user.id}
                        className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-md hover:border-green-500 dark:hover:border-green-500 transition-all duration-300 group flex items-start gap-4"
                    >
                        <img
                            src={user.avatar_url}
                            alt={user.login}
                            className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-slate-600 shrink-0"
                        />

                        <div className="flex-1 overflow-hidden">
                            <h3 className="text-xl font-bold text-white truncate">{user.name || user.login}</h3>
                            <a
                                href={user.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 dark:text-green-400 text-sm mb-2 hover:underline inline-block font-medium"
                            >
                                @{user.login}
                            </a>

                            {/* advanced details */}
                            <div className="text-gray-500 dark:text-slate-400 text-sm flex flex-col gap-1 mb-4 mt-2">
                                <p>📍 {user.location || 'N/A'}</p>
                                <p>📚 {user.public_repos} Repositories</p>
                            </div>

                            <a
                                href={user.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white py-1 px-3 rounded transition-colors inline-block font-medium border border-gray-200 dark:border-transparent"
                            >
                              View Profile
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/* loading state */}
            {loading && <p className="text-center text-gray-500 dark:text-gray-400 mt-8 animate-pulse">Loading results...</p>}

            {/* loading more button */}
            {!loading && hasMore && (
                <div className="text-center mt-8">
                    <button
                        onClick={loadMore}
                        className="bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-800 dark:text-white font-semibold py-2 px-6 rounded border border-gray-300 dark:border-slate-600 transition-colors shadow-sm"
                    >
                        Load More Users
                    </button>
                </div>
            )}
        </div>
    );
}

export default Search;