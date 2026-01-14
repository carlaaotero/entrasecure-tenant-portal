/**
 * msalConfig.js
 * -------------
 * Aquest fitxer centralitza TOTA la configuració relacionada amb
 * l'autenticació contra Microsoft Entra ID mitjançant MSAL.
 *
 * Aquí es defineixen:
 *  - Les credencials de l'App Registration (clientId, tenant, secret)
 *  - L'autoritat (tenant)
 *  - Les opcions de logging de MSAL
 *  - El redirect URI del login
 *  - Els scopes de Microsoft Graph que demana l'aplicació
 *
 * IMPORTANT:
 *  - Aquest fitxer NO conté lògica
 *  - Només configuració
 */

require('dotenv').config(); // Carrega les variables d'entorn definides a .env (clientID, tenantID, clientSecret, redirectUri, etc)

const { LogLevel } = require('@azure/msal-node'); // Enumeració oficial de nivells de Log de MSAL

/**
 * Configuració principal de MSAL (Confidential Client).
 *
 * Aquesta configuració s'utilitza per crear la instància
 * ConfidentialClientApplication al backend.
 */
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID, // ID de l'app registrada a Entra ID
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`, // URL d'autoritat que identifica el tenant
    clientSecret: process.env.AZURE_CLIENT_SECRET, // Client Secret -- no pujar mai al git
  },

  /**
   * Configuració del sistema (logging, diagnòstic).
   */
  system: {
    // logs de MSAL
    loggerOptions: {
      loggerCallback(_level, message) {
        console.log(message); // Callback que MSAL utilitza per escriure logs. Simplement els enviem a la consola
      },
      piiLoggingEnabled: false, // Desactiva el logging d'informació personal (PII), tal com recomana Microsoft per entorns productius
      logLevel: LogLevel.Info,
    },
  },
};

// Redirect URI del flux d'autenticació. És la URL on Entra ID redirigeix l'usuari després del login
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI;

// Scopes (permisos) que l'aplicació sol·licita a Microsoft Graph. 
const graphScopes = ["User.Read", "Directory.Read.All", "Application.ReadWrite.All"];

module.exports = { msalConfig, REDIRECT_URI, graphScopes };
