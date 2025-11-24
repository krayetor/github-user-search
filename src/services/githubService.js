import axios from 'axios';
import { use } from 'react';

export const searchUsers = async (username, location, minRepos, language, sortType, page = 1) => {
    try {
        // start with the base query (username)
        let query = username;

        // append the location if provided
        if (location) {
            query += `+location:${location}`;
        }

        // append repo count if provided
        if (minRepos) {
            query += `repos:>=${minRepos}`;
        }

        if (language) {
            query += `+language:${language}`;
        }

        let url = `https://api.github.com/search/users?q=${query}&page=${page}&per_page=10`;

        if (sortType && sortType !== 'best-match') {
            url += `&sort=${sortType}&order=desc`;
        }

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
export const fetchUserData = async (username) => {

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

export const fetchUserRepos = async (username) => {
    try {
        // sort by 'updated' to get the freshest work
        const response = await axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`, {
            headers: {
                Authorization: `token ${import.meta.env.VITE_APP_GITHUB_API_KEY}`
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching repos:", error);
        return []; // return empty array on error so the app doesn't crash
    }
}