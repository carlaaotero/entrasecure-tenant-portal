// La ruta pel mòdul "Tenant Explorer"

const express = require('express');
const router = express.Router();

// Middleware per protegir rutes: si no hi ha sessió, envia a login
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}

// GET /tenant -> pantalla principal del Tenant Explorer
router.get('/tenant', requireAuth, (req, res) => {
  res.render('tenantExplorer/tenantExplorer', {
    title: 'Tenant Explorer · EntraSecure',
    user: req.session.user || null,
  });
});

module.exports = router;
