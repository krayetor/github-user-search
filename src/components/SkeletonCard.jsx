import React from "react";

const SkeletonCard = () => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-md flex items-start gap-4 transition-colors animate-pulse">
            
            {/* avatar skeleton */}
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0 transition-colors" />

            <div className="flex-1 space-y-3 py-1">
                {/* name title skeleton */}
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-3/4 transition-colors" />

                {/* handle skeleton */}
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 transition-colors" />

                {/* stats skeleton (location/repos) */}
                <div className="space-y-2 mt-2">
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 transition-colors" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3 transition-colors" />
                </div>

                {/* button skeleton */}
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-24 mt-2 transition-colors" />
            </div>
        </div>
    );
};

export default SkeletonCard;