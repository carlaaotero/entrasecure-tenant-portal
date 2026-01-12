// routes/security.js

const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const { requireTenantAdmin } = require('../middleware/rbac');
const { buildSecurityOverview } = require('../controllers/securityController');

router.get('/security', requireTenantAdmin, async (req, res) => {
  try {
    const account = req.session.user;
    const accessToken = await getTokenForGraph(account);

    // Opcional: map d'appRoleId -> label
    // (posa aquí els appRoleId reals del teu portal si vols)
    const roleIdToLabel = {
      '00000000-0000-0000-0000-000000000000': 'Default access',
      // 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee': 'Portal.UserAdmin',
      // ...
    };

    const model = await buildSecurityOverview(accessToken, { roleIdToLabel });

    res.render('security/securityOverview', {
      title: 'Tenant Security Overview · EntraSecure',
      user: account,
      portalRoles: req.session.portalRoles || [],
      model,
    });
  } catch (err) {
    console.error('Error carregant /security:', err.message || err);
    res.status(500).send("Error carregant el dashboard de seguretat");
  }
});

module.exports = router;
