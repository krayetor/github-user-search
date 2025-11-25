import React, { useState, useEffect } from "react";
import { searchUsers, fetchUserData, fetchUserRepos } from "../services/githubService";
import SkeletonCard from "./SkeletonCard";
import UserModal from "./UserModal";

function Search() {
    // form state
    const [username, setUsername] = useState('');
    const [location, setLocation] = useState('');
    const [minRepos, setMinRepos] = useState('');
    const [language, setLanguage] = useState('');

    const [sortType, setSortType] = useState('best-match');
    // app state
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [history, setHistory] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    const [selectedUser, setSelectedUser] = useState(null);
    const [userRepos, setUserRepos] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

    // load history from local storage when app starts
    useEffect(() => {
        const saved = localStorage.getItem('github_search_history');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setHistory(parsed);
            } catch (err) {
                console.error("History load error", err);
            }
        }
    }, []);

    // helper to add a term to history
    const addToHistory = (term) => {
        setHistory(prev => {
            // create new array with new term at the front
            const newHistory =[term, ...prev];
            // remove duplicates (set) and keep only top 5 (slice)
            const unique = [...new Set(newHistory)].slice(0, 5);
            // save to local storage
            localStorage.setItem('github_search_history', JSON.stringify(unique));
            return unique;
        });
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('github_search_history');
    };

    const handleHistoryClick =(term) => {
        setUsername(term);
        handleSearch(null, 1, term);
    };

    const handleQuickView = async (user) => {
        setSelectedUser(user);
        setModalLoading(true);
        setUserRepos([]);

        try {
            const repos = await fetchUserRepos(user.login);
            setUserRepos(repos)
        } catch (err) {
            console.error(err);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedUser(null);
    };

    const handleSearch = async (e, newPage = 1, specificTerm = null) => {
        if (e) e.preventDefault();

        const query = specificTerm || username;

        // dont search if empty
        if (!query && !location) return;

        setLoading(true);
        setError(false);

        if (newPage === 1 && query) {
            addToHistory(query);
        }

        try {
            // perform the search
            const data = await searchUsers(query, location, minRepos, language, sortType, newPage);

            // fetch details for each user
            const detailedUsers = await Promise.all(
                data.items.map(async (user) => {
                    return await fetchUserData(user.login);
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
            setHasSearched(true);
        }
    };

    const loadMore = () => {
       handleSearch(null, page + 1);
    };

    return (
        <div className="w-full mx-auto">

            {/* render modal if user is selected */}
            {selectedUser && (
                <UserModal
                    user={selectedUser}
                    repos={userRepos}
                    onClose={closeModal}
                />
            )}

            {/* advanced search form */}
            <form 
                onSubmit={(e) => handleSearch(e, 1)} 
                className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-lg mb-4 transition-colors flex flex-col gap-4 max-w-sm mx-auto w-full"
            >
                
                {/* username input */}
                <input
                    type="text"
                    placeholder="Username (e.g. krayetor)"
                    className="bg-gray-50 dark:bg-slate-900 border boder-gray-300 dark:border-slate-600 text-gray-900 dark:text-white p-3 rounded focus:outline-none focus:border-green-500 transition-colors w-full"                        value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                {/* location input */}
                <input
                    type="text"
                    placeholder="Location (e.g. Mars)"
                    className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white p-3 rounded focus:outline-none focus:border-green-500 transition-colors w-full"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />

                {/* languages  */}
                <input
                    type="text"
                    placeholder="Languages (e.g. C++, Python)"
                    className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white p-3 rounded focus:outline-none focus:border-green-500 transition-colors w-full"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* min repo input */}
                    <input
                        type="number"
                        placeholder="Min Repos"
                        className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white p-3 rounded focus:outline-none focus:border-green-500 transition-colors w-full"
                        value={minRepos}
                        onChange={(e) => setMinRepos(e.target.value)}
                    />

                    <select
                        value={sortType}
                        onChange={(e) => setSortType(e.target.value)}
                        className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white p-3 rounded focus:outline-none focus:border-green-500 cursor-pointer transition-colors w-full"
                    >
                        <option value="best-match">Best Match</option>
                        <option value="followers">Most Followers</option>
                        <option value="repositories">Repositories</option>
                        <option value="joined">Newest Joined</option>
                    </select>
                </div>

                <div className="flex justify-center mt-2">
                    {/* search button */}
                    <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded transition-colors shadow-md hover:shadow-lg w-full"
                    >
                        Search
                    </button>
                </div>
                
            </form>

            {/* history chips section */}
            {history.length > 0 && (
                <div className="flex items-center gap-2 mb-8 flex-wrap">
                    <span className="text-sm text-gray-500 dark:text-slate-400">Recent:</span>
                    {history.map((term, index) => (
                        <button
                            key={index}
                            onClick={() => handleHistoryClick(term)}
                            className="px-3 py-1 text-xs bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-700 dark:hover:text-green-400 transition-colors cursor-pointer border border-transparent hover:border-green-400"
                        >
                            {term}
                        </button>
                    ))}
                    <button
                        onClick={clearHistory}
                        className="text-xs text-red-400 hover:text-red-600 underline ml-2"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* error state */}
            {error && (
                <div className="text-center text-red-600 dark:text-red-400 mb-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded">
                    Something went wrong. Please try again.
                </div>
            )}

            {/* user not found state */}
            {!loading && !error && hasSearched && users.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-dashed dark:border-slate-700 animate-fade-in">
                    <div className="text-4xl mb-2">🔍</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        No users found
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        We couldn't find anyone matching "{username}"
                    </p>
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
                            className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-slate-600 shrink-0 cursor-pointer hover:opacity-80"
                            onClick={() => handleQuickView(user)}
                        />

                        <div className="flex-1 overflow-hidden">

                            {/* username: open modal */}
                            <button
                                onClick={() => handleQuickView(user)}
                                className="text-left hover:underline decoration-green underline-offset-4"
                            >
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{user.name || user.login}</h3>
                            </button>
                            
                            <div className="text-green-600 dark:text-green-400 text-sm mb-2 font-medium">@{user.login}</div>

                            {/* advanced details */}
                            <div className="text-gray-500 dark:text-slate-400 text-sm flex flex-col gap-1 mb-4 mt-2">
                                <p>📍 {user.location || 'N/A'}</p>
                                <p>📚 {user.public_repos} Repositories</p>
                            </div>

                            {/* two buttons (quick view & external) */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleQuickView(user)}
                                    className="text-sm bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 py-1 px-3 rounded transition-colors font-medium border border-green-200 dark:border-green-900"
                                >
                                    Quick View
                                </button>

                                <a
                                    href={user.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white py-1 px-3 rounded transition-colors inline-block font-medium border border-gray-200 dark:border-transparent"
                                >
                                    GitHub ↗
                                </a>
                            </div>
                            
                        </div>
                    </div>
                ))}
            </div>

            {/* loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* create an array of 8 items to render 8 skeletons */}
                    {[...Array(8)].map((_, index) => <SkeletonCard key={index} />)}
                </div>
            )}

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