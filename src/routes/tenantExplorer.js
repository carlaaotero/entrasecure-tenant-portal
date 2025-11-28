// La ruta pel mòdul "Tenant Explorer"

const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const {
    getUsersPreview,
    getGroupsPreview,
    getAllUsers,
    getTenantUserById,
    getTenantUserMemberOf,
    getTenantUserAppRoleAssignments,
    deleteUsers,
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

// POST /tenant/users/delete -> eliminar un o més usuaris seleccionats
router.post('/tenant/users/delete', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        let { userIds } = req.body;

        // Si no s'ha seleccionat cap usuari, simplement tornem a la llista
        if (!userIds) {
            return res.redirect('/tenant/users');
        }

        // userIds pot ser un string (1 usuari) o un array (varis usuaris)
        await deleteUsers(accessToken, userIds);

        // Més endavant pots afegir missatge de "X usuaris eliminats"
        res.redirect('/tenant/users');
    } catch (err) {
        console.error('Error a /tenant/users/delete:', err);
        res.status(500).send('Error eliminant usuaris del tenant');
    }
});


router.get('/tenant/users/:id', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);
        const userId = req.params.id;

        const [
            userProfile,
            memberOfRaw,
            appRoleAssignments,
        ] = await Promise.all([
            getTenantUserById(accessToken, userId),
            getTenantUserMemberOf(accessToken, userId),
            getTenantUserAppRoleAssignments(accessToken, userId),
        ]);

        const groups = memberOfRaw.filter(
            (o) => o['@odata.type'] === '#microsoft.graph.group'
        );
        const directoryRoles = memberOfRaw.filter(
            (o) => o['@odata.type'] === '#microsoft.graph.directoryRole'
        );

        const roles = directoryRoles;
        const apps = appRoleAssignments;

        const helpfulInfo = `
Aquesta vista mostra la identitat d'un usuari del tenant de Microsoft Entra ID,
incloent les seves propietats bàsiques, grups, rols de directori i aplicacions
on té rols assignats. És útil per analitzar el context d'accés d'un usuari concret.
`.trim();

        res.render('tenantExplorer/userIdentity', {
            title: `Usuari · ${userProfile.displayName || userProfile.userPrincipalName}`,
            user: account,        // usuari logat (per la navbar)
            userProfile,          // usuari seleccionat
            groups,
            roles,
            apps,
            helpfulInfo,
        });
    } catch (err) {
        console.error('Error carregant /tenant/users/:id:', err);
        res.status(500).send('Error carregant el detall de l\'usuari');
    }
});

module.exports = router;
