/**
 * src/errors/graphErrorHandler.js
 * 
 * Representen errors generals del sistema que no han pogut ser
 * classificats en una categoria específica (validació, permisos,
 * Microsoft Graph, etc.).
 *
 * Aquests errors s’utilitzen com a fallback per evitar que
 * l’aplicació falli o mostri informació tècnica a l’usuari final.
 */

const { ERROR_MESSAGES } = require('./errorCatalog');

function isForbidden(err) {
  const status = err?.status || err?.response?.status;
  return status === 403;
}

function isBadRequest(err) {
  const status = err?.status || err?.response?.status;
  return status === 400;
}

function mapForbiddenToMessage(actionKey) {
  // auth
  if (actionKey.startsWith('auth.')) return ERROR_MESSAGES.AUTH_FORBIDDEN;

  // tenant home (si algun dia el protegeixes o falla per rol)
  if (actionKey.startsWith('tenant.')) return ERROR_MESSAGES.GRAPH_GENERIC_FORBIDDEN;

  // identity
  if (actionKey.startsWith('identity.')) return ERROR_MESSAGES.GRAPH_FORBIDDEN_IDENTITY_READ;

  // tenant explorer per mòduls
  if (actionKey.startsWith('users.')) return ERROR_MESSAGES.GRAPH_FORBIDDEN_USER_ADMIN;
  if (actionKey.startsWith('groups.')) return ERROR_MESSAGES.GRAPH_FORBIDDEN_GROUP_ADMIN;
  if (actionKey.startsWith('apps.')) return ERROR_MESSAGES.GRAPH_FORBIDDEN_APP_ADMIN;
  if (actionKey.startsWith('roles.')) return ERROR_MESSAGES.GRAPH_FORBIDDEN_PRIV_ROLE_ADMIN;


  return ERROR_MESSAGES.GRAPH_GENERIC_FORBIDDEN;
}

/**
 * Maneig estàndard d’errors:
 * - Si és Graph 403 -> flash info i redirect (no petar app)
 * - Si és 400 -> flash error i redirect
 * - Altres -> flash error i redirect
 */
function handleRouteError({ req, res, err, redirectTo = '/', actionKey = '' }) {
  // 403 Forbidden (molt comú quan falta directory role)
  if (isForbidden(err)) {
    req.session.flash = { type: 'info', message: mapForbiddenToMessage(actionKey) };
    return res.redirect(redirectTo);
  }

  // 400 Bad Request
  if (isBadRequest(err)) {
    req.session.flash = { type: 'error', message: ERROR_MESSAGES.GRAPH_BAD_REQUEST };
    return res.redirect(redirectTo);
  }

  // Altres errors
  console.error('[ERROR]', actionKey, err?.message || err);
  req.session.flash = { type: 'error', message: ERROR_MESSAGES.INTERNAL_ERROR };
  return res.redirect(redirectTo);
}

module.exports = { handleRouteError };
