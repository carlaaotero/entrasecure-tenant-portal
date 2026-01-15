/**
 * src/routes/identity.js
 * ---------------------
 * Mòdul "My Identity" (ruta /me).
 *
 * Objectiu:
 *  - Mostrar la identitat de l’usuari autenticat (objecte /me)
 *  - Mostrar el seu context IAM:
 *      - Grup(s) als quals pertany
 *      - Directory roles (rols del tenant)
 *      - App role assignments (rols a aplicacions)
 *      - Dispositius registrats
 *
 * Arquitectura:
 *  - Autenticació: req.session.user (MSAL AccountInfo)
 *  - Accés a dades: Microsoft Graph (tokens delegats)
 *  - Errors: centralitzats amb handleRouteError (graphErrorHandler)
 *
 * Nota important (bucle 403):
 *  - Si Graph retorna un 403/401 i redirigim a /me, podríem crear un bucle infinit.
 *  - Per evitar-ho, usem un flag "blocked=1" que renderitza la vista amb dades buides
 *    però mostrant el missatge d’error (flash).
 */

const express = require('express');
const router = express.Router();

const { UI_MESSAGES } = require('../messages/uiMessages');

const { getTokenForGraph } = require('../auth/AuthProvider');
const { handleRouteError } = require('../errors/graphErrorHandler');
const { requireAuth } = require('../middleware/rbac'); // Middleware per protegir rutes: si no hi ha sessió, envia a login

const {
  getUserIdentity,
  getUserMemberOf,
  getUserAppRoleAssignments,
  getUserDevices,
} = require('../controllers/graphController');


// GET /me - Renderitza la pàgina "My Identity" per l’usuari autenticat
router.get('/me', requireAuth, async (req, res) => {
  try {
    const account = req.session.user;

    // Flash messages (UX consistent: informació, errors, etc.)
    const flash = req.session.flash || null;
    req.session.flash = null;

    // Si venim d'un error (p. ex. 403) evitem bucle: renderitzem amb dades buides però mantenim el missatge.
    if (req.query.blocked === '1') {
        return res.render('identity', {
        title: UI_MESSAGES.TITLES.MY_IDENTITY,
        user: account,
        userProfile: null,
        groups: [],
        roles: [],
        apps: [],
        devices: [],
        helpfulInfo: UI_MESSAGES.HELP.MY_IDENTITY,
        flash,
      });
    }

    // 1) Access token per Graph
    const accessToken = await getTokenForGraph(account);

    // 2) Crides principals en paral·lel a Graph
    const [userProfile, memberOfRaw, appRoleAssignments, devices] =
      await Promise.all([
        getUserIdentity(accessToken),
        getUserMemberOf(accessToken),
        getUserAppRoleAssignments(accessToken),
        getUserDevices(accessToken),
      ]);

    // 3) Separar grups i directory roles a partir de memberOf
    const groups = memberOfRaw.filter(
      (o) => o['@odata.type'] === '#microsoft.graph.group'
    );

    const directoryRoles = memberOfRaw.filter(
      (o) => o['@odata.type'] === '#microsoft.graph.directoryRole'
    );

    // 4) Preparar dades per la vista
    const roles = directoryRoles; 
    const apps = appRoleAssignments; 
    const userDevices = devices; 

    res.render('identity', {
      title: UI_MESSAGES.TITLES.MY_IDENTITY,
      user: account,
      userProfile,
      groups,
      roles,
      apps,
      devices: userDevices,
      helpfulInfo: UI_MESSAGES.HELP.MY_IDENTITY,
      flash,
    });
  } catch (error) {
    return handleRouteError({
      req,
      res,
      err: error,
      actionKey: 'identity.read',
      // Evitem bucle si el Graph continua retornant 403
      redirectTo: '/me?blocked=1',
    });
  }
});

module.exports = router;