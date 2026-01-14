// src/middleware/rbac.js

/*function requireAuth(req, res, next) {
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

module.exports = { requireAuth, hasRole, requireRole, requireAnyRole, requireTenantAdmin };*/


// src/middleware/rbac.js

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.redirect('/auth/login');
  next();
}

function getRoles(req) {
  const roles = req.session?.portalRoles || [];
  return Array.isArray(roles) ? roles : [roles];
}

function hasRole(req, role) {
  return getRoles(req).includes(role);
}

// ✅ TenantAdmin bypass global (accedeix a tot)
function isTenantAdmin(req) {
  return hasRole(req, 'Portal.TenantAdmin');
}

// ✅ Middleware: requireRole('Portal.UserAdmin', 'Portal.GroupAdmin', ...)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session?.user) return res.redirect('/auth/login');

    if (isTenantAdmin(req)) return next(); // bypass total

    const roles = getRoles(req);
    const ok = allowedRoles.some(r => roles.includes(r));

    if (!ok) return res.status(403).send('Forbidden: missing portal role');
    next();
  };
}

// ✅ Helper per UI o checks puntuals
function hasAnyRole(req, ...allowedRoles) {
  if (!req.session?.user) return false;
  if (isTenantAdmin(req)) return true;
  const roles = getRoles(req);
  return allowedRoles.some(r => roles.includes(r));
}

// ✅ Compatibilitat amb el teu codi antic: security.js espera requireTenantAdmin
const requireTenantAdmin = requireRole('Portal.TenantAdmin');

module.exports = {
  requireAuth,
  requireRole,
  requireTenantAdmin,
  hasRole,
  hasAnyRole,
  getRoles,
  isTenantAdmin,
};
