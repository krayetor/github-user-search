/**
 * Helper utilities to export GitHub user profiles to CSV and JSON formats.
 */

/**
 * Triggers a browser download for a Blob content
 */
function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * Escapes values properly for CSV inclusion according to RFC 4180
 */
function escapeCSV(val) {
    if (val === null || val === undefined) return '""';
    const stringified = String(val).replace(/"/g, '""');
    return `"${stringified}"`;
}

/**
 * Exports an array of GitHub user objects to a structured CSV file
 */
export function exportToCSV(users, filename = 'github-users') {
    if (!users || users.length === 0) return;

    const headers = [
        'Username',
        'Name',
        'Location',
        'Public Repositories',
        'Followers',
        'Following',
        'Company',
        'Bio',
        'Profile URL'
    ];

    const rows = users.map(u => [
        escapeCSV(u.login),
        escapeCSV(u.name || ''),
        escapeCSV(u.location || ''),
        u.public_repos ?? 0,
        u.followers ?? 0,
        u.following ?? 0,
        escapeCSV(u.company || ''),
        escapeCSV(u.bio || ''),
        escapeCSV(u.html_url || `https://github.com/${u.login}`)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
    triggerDownload(csvContent, `${safeFilename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exports an array of GitHub user objects to a clean, formatted JSON file
 */
export function exportToJSON(users, filename = 'github-users') {
    if (!users || users.length === 0) return;

    const cleaned = users.map(u => ({
        login: u.login,
        name: u.name || null,
        avatar_url: u.avatar_url,
        html_url: u.html_url,
        location: u.location || null,
        company: u.company || null,
        bio: u.bio || null,
        public_repos: u.public_repos ?? 0,
        followers: u.followers ?? 0,
        following: u.following ?? 0,
        created_at: u.created_at || null,
    }));

    const jsonContent = JSON.stringify(cleaned, null, 2);
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
    triggerDownload(jsonContent, `${safeFilename}.json`, 'application/json;charset=utf-8;');
}
