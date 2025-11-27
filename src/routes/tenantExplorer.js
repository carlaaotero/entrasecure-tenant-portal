// La ruta pel mòdul "Tenant Explorer"

const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const {
    getUsersPreview,
    getGroupsPreview,
    getAllUsers,
} = require('../controllers/tenantController');

// Middleware per protegir rutes: si no hi ha sessió, envia a login
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
}

// GET /tenant -> pantalla principal del Tenant Explorer
router.get('/tenant', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;

        // 1. Obtenir access token per Graph
        const accessToken = await getTokenForGraph(account);

        // 2. Obtenir mini-preview (primeres 5 entrades)
        const usersPreview = await getUsersPreview(accessToken, 5);
        const groupsPreview = await getGroupsPreview(accessToken, 5);

        // 3. Renderitzar la vista passant les dades
        res.render('tenantExplorer/tenantExplorer', {
            title: 'Tenant Explorer · EntraSecure',
            user: account,
            usersPreview,
            groupsPreview,
        });

    } catch (err) {
        console.error('Error carregant /tenant:', err);
        res.status(500).send('Error carregant el Tenant Explorer');
    }
});;

// GET /tenant/users -> vista completa de tots els usuaris del tenant
router.get('/tenant/users', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const users = await getAllUsers(accessToken);

        res.render('tenantExplorer/users', {
            title: 'Usuaris del tenant',
            user: account,
            users,
        });
    } catch (err) {
        console.error('Error carregant /tenant/users:', err);
        res.status(500).send('Error carregant la llista d\'usuaris');
    }
});


module.exports = router;
