// Centralitza la configuració de MSAL (Microsoft Entra ID): clientId, tenant, clientSecret, redirectUri i els scopes que demanarà l’app.

require('dotenv').config(); // carregar les variables .env

const { LogLevel } = require('@azure/msal-node'); // enumeració de MSAL

const msalConfig = {
  auth: {
    // ID de l'app registrada a Entra ID
    clientId: process.env.AZURE_CLIENT_ID,
    // URL d'autoritat que identifica el tenant
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    // Client Secret -- no pujar mai al git
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  system: {
    // logs de MSAL
    loggerOptions: {
      loggerCallback(_level, message) {
        console.log(message);
      },
      piiLoggingEnabled: false, // no loguejar info personal
      logLevel: LogLevel.Info,
    },
  },
};

// URI on Entra ID redirigeix després del login
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI;

// scopes que demanem al login 
const graphScopes = ["User.Read", "Directory.Read.All", "Application.ReadWrite.All"]; // CANVIAR MÉS ENDEVANT -- ara és el que et ficar per default Entra ID al crear una app

module.exports = { msalConfig, REDIRECT_URI, graphScopes };
