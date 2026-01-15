// routes/security.js

const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const { requireTenantAdmin } = require('../middleware/rbac');
const { buildSecurityOverview } = require('../controllers/securityController');
const { handleRouteError } = require('../errors/graphErrorHandler');
const { UI_MESSAGES } = require('../messages/uiMessages');

router.get('/security', requireTenantAdmin, async (req, res) => {
  try {
    const account = req.session.user;
    const accessToken = await getTokenForGraph(account);

    // Opcional: map d'appRoleId -> label
    // (posa aquí els appRoleId reals del teu portal si vols)
    const roleIdToLabel = {
      '00000000-0000-0000-0000-000000000000': UI_MESSAGES.LABELS.DEFAULT_ACCESS,
      // 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee': 'Portal.UserAdmin',
      // ...
    };

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
