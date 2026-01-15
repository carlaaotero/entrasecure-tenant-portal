/**
 * src/middleware/rbac.js
 * ----------------------
 * Middleware d'autorització (RBAC intern del portal) basat en App Roles.
 *
 * Context del projecte:
 *  - Els "Directory Roles" són rols globals del tenant (User Admin, Global Admin, etc.)
 *  - Els "Portal Roles" són App Roles definits a l'App Registration del portal
 *    i serveixen per controlar l'accés a funcionalitats internes del portal.
 *
 * Flux:
 *  1) L'usuari fa login amb Entra ID
 *  2) El token (ID token) pot contenir el claim "roles" amb els App Roles assignats
 *  3) El backend els guarda a la sessió (req.session.portalRoles)
 *  4) Aquest middleware comprova rols abans de deixar accedir a rutes/accions
 *
 * Nota:
 *  - Amb Entra ID Free, els App Roles s'assignen directament a usuaris (no a grups).
 *  - Si no té rol suficient, NO es trenca l'app: es fa redirect i es mostra un missatge "flash".
 */

const { ERROR_MESSAGES } = require('../errors/errorCatalog');

// Middleware d'autenticació bàsic: Si no hi ha sessió d'usuari, es redirigeix al login. No valida permisos, només que l'usuari està autenticat
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.redirect('/auth/login');
  next();
}

// Recupera els App Roles del portal guardats a sessió
function getRoles(req) {
  const roles = req.session?.portalRoles || [];
  return Array.isArray(roles) ? roles : [roles];
}

// Comprovació simple: l'usuari té un rol concret?
function hasRole(req, role) {
  return getRoles(req).includes(role);
}

// TenantAdmin bypass: En el disseny del portal, Portal.TenantAdmin és el rol de màxim privilegi dins del RBAC intern i pot accedir a tot el portal
function isTenantAdmin(req) {
  return hasRole(req, 'Portal.TenantAdmin');
}

/**
 * Middleware principal:
 * requireRole('Portal.UserAdmin', 'Portal.GroupAdmin', ...)
 *
 * Permet accedir si:
 *  - L'usuari està autenticat
 *  - Té almenys un dels rols permesos
 *  - O bé és TenantAdmin (bypass)
 *
 * Si no compleix, s'injecta un missatge flash (UX) i es redirigeix a Home.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Auth bàsic
    if (!req.session?.user) return res.redirect('/auth/login');

    // TenantAdmin té accés total
    if (isTenantAdmin(req)) return next(); // bypass total

    // Check d'App Roles
    const roles = getRoles(req);
    const ok = allowedRoles.some(r => roles.includes(r));

    if (!ok) {
      req.session.flash = { type: 'info', message: ERROR_MESSAGES.FORBIDDEN_PORTAL_ROLE };
      return res.redirect('/');
    }

    next();
  };
}

// Helper per UI o checks puntuals
function hasAnyRole(req, ...allowedRoles) {
  if (!req.session?.user) return false;
  if (isTenantAdmin(req)) return true;
  const roles = getRoles(req);
  return allowedRoles.some(r => roles.includes(r));
}

// Compatibilitat amb codi antic: security.js espera requireTenantAdmin
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
