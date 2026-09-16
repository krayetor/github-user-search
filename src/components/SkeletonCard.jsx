import React from "react";

const SkeletonCard = () => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-md flex items-start gap-4 transition-colors duration-200 animate-pulse">
            
            {/* avatar skeleton */}
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0 transition-colors duration-200" />

            <div className="flex-1 space-y-3 py-1">
                {/* name title skeleton */}
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-lg w-3/4 transition-colors duration-200" />

                {/* handle skeleton */}
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-md w-1/4 transition-colors duration-200" />

                {/* stats skeleton (location/repos) */}
                <div className="space-y-2 mt-2">
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-md w-1/2 transition-colors duration-200" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-md w-2/3 transition-colors duration-200" />
                </div>

                {/* button skeleton */}
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-xl w-24 mt-2 transition-colors duration-200" />
            </div>
        </div>
    );
};

export default SkeletonCard;