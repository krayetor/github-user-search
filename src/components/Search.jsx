import React, { useState, useEffect, useRef } from "react";
import { searchUsers, fetchUserData, fetchUserRepos } from "../services/githubService";
import { useFavorites } from "../hooks/useFavorites";
import SkeletonCard from "./SkeletonCard";
import UserModal from "./UserModal";
import CompareModal from "./CompareModal";
import { exportToCSV, exportToJSON } from "../utils/exportUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query string from the current search params.
 * Only includes keys that have a non-empty value.
 */
function buildQueryString(username, location, language, minRepos) {
    const params = new URLSearchParams();
    if (username) params.set('user', username);
    if (location) params.set('location', location);
    if (language) params.set('lang', language);
    if (minRepos) params.set('minRepos', minRepos);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

const EXPLORE_PRESETS = [
    { icon: "🔥", label: "Top Rust", language: "Rust", minRepos: "10", location: "", sort: "followers" },
    { icon: "⚡", label: "React & TS", language: "TypeScript", minRepos: "10", location: "", sort: "followers" },
    { icon: "🐍", label: "Python Gurus", language: "Python", minRepos: "15", location: "", sort: "followers" },
    { icon: "🌍", label: "Most Followed", language: "", minRepos: "50", location: "", sort: "followers" },
    { icon: "🇬🇭", label: "Ghana", language: "", minRepos: "", location: "Ghana", sort: "followers" },
    { icon: "🇳🇬", label: "Lagos", language: "", minRepos: "", location: "Lagos", sort: "followers" },
];

function Search({ onRateLimitUpdate }) {
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

    // favorites
    const { favorites, isFavorite, toggleFavorite, clearFavorites } = useFavorites();
    const [favTrayOpen, setFavTrayOpen] = useState(false);

    // developer compare queue (up to 2 users)
    const [compareQueue, setCompareQueue] = useState([]);
    const [compareOpen, setCompareOpen] = useState(false);

    const isComparing = (user) => compareQueue.some(u => u.login === user.login);

    const toggleCompare = (user) => {
        setCompareQueue(prev => {
            const exists = prev.some(u => u.login === user.login);
            if (exists) {
                return prev.filter(u => u.login !== user.login);
            }
            if (prev.length >= 2) {
                const updated = [prev[0], user];
                setCompareOpen(true);
                return updated;
            }
            const updated = [...prev, user];
            if (updated.length === 2) {
                setCompareOpen(true);
            }
            return updated;
        });
    };

    const clearCompare = () => {
        setCompareQueue([]);
        setCompareOpen(false);
    };

    // input ref for keyboard shortcut focus
    const usernameInputRef = useRef(null);

    // -------------------------------------------------------------------------
    // Global keyboard shortcuts:
    // - '/' or 'Cmd/Ctrl + K' focuses the search input
    // - 'Escape' clears active input focus when no modal is open
    // -------------------------------------------------------------------------
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
            const isSlash = e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

            if (isCmdK || isSlash) {
                e.preventDefault();
                if (usernameInputRef.current) {
                    usernameInputRef.current.focus();
                    usernameInputRef.current.select();
                }
            } else if (e.key === 'Escape' && document.activeElement === usernameInputRef.current) {
                usernameInputRef.current.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // -------------------------------------------------------------------------
    // On mount: read URL search params and auto-fire search if present.
    // This is what makes URLs shareable — opening ?user=krayetor runs the search.
    // useRef guards against double-firing in React 18 StrictMode.
    // -------------------------------------------------------------------------
    const didAutoSearch = useRef(false);
    useEffect(() => {
        if (didAutoSearch.current) return;
        const params = new URLSearchParams(window.location.search);
        const urlUser = params.get('user') || '';
        const urlLocation = params.get('location') || '';
        const urlLang = params.get('lang') || '';
        const urlMinRepos = params.get('minRepos') || '';

        if (urlUser || urlLocation || urlLang || urlMinRepos) {
            didAutoSearch.current = true;
            // Pre-fill all form fields first
            setUsername(urlUser);
            setLocation(urlLocation);
            setLanguage(urlLang);
            setMinRepos(urlMinRepos);
            // Fire the search with the params directly (state hasn't settled yet)
            handleSearch(null, 1, urlUser, urlLocation, urlLang, urlMinRepos);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            const newHistory = [term, ...prev];
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

    const handleHistoryClick = (term) => {
        setUsername(term);
        handleSearch(null, 1, term);
    };

    const handlePresetClick = (preset) => {
        setUsername('');
        setLocation(preset.location);
        setLanguage(preset.language);
        setMinRepos(preset.minRepos);
        setSortType(preset.sort);
        handleSearch(null, 1, '', preset.location, preset.language, preset.minRepos, preset.sort);
    };

    const handleQuickView = async (user) => {
        setSelectedUser(user);
        setUserRepos([]);

        try {
            const repos = await fetchUserRepos(user.login);
            setUserRepos(repos)
        } catch (err) {
            console.error(err);
        }
    };

    const closeModal = () => {
        setSelectedUser(null);
    };

    const handleSearch = async (e, newPage = 1, specificTerm = null, specificLocation = null, specificLang = null, specificMinRepos = null, specificSort = null) => {
        if (e) e.preventDefault();

        // Use override params (from URL auto-search or presets) or fall back to current state
        const query = specificTerm ?? username;
        const loc = specificLocation ?? location;
        const lang = specificLang ?? language;
        const repos = specificMinRepos ?? minRepos;
        const sort = specificSort ?? sortType;

        // dont search if all fields are empty
        if (!query && !loc && !lang && !repos) return;

        setLoading(true);
        setError(false);
        setHasSearched(true);

        if (newPage === 1 && query) {
            addToHistory(query);
        }

        try {
            // perform the search
            const { data, rateLimit } = await searchUsers(query, loc, repos, lang, sort, newPage);

            // report rate limit up to App so the navbar badge can update
            if (onRateLimitUpdate) onRateLimitUpdate(rateLimit);

            // fetch details for each user
            const detailedUsers = await Promise.all(
                data.items.map(async (user) => {
                    return await fetchUserData(user.login);
                })
            );

            if (newPage === 1) {
                setUsers(detailedUsers);

                // Sync the URL so this search is shareable.
                // Only update on page 1 — pagination state doesn't need to be in the URL.
                const qs = buildQueryString(query, loc, lang, repos);
                window.history.replaceState(null, '', qs || window.location.pathname);
            } else {
                setUsers(prev => {
                    const existingIds = new Set(prev.map(u => u.id));
                    const uniqueNewUsers = detailedUsers.filter(u => !existingIds.has(u.id));
                    return [...prev, ...uniqueNewUsers];
                });
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
                    onCompare={() => {
                        toggleCompare(selectedUser);
                        closeModal();
                    }}
                />
            )}

            {/* render developer compare modal */}
            {compareOpen && compareQueue.length === 2 && (
                <CompareModal
                    initialUser1={compareQueue[0]}
                    initialUser2={compareQueue[1]}
                    onClose={() => setCompareOpen(false)}
                />
            )}

            {/* ----------------------------------------------------------------
                Saved / Favorites tray — collapsible, above the search form
            ----------------------------------------------------------------- */}
            {favorites.length > 0 && (
                <div className="mb-4 max-w-sm mx-auto w-full">
                    {/* tray toggle header */}
                    <button
                        onClick={() => setFavTrayOpen(o => !o)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-semibold text-gray-700 dark:text-slate-200 hover:border-green-500 dark:hover:border-green-500 transition-all duration-200"
                    >
                        <span className="flex items-center gap-2">
                            <span>⭐</span>
                            Saved Profiles
                            <span className="ml-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                                {favorites.length}
                            </span>
                        </span>
                        <span className={`transition-transform duration-200 ${favTrayOpen ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {/* tray body */}
                    {favTrayOpen && (
                        <div className="mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm p-3 flex flex-col gap-2 animate-fade-in">
                            {favorites.map(fav => (
                                <div
                                    key={fav.id}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                                >
                                    <img
                                        src={fav.avatar_url}
                                        alt={fav.login}
                                        className="w-9 h-9 rounded-full border border-gray-200 dark:border-slate-600 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{fav.name || fav.login}</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">@{fav.login}</p>
                                    </div>
                                    <button
                                        onClick={() => handleQuickView(fav)}
                                        className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 px-2.5 py-1 rounded border border-green-200 dark:border-green-900 font-medium transition-colors shrink-0"
                                    >
                                        Open
                                    </button>
                                    <button
                                        onClick={() => toggleCompare(fav)}
                                        className={`text-xs px-2 py-1 rounded border font-medium transition-colors shrink-0 ${
                                            isComparing(fav)
                                                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                                                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-amber-400"
                                        }`}
                                        title={isComparing(fav) ? "Remove from comparison" : "Compare this developer"}
                                    >
                                        ⚔️
                                    </button>
                                    <button
                                        onClick={() => toggleFavorite(fav)}
                                        className="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0"
                                        title="Remove bookmark"
                                        aria-label={`Remove ${fav.login} from favorites`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                    <span>Export:</span>
                                    <button
                                        onClick={() => exportToCSV(favorites, 'github-saved-profiles')}
                                        className="font-medium text-green-600 dark:text-green-400 hover:underline"
                                        title="Export bookmarks as CSV"
                                    >
                                        CSV
                                    </button>
                                    <span>•</span>
                                    <button
                                        onClick={() => exportToJSON(favorites, 'github-saved-profiles')}
                                        className="font-medium text-green-600 dark:text-green-400 hover:underline"
                                        title="Export bookmarks as JSON"
                                    >
                                        JSON
                                    </button>
                                </div>
                                <button
                                    onClick={clearFavorites}
                                    className="text-xs text-red-400 hover:text-red-600 underline"
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ---------------------------------------------------------------
                Search form
            --------------------------------------------------------------- */}
            <form
                onSubmit={(e) => handleSearch(e, 1)}
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg mb-6 flex flex-col gap-3.5 max-w-sm mx-auto w-full transition-colors duration-200"
            >
                {/* username input */}
                <div className="relative flex items-center">
                    <input
                        ref={usernameInputRef}
                        id="search-username"
                        type="text"
                        placeholder="Username (e.g. krayetor)"
                        className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white pl-4 pr-11 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <kbd
                        title="Press / or ⌘K to search"
                        className="absolute right-3 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono text-gray-400 dark:text-slate-500 bg-gray-200/60 dark:bg-slate-800 rounded border border-gray-300 dark:border-slate-700 select-none pointer-events-none"
                    >
                        /
                    </kbd>
                </div>

                {/* location input */}
                <input
                    id="search-location"
                    type="text"
                    placeholder="Location (e.g. Accra, Lagos...)"
                    className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />

                {/* language input */}
                <input
                    id="search-language"
                    type="text"
                    placeholder="Languages (e.g. Python, Rust)"
                    className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                />

                {/* min repos & sort */}
                <div className="grid grid-cols-2 gap-3">
                    <input
                        id="search-min-repos"
                        type="number"
                        placeholder="Min Repos"
                        min="0"
                        className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        value={minRepos}
                        onChange={(e) => setMinRepos(e.target.value)}
                    />

                    <select
                        id="search-sort"
                        value={sortType}
                        onChange={(e) => setSortType(e.target.value)}
                        className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white px-3 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer transition-all w-full"
                    >
                        <option value="best-match">Best Match</option>
                        <option value="followers">Followers</option>
                        <option value="repositories">Repositories</option>
                        <option value="joined">Newest Joined</option>
                    </select>
                </div>

                {/* search button */}
                <button
                    id="search-submit"
                    type="submit"
                    className="mt-1 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Search
                </button>
            </form>

            {/* ---------------------------------------------------------------
                Explore Presets — quick-discovery tags
            --------------------------------------------------------------- */}
            <div className="mb-6 max-w-sm mx-auto w-full">
                <div className="flex items-center gap-1.5 mb-2 px-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1">
                        <span>💡</span> Explore Presets
                    </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {EXPLORE_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => handlePresetClick(preset)}
                            className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 hover:text-green-700 dark:hover:text-green-400 rounded-full border border-gray-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500 shadow-sm transition-all duration-200 font-medium active:scale-95 flex items-center gap-1.5"
                        >
                            <span>{preset.icon}</span>
                            <span>{preset.label}</span>
                        </button>
                    ))}
                </div>
            </div>

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
                <div className="text-center text-red-600 dark:text-red-400 mb-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl">
                    Something went wrong. Please try again.
                </div>
            )}

            {/* user not found state */}
            {!loading && !error && hasSearched && users.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed dark:border-slate-700 animate-fade-in transition-colors duration-200">
                    <div className="text-4xl mb-2">🔍</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        No users found
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        We couldn't find anyone matching "{username}"
                    </p>
                </div>
            )}

            {/* results header & export toolbar */}
            {users.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 px-1">
                    <div className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        Showing {users.length} {users.length === 1 ? 'developer' : 'developers'}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Export:</span>
                        <button
                            onClick={() => exportToCSV(users, `github-search-${username || 'devs'}`)}
                            className="text-xs font-semibold py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 hover:text-green-700 dark:hover:text-green-400 border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-200 flex items-center gap-1.5"
                            title="Export search results as CSV spreadsheet"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            CSV
                        </button>
                        <button
                            onClick={() => exportToJSON(users, `github-search-${username || 'devs'}`)}
                            className="text-xs font-semibold py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 hover:text-green-700 dark:hover:text-green-400 border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-200 flex items-center gap-1.5"
                            title="Export search results as JSON data"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            JSON
                        </button>
                    </div>
                </div>
            )}

            {/* results grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {users.map((user) => (
                    <div
                        key={user.id}
                        className="relative bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-md hover:border-green-500 dark:hover:border-green-500 transition-colors duration-200 group flex items-start gap-4"
                    >
                        {/* star / bookmark button — top-right corner */}
                        <button
                            onClick={() => toggleFavorite(user)}
                            title={isFavorite(user) ? 'Remove bookmark' : 'Save profile'}
                            aria-label={isFavorite(user) ? `Remove ${user.login} from favorites` : `Save ${user.login}`}
                            className="absolute top-3 right-3 text-lg leading-none transition-transform duration-150 hover:scale-125 focus:outline-none"
                        >
                            {isFavorite(user) ? '⭐' : '☆'}
                        </button>

                        <img
                            src={user.avatar_url}
                            alt={user.login}
                            className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-slate-600 shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                            onClick={() => handleQuickView(user)}
                        />

                        <div className="flex-1 overflow-hidden">

                            {/* username: open modal */}
                            <button
                                onClick={() => handleQuickView(user)}
                                className="text-left hover:underline decoration-green underline-offset-4"
                            >
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">{user.name || user.login}</h3>
                            </button>

                            <div className="text-green-600 dark:text-green-400 text-sm mb-2 font-medium">@{user.login}</div>

                            {/* advanced details */}
                            <div className="text-gray-500 dark:text-slate-400 text-sm flex flex-col gap-1 mb-4 mt-2">
                                <p>📍 {user.location || 'N/A'}</p>
                                <p>📚 {user.public_repos} Repositories</p>
                            </div>

                            {/* action buttons (quick view, compare, external) */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleQuickView(user)}
                                    className="text-sm bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 py-1.5 px-3.5 rounded-xl transition-colors duration-200 font-medium border border-green-200 dark:border-green-900"
                                >
                                    Quick View
                                </button>

                                <button
                                    onClick={() => toggleCompare(user)}
                                    className={`text-sm py-1.5 px-3.5 rounded-xl transition-colors duration-200 font-medium border flex items-center gap-1.5 ${
                                        isComparing(user)
                                            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                                            : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white border-gray-200 dark:border-transparent"
                                    }`}
                                    title={isComparing(user) ? "Remove from comparison" : "Compare this developer"}
                                >
                                    <span>⚔️</span>
                                    <span>{isComparing(user) ? "In Battle" : "Compare"}</span>
                                </button>

                                <a
                                    href={user.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white py-1.5 px-3.5 rounded-xl transition-colors duration-200 inline-block font-medium border border-gray-200 dark:border-transparent"
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
                        className="bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-800 dark:text-white font-semibold py-2.5 px-6 rounded-xl border border-gray-300 dark:border-slate-600 transition-colors duration-200 shadow-sm"
                    >
                        Load More Users
                    </button>
                </div>
            )}

            {/* ----------------------------------------------------------------
                Floating Compare Dock (visible when 1 or 2 users are selected)
            ----------------------------------------------------------------- */}
            {compareQueue.length > 0 && (
                <aside aria-label="Developer comparison queue" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-3 animate-fade-in max-w-[95vw]">
                    <div className="flex items-center -space-x-2">
                        {compareQueue.map(u => (
                            <img
                                key={u.login}
                                src={u.avatar_url}
                                alt={u.login}
                                className="w-8 h-8 rounded-full border-2 border-slate-900 dark:border-slate-800 shadow"
                                title={`@${u.login}`}
                            />
                        ))}
                        {compareQueue.length === 1 && (
                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-500 bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                                ?
                            </div>
                        )}
                    </div>

                    <div className="text-xs">
                        {compareQueue.length === 1 ? (
                            <span className="text-slate-300">
                                <strong className="text-white">@{compareQueue[0].login}</strong> added · select 1 more dev to compare
                            </span>
                        ) : (
                            <span className="text-slate-300">
                                <strong className="text-white">@{compareQueue[0].login}</strong> vs <strong className="text-white">@{compareQueue[1].login}</strong>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 ml-1">
                        {compareQueue.length === 2 && (
                            <button
                                onClick={() => setCompareOpen(true)}
                                className="text-xs bg-green-500 hover:bg-green-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-full transition-colors shadow"
                            >
                                Battle Now ⚔️
                            </button>
                        )}
                        <button
                            onClick={clearCompare}
                            className="text-xs text-slate-400 hover:text-white px-1.5 py-1 transition-colors"
                            title="Clear compare queue"
                        >
                            ✕
                        </button>
                    </div>
                </aside>
            )}
        </div>
    );
}

export default Search;