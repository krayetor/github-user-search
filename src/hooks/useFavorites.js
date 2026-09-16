/**
 * useFavorites — custom hook for bookmarking GitHub user profiles.
 *
 * Persists an array of full user objects (GitHub /users/:login shape) to
 * localStorage under the key 'github_favorites'. Uses user.id (not login)
 * as the unique key so renames don't break bookmarks.
 *
 * Returns:
 *   favorites      – current array of bookmarked user objects
 *   isFavorite(u)  – returns true if the user is bookmarked
 *   toggleFavorite(u) – adds or removes the user from bookmarks
 *   clearFavorites – wipes all bookmarks
 */
import { useState } from 'react';

const STORAGE_KEY = 'github_favorites';

export function useFavorites() {
    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const persist = (next) => {
        setFavorites(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    const isFavorite = (user) => favorites.some((f) => f.id === user.id);

    const toggleFavorite = (user) => {
        if (isFavorite(user)) {
            persist(favorites.filter((f) => f.id !== user.id));
        } else {
            persist([user, ...favorites]);
        }
    };

    const clearFavorites = () => {
        persist([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    return { favorites, isFavorite, toggleFavorite, clearFavorites };
}
