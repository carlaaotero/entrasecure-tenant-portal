/**
 * AuthProvider.js
 * ----------------
 * Aquest mòdul s'encarrega de:
 *  - Crear la instància MSAL (ConfidentialClientApplication)
 *  - Proporcionar una funció reutilitzable per obtenir access tokens
 *    de Microsoft Graph per a usuaris ja autenticats.
 *
 * És el punt central d'autenticació del backend contra Microsoft Entra ID.
 */

const msal = require('@azure/msal-node'); // / Llibreria oficial de Microsoft per gestionar OAuth2 / OpenID Connect amb Entra ID
const { msalConfig, graphScopes } = require('./msalConfig'); // Configuració de MSAL (clientId, authority, secret, etc.) i llista d'scopes necessaris per accedir a Microsoft Graph

/**
 * Instància única de MSAL Confidential Client Application.
 *
 * S'utilitza el model "confidential client" perquè:
 *  - L'aplicació corre al servidor (Node.js)
 *  - Té un client secret
 *  - Pot intercanviar authorization codes i refrescar tokens
 *
 * Aquesta instància s'utilitza durant tota la vida de l'aplicació.
 */
const cca = new msal.ConfidentialClientApplication(msalConfig);

/**
 * Obté un access token vàlid per Microsoft Graph per a un usuari ja autenticat.
 *
 * IMPORTANT:
 * - Aquesta funció NO fa login.
 * - Assumeix que l'usuari ja ha passat pel flux d'autenticació
 *   i que disposem del seu "account" MSAL (guardat a la sessió).
 *
 * El token s'obté de manera "silent":
 * - Si el token és a la cache → es reutilitza
 * - Si ha expirat → MSAL el renova automàticament
 *
 * @param {msal.AccountInfo} account
 *        Objecte MSAL que representa l'usuari autenticat
 *        (obtingut durant el login i guardat a req.session.user)
 *
 * @returns {Promise<string>} accessToken
 *          Access token JWT per fer crides a Microsoft Graph
 */
async function getTokenForGraph(account) {
  const response = await cca.acquireTokenSilent({
    account, // compte MSAL associat a l'usuari
    scopes: graphScopes, // permisos necessaris per Graph (User.Read, Group.Read.All, etc.)
  });
  return response.accessToken;
}

module.exports = { cca, getTokenForGraph };
