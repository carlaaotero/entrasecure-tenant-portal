// src/errors/graphErrorHandler.js
const { ERROR_MESSAGES } = require('./errorCatalog');

/*function getGraphStatus(err) {
  return (
    err?.status ||
    err?.response?.status ||
    err?.response?.statusCode ||
    err?.response?.data?.error?.code
  );
}*/

function isForbidden(err) {
  const status = err?.status || err?.response?.status;
  return status === 403;
}

function isBadRequest(err) {
  const status = err?.status || err?.response?.status;
  return status === 400;
}

function mapForbiddenToMessage(actionKey) {
  // actionKey = 'users.create', 'groups.modify', 'apps.modify', 'roles.modify'...
  if (actionKey.startsWith('identity.')) return ERROR_MESSAGES.GRAPH_FORBIDDEN_IDENTITY_READ;

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
