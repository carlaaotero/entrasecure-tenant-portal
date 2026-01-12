// src/middleware/rbac.js

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
}

function hasRole(req, role) {
  const roles = req.session?.portalRoles || [];
  return roles.includes(role);
}

function requireTenantAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  if (!hasRole(req, 'Portal.TenantAdmin')) {
    return res.status(403).send('Forbidden: TenantAdmin required');
  }
  next();
}

module.exports = { requireAuth, requireTenantAdmin, hasRole };
