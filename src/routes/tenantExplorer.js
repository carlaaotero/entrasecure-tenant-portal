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
    createUser,
    getAllGroups,
    deleteGroups,
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


/* -- USERS -- */

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


// POST /tenant/users/create -> crear un usuari
router.post('/tenant/users/create', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { displayName, userPrincipalName, password } = req.body;
        const userType = 'Member';

        const newUser = {
            accountEnabled: true,
            displayName,
            mailNickname: displayName.replace(/\s+/g, ''), // sense espais
            userPrincipalName,
            userType,
            passwordProfile: {
                forceChangePasswordNextSignIn: true,
                password,
            },
        };

        await createUser(accessToken, newUser);

        res.redirect('/tenant/users');
    } catch (err) {
        console.error("Error creant usuari:", err);
        res.status(500).send("No s'ha pogut crear l'usuari.");
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

        // Més endavant afegir missatge de "X usuaris eliminats"
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


/* -- GROUPS -- */

// GET /tenant/groups -> vista completa de tots els groups del tenant
router.get('/tenant/groups', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const groups = await getAllGroups(accessToken);

        res.render('tenantExplorer/groups', {
            title: 'Grups del tenant',
            user: account,
            groups,
        });
    } catch (err) {
        console.error('Error carregant /tenant/groups:', err);
        res.status(500).send('Error carregant els grups del tenant');
    }
});


// POST /tenant/groups/delete -> eliminar un o més groups seleccionats
router.post('/tenant/groups/delete', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        let { groupIds } = req.body;

        // Si no s'ha seleccionat cap grup, simplement tornem a la llista
        if (!groupIds) {
            return res.redirect('/tenant/groups');
        }

        // groupIds pot ser un string (1 grup) o un array (varis grups)
        await deleteGroups(accessToken, groupIds);

        // Més endavant afegir missatge de "X grups eliminats"
        res.redirect('/tenant/groups');
    } catch (err) {
        console.error('Error a /tenant/groups/delete:', err);
        res.status(500).send('Error eliminant grups del tenant');
    }
});


module.exports = router;
