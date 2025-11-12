// Les rutes d'autenticació

const express = require('express');
const router = express.Router();
const { cca } = require('../auth/AuthProvider');
const { REDIRECT_URI, graphScopes } = require('../auth/msalConfig');

// Inicia el flux d'OpenID Connect: demana a Entra ID una URL d'autenticació
router.get('/login', (req, res) => {
  const authUrlParams = {
    scopes: graphScopes, // permisos que volem
    redirectUri: REDIRECT_URI, // on tornar després del login
  };

  // Genera la URL de login d'Entra ID i redirigeix l'usuari
  cca.getAuthCodeUrl(authUrlParams).then((response) => {
    res.redirect(response);
  }).catch((error) => res.status(500).send(error));
});

// Entra ID redirigeix aquí amb ?code=... -> intercanviem el code per tokens
router.get('/redirect', async (req, res) => {
  const tokenRequest = {
    code: req.query.code, // codi d'autorització rebut a la query string
    scopes: graphScopes, // han de coincidir amb els demanats al login
    redirectUri: REDIRECT_URI,
  };

  try {
    // Demanem a MSAL els tokens (ID token + Access token) a partir del code
    const response = await cca.acquireTokenByCode(tokenRequest);
    req.session.user = response.account; // Guardem el compte a sessió per tornar-lo a cridar

    res.redirect('/'); // tornar a home (ja autenticat)
  } catch (error) {
    console.error(error);
    res.status(500).send('Error acquiring token');
  }
});

// Tanca la sessió (elimina dades locals). Per un logout complet, també es pot redirigir a Microsoft logout endpoint.
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
