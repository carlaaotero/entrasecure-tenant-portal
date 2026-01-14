// Pàgina inicial. 

const express = require('express');
const router = express.Router();

// si hi ha sessió, mostra el nom; si no, convida a fer login
router.get('/', (req, res) => {
  const flash = req.session.flash || null;
  req.session.flash = null;
  res.render('index', {
    title: 'EntraSecure Tenant Portal',
    user: req.session.user || null, // vindrà del login (MSAL)
    flash,
  });
});

module.exports = router;
