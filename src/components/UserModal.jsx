import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { fetchUserEvents } from "../services/githubService";

/**
 * Formats ISO timestamp to friendly relative time.
 */
function formatRelativeTime(isoDate) {
    if (!isoDate) return "";
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return "just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Extracts friendly readable details from GitHub event objects.
 */
function getEventDetails(event) {
    const type = event.type;
    const repoName = event.repo?.name || "a repository";
    const repoUrl = `https://github.com/${repoName}`;

    switch (type) {
        case "PushEvent": {
            const commitCount = event.payload?.commits?.length || 1;
            const message = event.payload?.commits?.[0]?.message;
            return {
                icon: "📝",
                badge: "Push",
                badgeColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
                title: `Pushed ${commitCount} commit${commitCount > 1 ? 's' : ''} to`,
                repoName,
                repoUrl,
                detail: message ? `"${message.split('\n')[0]}"` : null
            };
        }
        case "WatchEvent":
            return {
                icon: "⭐",
                badge: "Star",
                badgeColor: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
                title: "Starred repository",
                repoName,
                repoUrl,
            };
        case "PullRequestEvent": {
            const action = event.payload?.action || "updated";
            const prTitle = event.payload?.pull_request?.title;
            const prUrl = event.payload?.pull_request?.html_url || repoUrl;
            return {
                icon: "🔀",
                badge: "PR",
                badgeColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900",
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} pull request in`,
                repoName,
                repoUrl: prUrl,
                detail: prTitle ? `"${prTitle}"` : null
            };
        }
        case "IssuesEvent": {
            const action = event.payload?.action || "updated";
            const issueTitle = event.payload?.issue?.title;
            const issueUrl = event.payload?.issue?.html_url || repoUrl;
            return {
                icon: "🐞",
                badge: "Issue",
                badgeColor: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900",
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} issue in`,
                repoName,
                repoUrl: issueUrl,
                detail: issueTitle ? `"${issueTitle}"` : null
            };
        }
        case "CreateEvent": {
            const refType = event.payload?.ref_type || "repository";
            return {
                icon: "🚀",
                badge: "Create",
                badgeColor: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
                title: `Created ${refType} in`,
                repoName,
                repoUrl,
            };
        }
        case "ForkEvent":
            return {
                icon: "🍴",
                badge: "Fork",
                badgeColor: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900",
                title: "Forked repository",
                repoName,
                repoUrl,
            };
        default:
            return {
                icon: "⚡",
                badge: "Activity",
                badgeColor: "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600",
                title: `Activity in`,
                repoName,
                repoUrl,
            };
    }
}

const UserModal = ({ user, repos, onClose, onCompare }) => {

    // tab state: 'repos' | 'activity'
    const [activeTab, setActiveTab] = useState('repos');
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    // fetch public events for activity feed
    useEffect(() => {
        if (!user?.login) return;
        let isMounted = true;
        fetchUserEvents(user.login, 15)
            .then(data => {
                if (isMounted) setEvents(Array.isArray(data) ? data : []);
            })
            .catch(err => console.error("Error fetching user events:", err))
            .finally(() => {
                if (isMounted) setLoadingEvents(false);
            });
        return () => { isMounted = false; };
    }, [user?.login]);

    // lock scroll when open and handle Escape key — must be called unconditionally (Rules of Hooks)
    useEffect(() => {
        if (!user) return;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [user, onClose]);

    // logic to calculate top languages — must be called unconditionally (Rules of Hooks)
    const languageData = useMemo(() => {
        if (!repos || !repos.length) return [];

        const stats = {};

        repos.forEach(repo => {
            if (repo.language) {
                stats[repo.language] = (stats[repo.language] || 0) + 1;
            }
        });

        // convert to array and sort by popularity
        const data = Object.keys(stats).map(lang => ({
            name: lang,
            value: stats[lang]
        })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5 only

        return data;
    }, [repos]);

    // colors for the chart (green / blue / teal theme)
    const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#a855f7'];

    if (!user) return null;


    return (
        // backdrop (dark transparent background)
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-start md:items-center p-4 animate-fade-in overflow-y-auto future-scrollbar"
            onClick={onClose}
        >

            {/* modal card (clicking inside it from closing) */}
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar border border-gray-200 dark:border-slate-700 relative"
                onClick={(e) => e.stopPropagation()}
            >

                {/* header / cover area with blurred avatar banner */}
                <div className="relative h-36 overflow-hidden rounded-t-2xl flex items-start justify-between p-6 bg-slate-900">
                    {/* Soft blurred user avatar background */}
                    {user.avatar_url && (
                        <div
                            className="absolute inset-0 bg-cover bg-center scale-105 filter blur-sm opacity-80 dark:opacity-75 transition-opacity duration-300"
                            style={{ backgroundImage: `url(${user.avatar_url})` }}
                            aria-hidden="true"
                        />
                    )}

                    {/* Subtle dark gradient overlay for text readability without washing out the photo */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60" aria-hidden="true" />

                    {/* header title */}
                    <span className="relative z-10 text-white font-semibold uppercase tracking-wider text-xs sm:text-sm drop-shadow-md flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        GitHub Profile View
                    </span>

                    <button
                        onClick={onClose}
                        className="relative z-10 text-white bg-black/40 border border-white/20 hover:bg-black/60 hover:border-white rounded-full w-9 h-9 flex items-center justify-center transition-all backdrop-blur-md shadow-sm"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-8 pb-8">

                    {/* avatar (overlaping the header) */}
                    <div className="relative -mt-16 mb-6 flex justify-between items-end flex-wrap gap-3">
                        <img
                            src={user.avatar_url}
                            alt={user.login}
                            className="w-32 h-32 rounded-full border-[6px] border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-md"
                        />
                        <div className="flex items-center gap-2 mb-2">
                            {onCompare && (
                                <button
                                    onClick={onCompare}
                                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl transition-colors text-sm flex items-center gap-1.5 shadow-sm"
                                    title="Add to Developer Compare"
                                >
                                    ⚔️ Compare
                                </button>
                            )}
                            <a
                                href={user.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity text-sm"
                            >
                                Go to GitHub ↗
                            </a>
                        </div>
                    </div>

                    {/* user info */}
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name || user.login}</h2>
                    <p className="text-green-600 dark:text-green-400 font-mono mb-4">@{user.login}</p>

                    {user.bio && (
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm my-10 max-w-lg mx-auto flex flex-col justify-center items-center">
                            <p className="text-gray-700 dark:text-slate-300 text-base leading-relaxed italic text-center">
                                "{user.bio}"
                            </p>
                        </div>
                    )}

                    {/* stats grid */}
                    <div className="grid grid-cols-3 gap-4 mb-10 text-center">
                        <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-2xl">
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{user.followers}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1">Followers</div>
                        </div>
                        <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-2xl">
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{user.following}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1">Following</div>
                        </div>
                        <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-2xl">
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{user.public_repos}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1">Repos</div>
                        </div>
                    </div>

                    {/* top languages chart */}
                    {languageData.length > 0 && (
                        <div className="mb-10">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-slate-700">
                                <span className="text-2xl">📊</span> Top Languages
                            </h3>
                            <div className="relative h-64 w-full bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-2">
                                <div className="absolute inset-0 pb-2">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <PieChart>
                                            <Pie
                                                data={languageData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {languageData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                                    color: '#0f172a'
                                                }}
                                                itemStyle={{ color: '#000000' }}
                                                cursor={{ fill: 'transparent' }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle" // make the icons round dots instead of squares
                                                // this style object forces the text to be readable in dark mode
                                                wrapperStyle={{
                                                    paddingTop: '20px',
                                                    fontSize: '12px',
                                                    fontFamily: 'sans-serif'
                                                }}
                                                formatter={(value) => <span className="text-slate-600 dark:text-slate-300 font-medium ml-1">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GitHub contribution Heatmap */}
                    <div className="mt-8 mb-8 pt-6 border-t border-gray-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex itemx-center gap-2">
                            <span className="text-2xl">🔥</span>Contribution Map
                        </h3>

                        {/* wrapping the image in a scrollable container incase it's too wide for mobile.
                            also give it a white bg/padding in dark mode so the chart is visible
                        */}
                        <div className="overflow-x-auto pb-2 future-scrollbar">
                            <div className="min-w-[600px] p-4 rounded border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors duration-300">

                                <img
                                    src={`https://ghchart.rshah.org/4ade80/${user.login}`}
                                    alt="GitHub Contribution Graph"
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-900 dark:text-white text-center mt-2">
                                Heatmap generated via ghchart.rshah.org
                            </p>
                        </div>
                    </div>

                    {/* Tab Navigation: Repositories vs Recent Timeline */}
                    <div className="mt-8 border-b border-gray-200 dark:border-slate-700 mb-4 pb-2 flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('repos')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                activeTab === 'repos'
                                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            <span>📦</span>
                            <span>Repositories</span>
                            <span className="text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700 font-bold">
                                {repos.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                activeTab === 'activity'
                                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            <span>⚡</span>
                            <span>Recent Timeline</span>
                            {events.length > 0 && (
                                <span className="text-xs bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700 font-bold">
                                    {events.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab 1: Repositories Content */}
                    {activeTab === 'repos' && (
                        <div className="flex flex-col gap-3 animate-fade-in">
                            {repos.length > 0 ? (
                                repos.map(repo => (
                                    <a
                                        key={repo.id}
                                        href={repo.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-200 group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400">
                                                {repo.name}
                                            </span>
                                            {repo.language && (
                                                <span className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full shrink-0 ml-2 font-medium">
                                                    {repo.language}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">
                                            {repo.description || "No description provided."}
                                        </p>
                                    </a>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                                    No public repositories found recently.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Activity Timeline Content */}
                    {activeTab === 'activity' && (
                        <div className="flex flex-col gap-2.5 animate-fade-in">
                            {loadingEvents ? (
                                <div className="space-y-3 py-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800/80 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : events.length > 0 ? (
                                events.map(event => {
                                    const details = getEventDetails(event);
                                    return (
                                        <div
                                            key={event.id}
                                            className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex items-start gap-3 transition-colors duration-200 hover:border-gray-300 dark:hover:border-slate-600"
                                        >
                                            <span className="text-lg shrink-0 mt-0.5" title={details.badge}>
                                                {details.icon}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="text-xs text-gray-700 dark:text-slate-300">
                                                        <span className="font-semibold text-gray-900 dark:text-white mr-1.5">
                                                            {details.title}
                                                        </span>
                                                        <a
                                                            href={details.repoUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-green-600 dark:text-green-400 hover:underline font-medium break-all"
                                                        >
                                                            {details.repoName} ↗
                                                        </a>
                                                    </div>
                                                    <span className="text-[11px] text-gray-400 dark:text-slate-500 whitespace-nowrap">
                                                        {formatRelativeTime(event.created_at)}
                                                    </span>
                                                </div>
                                                {details.detail && (
                                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic line-clamp-1">
                                                        {details.detail}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                                    No recent public activity recorded.
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default UserModal;