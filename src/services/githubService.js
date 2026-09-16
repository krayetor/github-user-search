import axios from 'axios';

/**
 * Returns Axios headers for GitHub API calls.
 * Only includes the Authorization header when the env variable is actually set.
 * Without it, GitHub still works but at reduced rate limits (10 req/min for search).
 */
function getAuthHeaders() {
    const token = import.meta.env.VITE_APP_GITHUB_API_KEY;
    return token && token !== 'your_token_here'
        ? { Authorization: `token ${token}` }
        : {};
}

export const searchUsers = async (username, location, minRepos, language, sortType, page = 1) => {
    const parts = [];

    if (username && username.trim()) {
        parts.push(username.trim());
    }

    if (location && location.trim()) {
        parts.push(`location:${location.trim()}`);
    }

    if (minRepos !== undefined && minRepos !== null && String(minRepos).trim() !== '') {
        parts.push(`repos:>=${String(minRepos).trim()}`);
    }

    if (language && language.trim()) {
        parts.push(`language:${language.trim()}`);
    }

    const query = parts.join('+');

    let url = `https://api.github.com/search/users?q=${query}&page=${page}&per_page=10`;

    if (sortType && sortType !== 'best-match') {
        url += `&sort=${sortType}&order=desc`;
    }

    const response = await axios.get(url, { headers: getAuthHeaders() });

    return {
        data: response.data,
        // GitHub returns these headers on every Search API response.
        // We surface them so the UI can show a live rate-limit indicator.
        rateLimit: {
            limit:     Number(response.headers['x-ratelimit-limit'])     || 10,
            remaining: isNaN(Number(response.headers['x-ratelimit-remaining']))
                           ? null
                           : Number(response.headers['x-ratelimit-remaining']),
            reset:     Number(response.headers['x-ratelimit-reset'])     || 0,
        },
    };
};

// helps to get details for a specific user (since Search API doesn't give full details)
export const fetchUserData = async (username) => {
    const response = await axios.get(
        `https://api.github.com/users/${username}`,
        { headers: getAuthHeaders() }
    );
    return response.data;
};

export const fetchUserRepos = async (username, perPage = 10) => {
    try {
        // sort by 'updated' to get the freshest work
        const response = await axios.get(
            `https://api.github.com/users/${username}/repos?sort=updated&per_page=${perPage}`,
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching repos:", error);
        return []; // return empty array on error so the app doesn't crash
    }
};

export const fetchUserEvents = async (username, perPage = 10) => {
    try {
        const response = await axios.get(
            `https://api.github.com/users/${username}/events/public?per_page=${perPage}`,
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching user events:", error);
        return [];
    }
};