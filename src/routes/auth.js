/**
 * src/routes/auth.js
 * ------------------
 * Rutes d'autenticació del portal utilitzant Microsoft Entra ID (OpenID Connect)
 * amb la llibreria oficial MSAL per Node.js.
 *
 * Flux general:
 *  1) /auth/login
 *     - Redirigeix l'usuari a la pàgina de login d'Entra ID
 *     - Demana un Authorization Code
 *
 *  2) /auth/redirect
 *     - Entra ID redirigeix aquí amb ?code=...
 *     - El backend intercanvia el code per tokens (ID token + Access token)
 *     - Es guarda la sessió de l'usuari
 *     - Es llegeixen els App Roles (RBAC intern del portal) del token
 *
 *  3) /auth/logout
 *     - Elimina la sessió local
 *
 * Notes importants:
 *  - L'ID token s'utilitza per identitat i RBAC (claims "roles")
 *  - L'Access token s'utilitza per cridar Microsoft Graph
 *  - Amb Entra ID Free, els App Roles s'assignen directament a usuaris
 */

const express = require('express');
const router = express.Router();

const { cca } = require('../auth/AuthProvider');
const { REDIRECT_URI, graphScopes } = require('../auth/msalConfig');

// Inicia el flux d'autenticació OpenID Connect: demana a Entra ID una URL d'autenticació
router.get('/login', (req, res) => {
  const authUrlParams = {
    scopes: graphScopes, // Permisos que demanem
    redirectUri: REDIRECT_URI, // URI on Entra ID retornarà el control
  };

  cca.getAuthCodeUrl(authUrlParams).then((response) => {
    res.redirect(response);
  }).catch((error) => res.status(500).send(error));
});

// Endpoint de retorn després del login. Entra ID redirigeix aquí amb un Authorization Code
router.get('/redirect', async (req, res) => {
  const tokenRequest = {
    code: req.query.code, // Authorization Code rebut
    scopes: graphScopes, // Han de coincidir amb els del login
    redirectUri: REDIRECT_URI,
  };

  try {
    // Demanem a MSAL els tokens (ID token + Access token) a partir del code
    const response = await cca.acquireTokenByCode(tokenRequest);

    // Sessió d'usuari: response.account guarda la identitat de l'usuari (AccountInfo) i la guardem per reutilitzar-la
    req.session.user = response.account;

    // RBAC INTERN DEL PORTAL (App Roles via claims). Els Apps Roles assignats a l'usuari arriben al claim "roles" de l'ID token. Es guarden a sessió per ser utilitzats pels middlewares RBAC
    const portalRoles = response.idTokenClaims?.roles || [];
    req.session.portalRoles = Array.isArray(portalRoles)
      ? portalRoles
      : [portalRoles];
    
      console.log('[RBAC] Portal roles:', req.session.portalRoles);


    // Login correcte -> redirigim a la home del portal
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error acquiring token');
  }
});

// Logout: Elimina la sessió local de l'aplicació. No invalida la sessió global d'Entra ID
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
