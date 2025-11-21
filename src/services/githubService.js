import axios from 'axios';

export const searchUsers = async (username, location, minRepos, page = 1) => {
    try {
        // start with the base query (username)
        let query = username;

        // append the location if provided
        if (location) {
            query += `+location:${location}`;
        }

        // append repo count if provided
        if (minRepos) {
            query += `repos:>${minRepos}`;
        }

        const url = `https://api.github.com/search/users?q=${query}&page=${page}&per_page=10`;

        const response = await axios.get(url, {
            headers: {
                Authorization: `token ${import.meta.env.VITE_APP_GITHUB_API_KEY}`
            },
        });

        return response.data;
    } catch (error) {
        throw error;
    }
};

// helps to get details for a specific user (since Search API doesn't give full details)
export const fetchUserDetails = async (username) => {

    try {
        const response = await axios.get(`https://api.github.com/users/${username}`, {
            headers: {
                Authorization: `token ${import.meta.env.VITE_APP_GITHUB_API_KEY}`
            }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};