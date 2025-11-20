import axios from 'axios';

// create an axios instance with base configuration
const githubApi = axios.create({
    baseURL: "https://api.github.com",
    headers: {
        Authorization: `token ${import.meta.env.VITE_APP_GITHUB_API_KEY}`,
    },
});

export const searchUsers = async (query, location = '', minRepos = '') => {
    // construct the search query string
    let q = query;
    if (location) q += `+location:${location}`;
    if (minRepos) q += `+repos:>${minRepos}`;

    try {
        // axios automatically handles the json parsing for us
        const response = await githubApi.get('/search/users', {
            params: {q}
        });

        return response.data.items;
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};