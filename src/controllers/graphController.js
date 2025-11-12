const fetch = require('node-fetch');

/*
Retorna el perfil /me de Graph amb un accessToken vàlid
 */
async function getUserProfile(accessToken) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Graph /me failed: ${response.status} ${text}`);
    }

    return await response.json();
}

module.exports = { getUserProfile };
