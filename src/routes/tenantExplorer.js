// La ruta pel mòdul "Tenant Explorer"

const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const { callGraphDELETE } = require('../controllers/graphController');


const {
    //Users
    getUsersPreview,
    getAllUsers,
    getTenantUserById,
    getTenantUserMemberOf,
    getTenantUserAppRoleAssignments,
    deleteUsers,
    createUser,

    //Groups
    getGroupsPreview,
    getAllGroups,
    getTenantGroupById,
    getTenantGroupMembers,
    getTenantGroupOwners,
    getTenantGroupDirectoryRoles,
    getTenantGroupAppRoleAssignments,
    deleteGroups,
    createGroup,
    addOwnersToGroup,
    addMembersToGroup,

    // Apps
    getAppsPreview,
    getAllApps,
    getTenantAppById,
    getTenantAppOwners,
    getTenantAppRoleAssignments,
    getApplicationByAppId,
    getFederatedIdentityCredentials,
    getAllAppRegistrations,
    resolveApplicationPermissions,

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
        const appsPreview = await getAppsPreview(accessToken, 5);

        // 3. Renderitzar la vista passant les dades
        res.render('tenantExplorer/tenantExplorer', {
            title: 'Tenant Explorer · EntraSecure',
            user: account,
            usersPreview,
            groupsPreview,
            appsPreview,
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

// Afegir owners a un grup existent (des del detall del grup)
router.post('/tenant/groups/:id/owners/add', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);
        const groupId = req.params.id;

        const { ownerKeys } = req.body; // un string "upn1,upn2" o un sol valor

        const keys = (ownerKeys || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (keys.length > 0) {
            await addOwnersToGroup(accessToken, groupId, keys);
        }

        res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
    } catch (err) {
        console.error('Error afegint owners al grup:', err);
        res.status(500).send('No s\'ha pogut afegir owners al grup');
    }
});


// Afegir members a un grup existent (des del detall del grup)
router.post('/tenant/groups/:id/members/add', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);
        const groupId = req.params.id;

        const { memberKeys } = req.body; // string "upn1,upn2" o un sol valor

        const keys = (memberKeys || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (keys.length > 0) {
            await addMembersToGroup(accessToken, groupId, keys);
        }

        res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
    } catch (err) {
        console.error('Error afegint members al grup:', err);
        res.status(500).send('No s\'ha pogut afegir members al grup');
    }
});


// Detall d'un user concret del tenant
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

        // Llegim tots els grups i tots els usuaris del tenant
        const [groups, users] = await Promise.all([
            getAllGroups(accessToken),
            getAllUsers(accessToken),
        ]);

        res.render('tenantExplorer/groups', {
            title: 'Tenant groups',
            user: account,  // per la navbar
            groups,
            users,          // 👈 molt important: això és el que feia falta
        });
    } catch (err) {
        console.error('Error carregant /tenant/groups:', err);
        res.status(500).send('Error carregant els grups del tenant');
    }
});



// POST /tenant/groups/create -> crear un nou grup
router.post('/tenant/groups/create', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { displayName, description, groupType, ownerUpns } = req.body;

        // 1) Validacions bàsiques de camps obligatoris
        if (!displayName || !groupType || !description) {
            return res
                .status(400)
                .send('Cal indicar el nom del grup, la justificació i el tipus de grup.');
        }

        // 2) Processar la llista d’owners del formulari
        const ownerList = (ownerUpns || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        if (ownerList.length === 0) {
            // No han afegit cap owner manualment
            return res
                .status(400)
                .send('Cal indicar com a mínim un owner del grup.');
        }

        // 3) Calcular mailNickname a partir del nom
        const slug = displayName
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')         // espais -> guions
            .replace(/[^a-z0-9-]/g, '');  // només lletres, números i guió

        const mailNickname = slug || `group-${Date.now()}`;

        // 4) Construir objecte de grup per Graph
        let groupObject;

        if (groupType === 'm365') {
            // Microsoft 365 group (Unified)
            groupObject = {
                displayName,
                description: description || undefined,
                groupTypes: ['Unified'],
                mailEnabled: true,
                securityEnabled: false,
                mailNickname,
            };
        } else {
            // Security group
            groupObject = {
                displayName,
                description: description || undefined,
                mailEnabled: false,
                securityEnabled: true,
                mailNickname,
            };
        }

        // 5) Crear el grup
        const createdGroup = await createGroup(accessToken, groupObject);
        const groupId = createdGroup && createdGroup.id;

        // 6) Afegir owners indicats al formulari
        if (groupId && ownerList.length > 0) {
            await addOwnersToGroup(accessToken, groupId, ownerList);
        }

        res.redirect('/tenant/groups');
    } catch (err) {
        console.error('Error a /tenant/groups/create:', err);
        res.status(500).send('Error creant el grup');
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


// Detall d'un grup concret del tenant
router.get('/tenant/groups/:id', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);
        const groupId = req.params.id;

        const groupProfile = await getTenantGroupById(accessToken, groupId);
        const members = await getTenantGroupMembers(accessToken, groupId);
        const owners = await getTenantGroupOwners(accessToken, groupId);
        const directoryRoles = await getTenantGroupDirectoryRoles(accessToken, groupId);
        const appAssignments = await getTenantGroupAppRoleAssignments(accessToken, groupId);
        const users = await getAllUsers(accessToken);

        const helpfulInfo =
            'Aquesta vista mostra informació bàsica del grup, els seus membres, ' +
            'owners, rols de directori on el grup actua com a administrador i les aplicacions ' +
            'on té app roles assignats.';

        res.render('tenantExplorer/groupIdentity', {
            title: `Group · ${groupProfile.displayName || 'Detall'}`,
            user: account,          // usuari logat (navbar)
            groupProfile,
            members,
            owners,
            directoryRoles,
            appAssignments,
            helpfulInfo,
            users,
        });
    } catch (err) {
        console.error('Error carregant /tenant/groups/:id:', err);
        res.status(500).send('Error carregant el detall del grup');
    }
});


// Treure un member d'un grup
router.post('/tenant/groups/:groupId/members/:memberId/remove', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { groupId, memberId } = req.params;

        // DELETE /groups/{id}/members/{id}/$ref
        await callGraphDELETE(
            `/groups/${groupId}/members/${memberId}/$ref`,
            accessToken
        );

        res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
    } catch (err) {
        console.error("Error eliminant member:", err);
        res.status(500).send("No s'ha pogut eliminar el member del grup");
    }
});


// Treure un owner d'un grup
router.post('/tenant/groups/:groupId/owners/:ownerId/remove', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { groupId, ownerId } = req.params;

        // DELETE /groups/{id}/owners/{id}/$ref
        await callGraphDELETE(
            `/groups/${groupId}/owners/${ownerId}/$ref`,
            accessToken
        );

        res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
    } catch (err) {
        console.error("Error eliminant owner:", err);
        res.status(500).send("No s'ha pogut eliminar l'owner del grup");
    }
});



/* -- APPS -- */

// GET /tenant/apps -> llista de totes les apps (service principals) del tenant
router.get('/tenant/apps', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const [apps, appRegistrations] = await Promise.all([
            getAllApps(accessToken),
            getAllAppRegistrations(accessToken),
        ]);

        // llista d'appId que tenen app registration al tenant
        const myAppIds = (appRegistrations || []).map(a => a.appId);

        res.render('tenantExplorer/apps', {
            title: 'Aplicacions del tenant',
            user: account,
            apps,
            myAppIds,
        });
    } catch (err) {
        console.error('Error carregant /tenant/apps:', err);
        res.status(500).send('Error carregant les aplicacions del tenant');
    }
});


// GET /tenant/apps/:id -> detall d'una app (service principal + application)
router.get('/tenant/apps/:id', requireAuth, async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);
        const spId = req.params.id;

        const sp = await getTenantAppById(accessToken, spId);
        const owners = await getTenantAppOwners(accessToken, spId);
        const assignments = await getTenantAppRoleAssignments(accessToken, spId);

        // Lligar-ho amb l'application (app registration) per veure appRoles, secrets, etc.
        const appRegistration = sp.appId
            ? await getApplicationByAppId(accessToken, sp.appId)
            : null;

        let federatedCreds = [];
        if (appRegistration && appRegistration.id) {
            federatedCreds = await getFederatedIdentityCredentials(accessToken, appRegistration.id);
        }

        // permisos amb noms
        let resolvedPermissions = [];
        if (
            appRegistration &&
            Array.isArray(appRegistration.requiredResourceAccess) &&
            appRegistration.requiredResourceAccess.length > 0
        ) {
            resolvedPermissions = await resolveApplicationPermissions(
                accessToken,
                appRegistration.requiredResourceAccess
            );
        }

        const helpfulInfo = `
Aquesta vista mostra la identitat d'una aplicació dins del tenant de Microsoft Entra ID,
incloent-hi informació bàsica del service principal (Enterprise app), els seus owners, 
els usuaris i grups amb app roles assignats i els tipus de credencial que utilitza 
(secrets, certificats o federated credentials).
`.trim();

        res.render('tenantExplorer/appIdentity', {
            title: `App · ${sp.displayName || sp.appId}`,
            user: account,
            servicePrincipal: sp,
            owners,
            assignments,
            appRegistration,
            federatedCreds,
            resolvedPermissions,
            helpfulInfo,
        });
    } catch (err) {
        console.error('Error carregant /tenant/apps/:id:', err);
        res.status(500).send('Error carregant el detall de l\'aplicació');
    }
});


module.exports = router;
