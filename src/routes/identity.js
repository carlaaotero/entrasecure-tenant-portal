// La ruta pel mòdul "My Identity" ---- mostra el perfil de l'usuari que s'ha autenticat


const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const {
  getUserIdentity,
  getUserMemberOf,
  getUserAppRoleAssignments,
  getUserDevices,
} = require('../controllers/graphController');

// Middleware per protegir rutes: si no hi ha sessió, envia a login
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}

// GET /me -> pàgina "My Identity"
router.get('/me', requireAuth, async (req, res) => {
  try {
    const account = req.session.user;
    console.log('[IDENTITY] account de sessió:', account);

    // 1) Access token per Graph
    const accessToken = await getTokenForGraph(account);
    console.log('[IDENTITY] accessToken (primeres 40 lletres):', accessToken.slice(0, 40), '...');

    // 2) Crides en paral·lel a Graph
    const [userProfile, memberOfRaw, appRoleAssignments, devices] =
      await Promise.all([
        getUserIdentity(accessToken),
        getUserMemberOf(accessToken),
        getUserAppRoleAssignments(accessToken),
        getUserDevices(accessToken),
      ]);

    console.log('[IDENTITY] /me profile rebut:', JSON.stringify(userProfile, null, 2));
    console.log('[IDENTITY] memberOf count:', memberOfRaw.length);
    console.log('[IDENTITY] appRoleAssignments count:', appRoleAssignments.length);
    console.log('[IDENTITY] devices count:', devices.length);

    // 3) Separar grups i directory roles a partir de memberOf
    const groups = memberOfRaw.filter(
      (o) => o['@odata.type'] === '#microsoft.graph.group'
    );

    const directoryRoles = memberOfRaw.filter(
      (o) => o['@odata.type'] === '#microsoft.graph.directoryRole'
    );
    
    console.log('[IDENTITY] groups filtrats:', groups.length);
    console.log('[IDENTITY] directoryRoles filtrats:', directoryRoles.length);

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
    });
  } catch (error) {
    console.error('Error a /me:', error);
    res.status(500).send('Error carregant la informació de My Identity');
  }
});

module.exports = router;