/**
 * src/routes/index.js
 * ---------------------
 * Ruta de la pàgina inicial (Home).
 *
 * - Mostra la Home tant si l'usuari està autenticat com si no.
 * - Si hi ha sessió (req.session.user), es renderitza el “user pill” a la navbar.
 * - També mostra un missatge temporal (flash) si venim d'una acció anterior
 *   (p. ex. errors de permisos o confirmacions).
 */

const express = require('express');
const router = express.Router();

const { UI_MESSAGES } = require('../messages/uiMessages');

// GET / - Renderitza la pàgina Home. sS hi ha sessió, mostra el nom; si no, convida a fer login
router.get('/', (req, res) => {
  const flash = req.session.flash || null;
  req.session.flash = null;

  res.render('index', {
    title: UI_MESSAGES.TITLES.HOME,
    user: req.session.user || null, // Usuari autenticat via MSAL (o null si no hi ha sessió)
    flash,
  });
});

module.exports = router;
