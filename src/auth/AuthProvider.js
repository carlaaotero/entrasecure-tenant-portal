// Crea la instància MSAL ConfidentialClientApplication i ofereix utilitats per obtenir tokens

const { msalConfig } = require('./msalConfig'); // importar la configuració de MSAL
const msal = require('@azure/msal-node'); // llibreria oficial MSAL per Node

// Instància única de l'aplicació confidencial (Client Credentials + Auth Code)
const cca = new msal.ConfidentialClientApplication(msalConfig);

/**
 * Obté un access token per Microsoft Graph per a un "account" (usuari) ja logat.
 * Intenta primer via "Silent" perquè no calgui reautenticar.
 * @param {msal.AccountInfo} account
 * @returns {Promise<string>} accessToken
 */
async function getTokenForGraph(account) {
  const response = await cca.acquireTokenSilent({
    account, // compte MSAL guardat a sessió
    scopes: ['User.Read'], // els mateixos que vam demanar al login
  });
  return response.accessToken;
}

module.exports = { cca, getTokenForGraph };
