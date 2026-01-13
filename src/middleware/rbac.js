// src/middleware/rbac.js

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
}

function getRoles(req) {
  return req.session?.portalRoles || [];
}

function hasRole(req, role) {
  const roles = getRoles(req);

  // superuser del portal
  if (roles.includes('Portal.TenantAdmin')) return true;

  return roles.includes(role);
}

function deny(req, res, message = 'Forbidden') {
  req.session.flash = { type: 'error', message };
  return res.redirect(req.get('referer') || '/tenant');
}

function requireRole(role, opts = {}) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    if (!hasRole(req, role)) return deny(req, res, opts.message || `Cal el rol ${role}`);
    next();
  };
}

function requireAnyRole(roles, opts = {}) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const ok = (roles || []).some(r => hasRole(req, r));
    if (!ok) return deny(req, res, opts.message || `Cal un d'aquests rols: ${roles.join(', ')}`);
    next();
  };
}

const requireTenantAdmin = requireRole('Portal.TenantAdmin', {
  message: 'Forbidden: TenantAdmin required',
});

module.exports = { requireAuth, hasRole, requireRole, requireAnyRole, requireTenantAdmin };


