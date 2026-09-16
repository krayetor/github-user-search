import React from "react";

/**
 * Displays the remaining GitHub Search API rate limit as a colored pill.
 *
 * Props:
 *   rateLimit: { limit: number, remaining: number, reset: number (Unix ts) } | null
 *
 * Returns null until the first search has been fired (rateLimit is null).
 */
const RateLimitBadge = ({ rateLimit }) => {
    if (!rateLimit || rateLimit.remaining === null) return null;

    const { limit, remaining, reset } = rateLimit;

    // Format the reset timestamp as a local time string for the tooltip
    const resetTime = new Date(reset * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    // Color thresholds
    let colorClasses;
    let dotColor;
    if (remaining <= 3) {
        colorClasses = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700';
        dotColor     = 'bg-red-500';
    } else if (remaining <= 10) {
        colorClasses = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700';
        dotColor     = 'bg-amber-500';
    } else {
        colorClasses = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700';
        dotColor     = 'bg-green-500';
    }

    return (
        <span
            title={`GitHub Search API · ${remaining}/${limit} requests remaining · Resets at ${resetTime}`}
            className={`
                hidden sm:inline-flex items-center gap-1.5
                text-xs font-semibold px-2.5 py-1 rounded-full border
                transition-colors duration-200 cursor-default select-none
                ${colorClasses}
            `}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
            {remaining}/{limit}
        </span>
    );
};

export default RateLimitBadge;
