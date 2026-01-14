// La ruta pel mòdul "My Identity" ---- mostra el perfil de l'usuari que s'ha autenticat

const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const { handleRouteError } = require('../errors/graphErrorHandler');
const { requireAuth } = require('../middleware/rbac'); // Middleware per protegir rutes: si no hi ha sessió, envia a login
const {
  getUserIdentity,
  getUserMemberOf,
  getUserAppRoleAssignments,
  getUserDevices,
} = require('../controllers/graphController');


// GET /me -> pàgina "My Identity"
router.get('/me', requireAuth, async (req, res) => {
  try {
    const account = req.session.user;

    const flash = req.session.flash || null;
    req.session.flash = null;

    // Si venim d'un error (p. ex. 403) evitem bucle: renderitzem amb dades buides però mantenim el missatge.
    if (req.query.blocked === '1') {
      const helpfulInfo = `
Aquest apartat mostra informació bàsica de la identitat a Microsoft Entra ID
(per exemple, display name, UPN, tipus d'usuari i dates clau), així com la
seva pertinença a grups, rols de directori, aplicacions assignades i
dispositius registrats.
`.trim();

      return res.render('identity', {
        title: 'My Identity · EntraSecure',
        user: account,
        userProfile: null,
        groups: [],
        roles: [],
        apps: [],
        devices: [],
        helpfulInfo,
        flash,
      });
    }

    // 1) Access token per Graph
    const accessToken = await getTokenForGraph(account);

    // 2) Crides en paral·lel a Graph
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
    const roles = directoryRoles; // per ara, mostrem ROLES de directori tal qual
    const apps = appRoleAssignments; // llista d'aplicacions on té rols
    const userDevices = devices; // dispositius registrats

    const helpfulInfo = `
Aquest apartat mostra informació bàsica de la identitat a Microsoft Entra ID 
(per exemple, display name, UPN, tipus d'usuari i dates clau), així com la 
seva pertinença a grups, rols de directori, aplicacions assignades i 
dispositius registrats. És útil per entendre com es representen i relacionen 
els objectes dins d'un tenant d'Entra ID.
`.trim();

    res.render('identity', {
      title: 'My Identity · EntraSecure',
      user: account,          // per a la navbar (nom, inicial, etc.)
      userProfile,
      groups,
      roles,
      apps,
      devices: userDevices,
      helpfulInfo,
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