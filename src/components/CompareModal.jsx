import React, { useState, useEffect, useMemo } from "react";
import { fetchUserData, fetchUserRepos } from "../services/githubService";

/**
 * Calculates top languages from an array of repos.
 */
function getTopLanguages(repos) {
    if (!repos || !repos.length) return [];
    const counts = {};
    repos.forEach(repo => {
        if (repo.language) {
            counts[repo.language] = (counts[repo.language] || 0) + 1;
        }
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([lang, count]) => ({ lang, count }));
}

/**
 * Formats ISO date into readable string and calculates account years.
 */
function formatJoinDate(isoDate) {
    if (!isoDate) return { formatted: "Unknown", years: 0 };
    const date = new Date(isoDate);
    const formatted = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const years = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
    return { formatted, years };
}

const CompareModal = ({ initialUser1, initialUser2, onClose }) => {
    const [user1, setUser1] = useState(initialUser1);
    const [user2, setUser2] = useState(initialUser2);

    const [repos1, setRepos1] = useState([]);
    const [repos2, setRepos2] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(true);

    const [swapInput1, setSwapInput1] = useState("");
    const [swapInput2, setSwapInput2] = useState("");
    const [swapLoading1, setSwapLoading1] = useState(false);
    const [swapLoading2, setSwapLoading2] = useState(false);
    const [swapError1, setSwapError1] = useState("");
    const [swapError2, setSwapError2] = useState("");

    // Lock background scroll while modal is open & handle Esc
    useEffect(() => {
        document.body.style.overflow = "hidden";
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = "unset";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    // Fetch repos for both users to analyze languages
    useEffect(() => {
        let isMounted = true;
        const fetchBothRepos = async () => {
            setLoadingRepos(true);
            try {
                const [r1, r2] = await Promise.all([
                    user1?.login ? fetchUserRepos(user1.login, 20) : Promise.resolve([]),
                    user2?.login ? fetchUserRepos(user2.login, 20) : Promise.resolve([]),
                ]);
                if (isMounted) {
                    setRepos1(r1);
                    setRepos2(r2);
                }
            } catch (err) {
                console.error("Error fetching repos for comparison:", err);
            } finally {
                if (isMounted) setLoadingRepos(false);
            }
        };
        fetchBothRepos();
        return () => { isMounted = false; };
    }, [user1?.login, user2?.login]);

    const langs1 = useMemo(() => getTopLanguages(repos1), [repos1]);
    const langs2 = useMemo(() => getTopLanguages(repos2), [repos2]);

    const join1 = useMemo(() => formatJoinDate(user1?.created_at), [user1?.created_at]);
    const join2 = useMemo(() => formatJoinDate(user2?.created_at), [user2?.created_at]);

    // Score comparison for crown
    const score1 = useMemo(() => {
        if (!user1 || !user2) return 0;
        let s = 0;
        if ((user1.followers || 0) > (user2.followers || 0)) s++;
        if ((user1.public_repos || 0) > (user2.public_repos || 0)) s++;
        if ((user1.public_gists || 0) > (user2.public_gists || 0)) s++;
        if (join1.years > join2.years) s++;
        return s;
    }, [user1, user2, join1.years, join2.years]);

    const score2 = useMemo(() => {
        if (!user1 || !user2) return 0;
        let s = 0;
        if ((user2.followers || 0) > (user1.followers || 0)) s++;
        if ((user2.public_repos || 0) > (user1.public_repos || 0)) s++;
        if ((user2.public_gists || 0) > (user1.public_gists || 0)) s++;
        if (join2.years > join1.years) s++;
        return s;
    }, [user1, user2, join1.years, join2.years]);

    // Swap user helper
    const handleSwap = async (slot, username) => {
        const clean = username.trim();
        if (!clean) return;
        if (slot === 1) {
            setSwapLoading1(true);
            setSwapError1("");
            try {
                const data = await fetchUserData(clean);
                setUser1(data);
                setSwapInput1("");
            } catch (e) {
                console.error(e);
                setSwapError1("User not found");
            } finally {
                setSwapLoading1(false);
            }
        } else {
            setSwapLoading2(true);
            setSwapError2("");
            try {
                const data = await fetchUserData(clean);
                setUser2(data);
                setSwapInput2("");
            } catch (e) {
                console.error(e);
                setSwapError2("User not found");
            } finally {
                setSwapLoading2(false);
            }
        }
    };

    // Calculate ratio percentage for followers and repos
    const calcRatio = (val1, val2) => {
        const v1 = Number(val1) || 0;
        const v2 = Number(val2) || 0;
        const total = v1 + v2;
        if (total === 0) return { pct1: 50, pct2: 50 };
        const pct1 = Math.round((v1 / total) * 100);
        return { pct1, pct2: 100 - pct1 };
    };

    const followerRatio = calcRatio(user1?.followers, user2?.followers);
    const repoRatio = calcRatio(user1?.public_repos, user2?.public_repos);

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-start md:items-center p-3 sm:p-6 animate-fade-in overflow-y-auto future-scrollbar"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto no-scrollbar border border-gray-200 dark:border-slate-700 relative flex flex-col my-auto transition-colors duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-slate-700/80 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur z-20">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚔️</span>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Developer Showdown
                                <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-semibold px-2 py-0.5 rounded-full">
                                    Head-to-Head
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Side-by-side comparison of GitHub statistics & expertise
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close comparison"
                    >
                        ✕
                    </button>
                </div>

                {/* Body: Two columns */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* VS Badge in the center for desktop */}
                    <div className="hidden md:flex absolute left-1/2 top-28 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 items-center justify-center font-black text-xs shadow-lg border-2 border-white dark:border-slate-800">
                        VS
                    </div>

                    {/* Left Column: User 1 */}
                    <div className="flex flex-col gap-4 bg-gray-50/70 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-700/60 relative">
                        {score1 > score2 && (
                            <div className="absolute -top-3 right-4 bg-amber-400 text-slate-950 text-xs font-bold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
                                👑 Match Leader
                            </div>
                        )}

                        {/* User 1 Header */}
                        <div className="flex items-center gap-3.5">
                            <img
                                src={user1?.avatar_url}
                                alt={user1?.login}
                                className="w-16 h-16 rounded-full border-2 border-green-500 shrink-0 shadow-md"
                            />
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                    {user1?.name || user1?.login}
                                </h3>
                                <a
                                    href={user1?.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-600 dark:text-green-400 font-mono hover:underline truncate block"
                                >
                                    @{user1?.login} ↗
                                </a>
                                {user1?.location && (
                                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                        📍 {user1.location}
                                    </p>
                                )}
                            </div>
                        </div>

                        {user1?.bio && (
                            <p className="text-xs text-gray-600 dark:text-slate-300 italic line-clamp-2">
                                "{user1.bio}"
                            </p>
                        )}

                        {/* Quick Swap Input */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSwap(1, swapInput1);
                            }}
                            className="flex gap-1.5"
                        >
                            <input
                                type="text"
                                placeholder="Change dev 1..."
                                value={swapInput1}
                                onChange={(e) => setSwapInput1(e.target.value)}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <button
                                type="submit"
                                disabled={swapLoading1 || !swapInput1.trim()}
                                className="text-xs px-3 py-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-green-600 hover:text-white text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {swapLoading1 ? "..." : "Swap"}
                            </button>
                        </form>
                        {swapError1 && <p className="text-[11px] text-red-500 -mt-2">{swapError1}</p>}

                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className={`p-3 rounded-xl border transition-colors ${
                                (user1?.followers || 0) >= (user2?.followers || 0)
                                    ? "bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-900 dark:text-green-300"
                                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                            }`}>
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">Followers</span>
                                <span className="text-lg font-black">{user1?.followers?.toLocaleString() || 0}</span>
                            </div>

                            <div className={`p-3 rounded-xl border transition-colors ${
                                (user1?.public_repos || 0) >= (user2?.public_repos || 0)
                                    ? "bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-900 dark:text-green-300"
                                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                            }`}>
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">Repositories</span>
                                <span className="text-lg font-black">{user1?.public_repos?.toLocaleString() || 0}</span>
                            </div>

                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200">
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">Joined</span>
                                <span className="text-sm font-bold">{join1.formatted}</span>
                                <span className="text-[10px] opacity-60 block">({join1.years} yrs ago)</span>
                            </div>

                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200">
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">Public Gists</span>
                                <span className="text-sm font-bold">{user1?.public_gists || 0}</span>
                                <span className="text-[10px] opacity-60 block">gists created</span>
                            </div>
                        </div>

                        {/* Top Languages */}
                        <div className="mt-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1.5">
                                Top Languages
                            </span>
                            {loadingRepos ? (
                                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                            ) : langs1.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {langs1.map(({ lang }) => (
                                        <span
                                            key={lang}
                                            className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 px-2.5 py-1 rounded-lg font-medium"
                                        >
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400 italic">No repo language data</span>
                            )}
                        </div>
                    </div>

                    {/* Right Column: User 2 */}
                    <div className="flex flex-col gap-4 bg-gray-50/70 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-700/60 relative">
                        {score2 > score1 && (
                            <div className="absolute -top-3 right-4 bg-amber-400 text-slate-950 text-xs font-bold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
                                👑 Match Leader
                            </div>
                        )}

                        {/* User 2 Header */}
                        <div className="flex items-center gap-3.5">
                            <img
                                src={user2?.avatar_url}
                                alt={user2?.login}
                                className="w-16 h-16 rounded-full border-2 border-emerald-500 shrink-0 shadow-md"
                            />
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                    {user2?.name || user2?.login}
                                </h3>
                                <a
                                    href={user2?.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-600 dark:text-green-400 font-mono hover:underline truncate block"
                                >
                                    @{user2?.login} ↗
                                </a>
                                {user2?.location && (
                                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                        📍 {user2.location}
                                    </p>
                                )}
                            </div>
                        </div>

                        {user2?.bio && (
                            <p className="text-xs text-gray-600 dark:text-slate-300 italic line-clamp-2">
                                "{user2.bio}"
                            </p>
                        )}

                        {/* Quick Swap Input */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSwap(2, swapInput2);
                            }}
                            className="flex gap-1.5"
                        >
                            <input
                                type="text"
                                placeholder="Change dev 2..."
                                value={swapInput2}
                                onChange={(e) => setSwapInput2(e.target.value)}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <button
                                type="submit"
                                disabled={swapLoading2 || !swapInput2.trim()}
                                className="text-xs px-3 py-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-green-600 hover:text-white text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {swapLoading2 ? "..." : "Swap"}
                            </button>
                        </form>
                        {swapError2 && <p className="text-[11px] text-red-500 -mt-2">{swapError2}</p>}

                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className={`p-3 rounded-xl border transition-colors ${
                                (user2?.followers || 0) >= (user1?.followers || 0)
                                    ? "bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-900 dark:text-green-300"
                                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                            }`}>
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">Followers</span>
                                <span className="text-lg font-black">{user2?.followers?.toLocaleString() || 0}</span>
                            </div>

                            <div className={`p-3 rounded-xl border transition-colors ${
                                (user2?.public_repos || 0) >= (user1?.public_repos || 0)
                                    ? "bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-900 dark:text-green-300"
                                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                            }`}>
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">Repositories</span>
                                <span className="text-lg font-black">{user2?.public_repos?.toLocaleString() || 0}</span>
                            </div>

                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200">
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">Joined</span>
                                <span className="text-sm font-bold">{join2.formatted}</span>
                                <span className="text-[10px] opacity-60 block">({join2.years} yrs ago)</span>
                            </div>

                            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200">
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 block">Public Gists</span>
                                <span className="text-sm font-bold">{user2?.public_gists || 0}</span>
                                <span className="text-[10px] opacity-60 block">gists created</span>
                            </div>
                        </div>

                        {/* Top Languages */}
                        <div className="mt-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1.5">
                                Top Languages
                            </span>
                            {loadingRepos ? (
                                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                            ) : langs2.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {langs2.map(({ lang }) => (
                                        <span
                                            key={lang}
                                            className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 px-2.5 py-1 rounded-lg font-medium"
                                        >
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400 italic">No repo language data</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Comparative Ratio Bar Section */}
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-gray-100 dark:border-slate-700/60 flex flex-col gap-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                        Direct Comparison Ratios
                    </h4>

                    {/* Followers Ratio Bar */}
                    <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-green-600 dark:text-green-400 truncate max-w-[45%]">
                                @{user1?.login} ({user1?.followers || 0})
                            </span>
                            <span className="text-gray-400">Followers Ratio</span>
                            <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[45%]">
                                ({user2?.followers || 0}) @{user2?.login}
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                            <div
                                className="bg-green-500 h-full transition-all duration-500"
                                style={{ width: `${followerRatio.pct1}%` }}
                                title={`@${user1?.login}: ${followerRatio.pct1}%`}
                            />
                            <div
                                className="bg-emerald-400 h-full transition-all duration-500"
                                style={{ width: `${followerRatio.pct2}%` }}
                                title={`@${user2?.login}: ${followerRatio.pct2}%`}
                            />
                        </div>
                    </div>

                    {/* Repositories Ratio Bar */}
                    <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-green-600 dark:text-green-400 truncate max-w-[45%]">
                                @{user1?.login} ({user1?.public_repos || 0})
                            </span>
                            <span className="text-gray-400">Repositories Ratio</span>
                            <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[45%]">
                                ({user2?.public_repos || 0}) @{user2?.login}
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                            <div
                                className="bg-green-500 h-full transition-all duration-500"
                                style={{ width: `${repoRatio.pct1}%` }}
                                title={`@${user1?.login}: ${repoRatio.pct1}%`}
                            />
                            <div
                                className="bg-emerald-400 h-full transition-all duration-500"
                                style={{ width: `${repoRatio.pct2}%` }}
                                title={`@${user2?.login}: ${repoRatio.pct2}%`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompareModal;
