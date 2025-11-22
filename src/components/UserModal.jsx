import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend} from "recharts";

const UserModal = ({ user, repos, onClose}) => {
    if (!user) return null;

    // lock scroll when open
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // logic to calculate top languages
    const languageData = useMemo(() => {
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

    return (
        // backdrop (dark transparent background)
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-start md:items-center p-4 animate-fade-in overflow-y-auto"
            onClick={onClose}
        >

            {/* modal card (clicking inside it from closing) */}
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar border border-gray-200 dark:border-slate-700 relative" 
                onClick={(e) => e.stopPropagation()}
            >

                {/* header / cover area */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 h-32 relative flex items-start justify-between p-6">
                    
                    {/* header title */}
                    <span className="text-white/90 font-semibold uppercase tracking-wider text-sm drop-shadow-sm">
                        GitHub Profile View
                    </span>

                    <button
                        onClick={onClose}
                        className="text-white bg-white/10 border-2 border-white/40 hover:bg-white/30 hover:border-white rounded-full w-10 h-10 flex items-center justify-center transition-all backdrop-blur-md shadow-sm"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-8 pb-8">

                    {/* avatar (overlaping the header) */}
                    <div className="relative -mt-16 mb-6 flex justify-between items-end">
                        <img
                            src={user.avatar_url}
                            alt={user.login}
                            className="w-32 h-32 rounded-full border-[6px] border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-md"
                        />
                        <a
                            href={user.html_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity text-sm mb-2"  
                        >
                            Go to GitHub ↗
                        </a>
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
                                            <legend height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* latest repo section */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="text-green-500"></span> Latest Activity
                    </h3>
                    <div className="flex flex-col gap-3">
                        {repos.length > 0 ? (
                            repos.map(repo => (
                            <a 
                                key={repo.id} 
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400">
                                        {repo.name}
                                    </span>
                                    {repo.language && (
                                        <span className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full shrink-0 ml-2">
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

                </div>
            </div>
        </div>
    );
};

export default UserModal;