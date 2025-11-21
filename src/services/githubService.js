import axios from 'axios';

const githubApi = axios.create({
    baseURL: "https://api.github.com",
    headers: {
        Authorization: `token ${import.meta.env.VITE_APP_GITHUB_API_KEY}`
    },
});

export const searchUsers = async (username, location, minRepos, page = 1) => {
    try {
        // start with the base query (username)
        let query = `q=${username}`;

        // append the location if provided
        if (location) {
            query += `+location:${location}`;
        }

        // append repo count if provided
        if (minRepos) {
            query += `repos:>${minRepos}`;
        }

        const response = await githubApi.get(`/search/users?${query}&page=${page}&per_page=10`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// helps to get details for a specific user (since Search API doesn't give full details)
export const fetchUserDetails = async (username) => {
    const response = await githubApi.get(`/users/${username}`);
    return response.data;
};