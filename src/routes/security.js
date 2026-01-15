/**
 * src/routes/security.js
 * ---------------------
 * Mòdul "Security".
 *
 * Aquesta ruta mostra una visió general (overview) de seguretat del tenant:
 * - mètriques d'identitats (users, guests, disabled)
 * - governança (grups/apps sense owners)
 * - higiene de credencials (secrets/certs expirats o a punt d’expirar)
 * - privilegi (assignacions a rols d'impacte alt)
 * - distribució del RBAC intern del portal (App Roles assignats a usuaris)
 *
 * Accés:
 * - Aquest mòdul està restringit a "Tenant Admin" del portal (RBAC intern).
 * - Si un usuari no compleix, el middleware farà redirect i posarà un missatge flash.
 */

const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const { requireRole } = require('../middleware/rbac');
const { buildSecurityOverview } = require('../controllers/securityController');
const { handleRouteError } = require('../errors/graphErrorHandler');
const { UI_MESSAGES } = require('../messages/uiMessages');

// GET /security - Renderitza el dashboard " Tenant Security Overview".
router.get('/security', requireRole('Portal.TenantAdmin'), async (req, res) => {
  try {
    const account = req.session.user;
    
    // Token de Microsoft Graph amb els scopes configurats a msalConfig.js
    const accessToken = await getTokenForGraph(account);

    // Map opcional d'appRoleId -> etiqueta llegible per humans
    const roleIdToLabel = {
      '00000000-0000-0000-0000-000000000000': UI_MESSAGES.LABELS.DEFAULT_ACCESS,
      // 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee': 'Portal.UserAdmin',
      // ...
    };

    // Construïm el model que consumirà la vista
    const model = await buildSecurityOverview(accessToken, { roleIdToLabel });

    res.render('security/securityOverview', {
      title: UI_MESSAGES.TITLES.SECURITY_OVERVIEW,
      user: account,
      portalRoles: req.session.portalRoles || [],
      model,
    });
  } catch (err) {
    return handleRouteError({
      req,
      res,
      err,
      actionKey: 'security.overview',
      redirectTo: '/',
    });
  }
});

module.exports = router;
