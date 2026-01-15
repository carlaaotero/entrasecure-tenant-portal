// La ruta pel mòdul "Tenant Explorer"
const express = require('express');
const router = express.Router();

const { getTokenForGraph } = require('../auth/AuthProvider');
const { callGraphDELETE, callGraph, callGraphPOST } = require('../controllers/graphController');
const { requireRole, requireAuth } = require('../middleware/rbac'); // Middleware per protegir rutes: si no hi ha sessió, envia a login
const { PRIVILEGED_DIRECTORY_ROLE_KEYWORDS } = require('../controllers/securityController');
const { handleRouteError } = require('../errors/graphErrorHandler');
const { ERROR_MESSAGES } = require('../errors/errorCatalog');
const { UI_MESSAGES } = require('../messages/uiMessages');


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
    addOwnersToApp,
    addUsersToApp,

    // Roles
    getDirectoryRoles,
    getDirectoryRoleTemplates,
    getDirectoryRoleById,
    getDirectoryRoleMembers,
    addUserToDirectoryRole,
    activateDirectoryRole,

} = require('../controllers/tenantController');

function consumeFlash(req) {
    const flash = req.session.flash || null;
    req.session.flash = null;
    return flash;
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
            title: UI_MESSAGES.TITLES.TENANT_HOME,
            user: account,
            usersPreview,
            groupsPreview,
            appsPreview,
        });

    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'tenant.home',
            redirectTo: '/tenant',
        });
    }
});


/* -- USERS -- */

// GET /tenant/users -> vista completa de tots els usuaris del tenant
router.get('/tenant/users', requireRole('Portal.UserAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const users = await getAllUsers(accessToken);

        res.render('tenantExplorer/users', {
            title: UI_MESSAGES.TITLES.USERS_LIST,
            user: account,
            users,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'users.list',
            redirectTo: '/tenant/users',
        });
    }
});


// Detall d'un user concret del tenant
router.get('/tenant/users/:id', requireRole('Portal.UserAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
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

        const helpfulInfo = UI_MESSAGES.HELP.USER_IDENTITY;

        res.render('tenantExplorer/userIdentity', {
            title: UI_MESSAGES.TITLES.USER_DETAIL(userProfile.displayName || userProfile.userPrincipalName),
            user: account,        // usuari logat (per la navbar)
            userProfile,          // usuari seleccionat
            groups,
            roles,
            apps,
            helpfulInfo,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'users.read',
            redirectTo: '/tenant/users',
        });
    }
});


// POST /tenant/users/create -> crear un usuari
router.post('/tenant/users/create', requireRole('Portal.UserAdmin'), async (req, res) => {
    const { displayName, userPrincipalName, password } = req.body;

    if (!displayName || !userPrincipalName || !password) {
        req.session.flash = { type: 'error', message: ERROR_MESSAGES.USERS_CREATE_MISSING_FIELDS };
        return res.redirect('/tenant/users');
    }

    try {

        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const newUser = {
            accountEnabled: true,
            displayName,
            mailNickname: displayName.replace(/\s+/g, ''),
            userPrincipalName,
            userType: 'Member',
            passwordProfile: {
                forceChangePasswordNextSignIn: true,
                password,
            },
        };

        await createUser(accessToken, newUser);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.USERS_CREATED(displayName) };
        return res.redirect('/tenant/users');
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'users.create',
            redirectTo: '/tenant/users',
        });
    }
});


// POST /tenant/users/delete -> eliminar un o més usuaris seleccionats
router.post('/tenant/users/delete', requireRole('Portal.UserAdmin'), async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        let { userIds } = req.body;

        // Si no s'ha seleccionat cap usuari, simplement tornem a la llista
        if (!userIds) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.USERS_DELETE_NO_SELECTION };
            return res.redirect('/tenant/users');
        }

        const count = Array.isArray(userIds) ? userIds.length : 1;

        // userIds pot ser un string (1 usuari) o un array (varis usuaris)
        await deleteUsers(accessToken, userIds);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.USERS_DELETED(count) };
        return res.redirect('/tenant/users');
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'users.delete',
            redirectTo: '/tenant/users',
        });
    }
});



/* -- GROUPS -- */

// GET /tenant/groups -> vista completa de tots els groups del tenant
router.get('/tenant/groups', requireRole('Portal.GroupAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        // Llegim tots els grups i tots els usuaris del tenant
        const [groups, users] = await Promise.all([
            getAllGroups(accessToken),
            getAllUsers(accessToken),
        ]);

        res.render('tenantExplorer/groups', {
            title: UI_MESSAGES.TITLES.GROUPS_LIST,
            user: account,  // per la navbar
            groups,
            users,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'groups.list',
            redirectTo: '/tenant/groups',
        });
    }
});


// Detall d'un grup concret del tenant
router.get('/tenant/groups/:id', requireRole('Portal.GroupAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
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

        const helpfulInfo = UI_MESSAGES.HELP.GROUP_IDENTITY;

        res.render('tenantExplorer/groupIdentity', {
            title: UI_MESSAGES.TITLES.GROUP_DETAIL(groupProfile.displayName),
            user: account,          // usuari logat (navbar)
            groupProfile,
            members,
            owners,
            directoryRoles,
            appAssignments,
            helpfulInfo,
            users,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'groups.read',
            redirectTo: '/tenant/groups',
        });
    }
});


// POST /tenant/groups/create -> crear un nou grup
router.post('/tenant/groups/create', requireRole('Portal.GroupAdmin'), async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { displayName, description, groupType, ownerUpns } = req.body;

        // 1) Validacions bàsiques de camps obligatoris
        if (!displayName || !groupType || !description) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.GROUPS_CREATE_MISSING_FIELDS };
            return res.redirect('/tenant/groups');
        }

        // 2) Processar la llista d’owners del formulari
        const ownerList = (ownerUpns || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        if (ownerList.length === 0) {
            // No han afegit cap owner manualment
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.GROUPS_CREATE_NO_OWNERS };
            return res.redirect('/tenant/groups');
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

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.GROUP_CREATED(displayName) };
        return res.redirect('/tenant/groups');
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'groups.create',
            redirectTo: '/tenant/groups',
        });
    }
});


// POST /tenant/groups/delete -> eliminar un o més groups seleccionats
router.post('/tenant/groups/delete', requireRole('Portal.GroupAdmin'), async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        let { groupIds } = req.body;

        // Si no s'ha seleccionat cap grup, simplement tornem a la llista
        if (!groupIds) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.GROUPS_DELETE_NO_SELECTION };
            return res.redirect('/tenant/groups');
        }

        const count = Array.isArray(groupIds) ? groupIds.length : 1;

        // groupIds pot ser un string (1 grup) o un array (varis grups)
        await deleteGroups(accessToken, groupIds);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.GROUPS_DELETED(count) };
        return res.redirect('/tenant/groups');
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'groups.delete',
            redirectTo: '/tenant/groups',
        });
    }
});


// Afegir owners a un grup existent (des del detall del grup)
router.post('/tenant/groups/:id/owners/add', requireRole('Portal.GroupAdmin'), async (req, res) => {
    const groupId = req.params.id;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { ownerKeys } = req.body; // un string "upn1,upn2" o un sol valor

        const keys = (ownerKeys || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (keys.length === 0) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.GROUPS_ADD_OWNERS_NO_SELECTION };
            return res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
        }

        await addOwnersToGroup(accessToken, groupId, keys);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.GROUP_OWNERS_ADDED };
        return res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'groups.owners.add',
            redirectTo: `/tenant/groups/${encodeURIComponent(groupId)}`,
        });
    }
});


// Afegir members a un grup existent (des del detall del grup)
router.post('/tenant/groups/:id/members/add', requireRole('Portal.GroupAdmin'), async (req, res) => {
    const groupId = req.params.id;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { memberKeys } = req.body; // string "upn1,upn2" o un sol valor

        const keys = (memberKeys || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (keys.length === 0) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.GROUPS_ADD_MEMBERS_NO_SELECTION };
            return res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
        }

        await addMembersToGroup(accessToken, groupId, keys);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.GROUP_MEMBERS_ADDED };
        return res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'groups.members.add',
            redirectTo: `/tenant/groups/${encodeURIComponent(groupId)}`,
        });
    }
});


// Treure un member d'un grup
router.post('/tenant/groups/:groupId/members/:memberId/remove', requireRole('Portal.GroupAdmin'), async (req, res) => {
    const { groupId, memberId } = req.params;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        await callGraphDELETE(
            `/groups/${groupId}/members/${memberId}/$ref`,
            accessToken
        );
        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.GROUP_MEMBER_REMOVED };
        return res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'groups.members.remove',
            redirectTo: `/tenant/groups/${encodeURIComponent(groupId)}`,
        });
    }
});


// Treure un owner d'un grup
router.post('/tenant/groups/:groupId/owners/:ownerId/remove', requireRole('Portal.GroupAdmin'), async (req, res) => {
    const { groupId, ownerId } = req.params;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        await callGraphDELETE(
            `/groups/${groupId}/owners/${ownerId}/$ref`,
            accessToken
        );

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.GROUP_OWNER_REMOVED };
        return res.redirect(`/tenant/groups/${encodeURIComponent(groupId)}`);
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'groups.owners.remove',
            redirectTo: `/tenant/groups/${encodeURIComponent(groupId)}`,
        });
    }
});



/* -- APPS -- */

// GET /tenant/apps -> llista de totes les apps (service principals) del tenant
router.get('/tenant/apps', requireRole('Portal.AppAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
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
            title: UI_MESSAGES.TITLES.APPS_LIST,
            user: account,
            apps,
            myAppIds,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'apps.list',
            redirectTo: '/tenant/apps',
        });
    }
});


// GET /tenant/apps/:id -> detall d'una app (service principal + application)
router.get('/tenant/apps/:id', requireRole('Portal.AppAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);
        const spId = req.params.id;

        const sp = await getTenantAppById(accessToken, spId);
        const owners = await getTenantAppOwners(accessToken, spId);
        const users = await getAllUsers(accessToken);
        const assignments = await getTenantAppRoleAssignments(accessToken, spId);

        const ssoMode = (sp.preferredSingleSignOnMode || '').toLowerCase(); // per trobar l'Authentication Protocol

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

        let authProtocolLabel = UI_MESSAGES.LABELS.AUTH_PROTOCOL.OTHER;

if (ssoMode === 'saml') {
  authProtocolLabel = UI_MESSAGES.LABELS.AUTH_PROTOCOL.SAML;
} else if (appRegistration) {
  authProtocolLabel = UI_MESSAGES.LABELS.AUTH_PROTOCOL.OIDC;
}


        const helpfulInfo = UI_MESSAGES.HELP.APP_IDENTITY;

        res.render('tenantExplorer/appIdentity', {
            title:UI_MESSAGES.TITLES.APP_DETAIL(sp.displayName || sp.appId ),
            user: account,
            servicePrincipal: sp,
            owners,
            assignments,
            appRegistration,
            federatedCreds,
            resolvedPermissions,
            helpfulInfo,
            authProtocolLabel,
            users,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'apps.read',
            redirectTo: '/tenant/apps',
        });
    }
});


// Afegir owners a una app (des del detall)
router.post('/tenant/apps/:id/owners/add', requireRole('Portal.AppAdmin'), async (req, res) => {
    const spId = req.params.id;

    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { ownerKeys } = req.body; // "upn1,upn2"
        const keys = (ownerKeys || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (keys.length === 0) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.APP_NO_OWNER_SELECTED }
            return res.redirect(`/tenant/apps/${encodeURIComponent(spId)}`);
        }

        await addOwnersToApp(accessToken, spId, keys);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.APP_OWNERS_ADDED };
        return res.redirect(`/tenant/apps/${encodeURIComponent(spId)}`);
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'apps.owners.add',
            redirectTo: `/tenant/apps/${encodeURIComponent(spId)}`,
        });
    }
});


// Treure un owner d'una app
router.post('/tenant/apps/:spId/owners/:ownerId/remove', requireRole('Portal.AppAdmin'), async (req, res) => {
    const { spId, ownerId } = req.params;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        await callGraphDELETE(
            `/servicePrincipals/${spId}/owners/${ownerId}/$ref`,
            accessToken
        );

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.APP_OWNER_REMOVED };
        return res.redirect(`/tenant/apps/${encodeURIComponent(spId)}`);
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'apps.owners.remove',
            redirectTo: `/tenant/apps/${encodeURIComponent(spId)}`,
        });
    }
});


// Afegir usuaris assignats a una app (appRoleAssignedTo)
router.post('/tenant/apps/:id/assignments/add', requireRole('Portal.AppAdmin'), async (req, res) => {
    const spId = req.params.id;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { assignmentKeys } = req.body;
        const keys = (assignmentKeys || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (keys.length === 0) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.APP_NO_ASSIGNEE_SELECTED };
            return res.redirect(`/tenant/apps/${encodeURIComponent(spId)}`);
        }

        await addUsersToApp(accessToken, spId, keys);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.APP_ASSIGNMENTS_ADDED };
        return res.redirect(`/tenant/apps/${encodeURIComponent(spId)}`);
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'apps.assignments.add',
            redirectTo: `/tenant/apps/${encodeURIComponent(spId)}`,
        });
    }
});


// Treure un o més usuaris d'una app (id de appRoleAssignedTo)
router.post('/tenant/apps/:spId/assignments/:assignmentId/remove', requireRole('Portal.AppAdmin'), async (req, res) => {
    const { spId, assignmentId } = req.params;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        await callGraphDELETE(
            `/servicePrincipals/${spId}/appRoleAssignedTo/${assignmentId}`,
            accessToken
        );

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.APP_ASSIGNMENT_REMOVED };
        return res.redirect(`/tenant/apps/${encodeURIComponent(spId)}`);
    } catch (err) {
        return handleRouteError({
            req,
            res,
            err,
            actionKey: 'apps.assignments.remove',
            redirectTo: `/tenant/apps/${encodeURIComponent(spId)}`,
        });
    }
});


/* -- ROLES (Directory Roles) -- */

// GET /tenant/roles
router.get('/tenant/roles', requireRole('Portal.RoleAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        // 0) Portal appId (App Registration del teu portal)
        const portalAppId = process.env.AZURE_CLIENT_ID;

        // 1) Busquem el service principal del portal (Enterprise Application)
        const spJson = await callGraph(
            `/servicePrincipals?$filter=appId eq '${portalAppId}'&$select=id,displayName,appRoles`,
            accessToken
        );

        const portalSp = spJson.value?.[0] || null;

        // 2) Construïm portalRoles AMB ID REAL (GUID)
        const portalRoles = (portalSp?.appRoles || [])
            .filter(r => r.isEnabled)
            .filter(r => (r.allowedMemberTypes || []).includes('User')) // important: assignació a usuaris
            .map(r => ({
                id: r.id, // això evita "undefined"
                key: r.value || r.displayName || UI_MESSAGES.LABELS.UNNAMED,
                description: r.description || '',
                displayName: r.displayName || r.value || ''
            }));

        // 3) Marcar Portal Roles privilegiats (RBAC intern)
        const portalPrivilegedValues = new Set([
            'Portal.TenantAdmin',
            'Portal.RoleAdmin',
        ]);

        const portalRolesWithFlags = (portalRoles || []).map(r => ({
            ...r,
            isPrivileged: portalPrivilegedValues.has(r.key) || portalPrivilegedValues.has(r.displayName),
        }));

        const directoryRolesRaw = await getDirectoryRoles(accessToken);

        const directoryRoles = (directoryRolesRaw || []).map(r => {
            const name = (r.displayName || '').toLowerCase();
            const isPrivileged = (PRIVILEGED_DIRECTORY_ROLE_KEYWORDS || [])
                .some(k => name.includes(k.toLowerCase()));
            return { ...r, isPrivileged };
        });

        const roleTemplates = await getDirectoryRoleTemplates(accessToken);

        res.render('tenantExplorer/roles', {
            title: UI_MESSAGES.TITLES.ROLES_LIST,
            user: account,
            directoryRoles,
            roleTemplates,
            portalRoles: portalRolesWithFlags,
            portalSp,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req, res, err,
            actionKey: 'roles.list',
            redirectTo: '/tenant/roles',
        });
    }
});


router.get('/tenant/roles/:id', requireRole('Portal.RoleAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);
        const roleId = req.params.id;

        const role = await getDirectoryRoleById(accessToken, roleId);
        const members = await getDirectoryRoleMembers(accessToken, roleId);
        const users = await getAllUsers(accessToken);

        res.render('tenantExplorer/roleIdentity', {
            title: UI_MESSAGES.TITLES.ROLE_DETAIL((role && role.displayName) ? role.displayName : roleId),
            user: account,
            role,
            members,
            users,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req, res, err,
            actionKey: 'roles.read',
            redirectTo: '/tenant/roles',
        });
    }
});


router.post('/tenant/roles/:roleId/members/add', requireRole('Portal.RoleAdmin'), async (req, res) => {
    const roleId = req.params.roleId;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const { memberKeys } = req.body;

        const keys = (memberKeys || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (keys.length === 0) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.ROLES_ADD_MEMBERS_NO_SELECTION };
            return res.redirect(`/tenant/roles/${encodeURIComponent(roleId)}`);
        }

        for (const key of keys) {
            // Resol UPN o ID -> objectId
            const userRes = await callGraph(`/users/${encodeURIComponent(key)}?$select=id`, accessToken);
            const userId = userRes && userRes.id;
            if (!userId) continue;

            await addUserToDirectoryRole(accessToken, roleId, userId);
        }

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.ROLE_MEMBERS_ADDED };
        return res.redirect(`/tenant/roles/${encodeURIComponent(roleId)}`);
    } catch (err) {
        return handleRouteError({
            req, res, err,
            actionKey: 'roles.members.add',
            redirectTo: `/tenant/roles/${encodeURIComponent(roleId)}`,
        });
    }
});


router.post('/tenant/roles/:roleId/members/:memberId/remove', requireRole('Portal.RoleAdmin'), async (req, res) => {
    const { roleId, memberId } = req.params;
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);



        await callGraphDELETE(
            `/directoryRoles/${roleId}/members/${memberId}/$ref`,
            accessToken
        );

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.ROLE_MEMBER_REMOVED };
        return res.redirect(`/tenant/roles/${encodeURIComponent(roleId)}`);
    } catch (err) {
        return handleRouteError({
            req, res, err,
            actionKey: 'roles.members.remove',
            redirectTo: `/tenant/roles/${encodeURIComponent(roleId)}`,
        });
    }
});

router.post('/tenant/roles/activate', requireRole('Portal.RoleAdmin'), async (req, res) => {
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);
        const { templateId } = req.body;

        await activateDirectoryRole(accessToken, templateId);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.ROLE_ACTIVATED };
        return res.redirect('/tenant/roles');
    } catch (err) {
        const msg = (err.message || '').toLowerCase();

        // cas “no activable”
        if (msg.includes('implicit user role')) {
            req.session.flash = { type: 'info', message: UI_MESSAGES.INFO.ROLE_IMPLICIT_USER_ROLE };
            return res.redirect('/tenant/roles');
        }

        req.session.flash = { type: 'error', message: ERROR_MESSAGES.ROLES_ACTIVATE_FAILED };
        return res.redirect('/tenant/roles');
    }
});


/* -- PORTAL ROLES (App Roles) -- */

// GET /tenant/roles/portal/:appRoleId
router.get('/tenant/roles/portal/:appRoleId', requireRole('Portal.RoleAdmin'), async (req, res) => {
    const flash = consumeFlash(req);
    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const portalAppId = process.env.AZURE_CLIENT_ID;

        // 1) Portal service principal
        const spJson = await callGraph(
            `/servicePrincipals?$filter=appId eq '${portalAppId}'&$select=id,displayName,appRoles`,
            accessToken
        );
        const portalSp = spJson.value?.[0];
        if (!portalSp) throw new Error(ERROR_MESSAGES.PORTAL_SERVICE_PRINCIPAL_NOT_FOUND);

        // 2) Role seleccionat
        const appRoleId = req.params.appRoleId;
        const role = (portalSp.appRoles || []).find(r => r.id === appRoleId);
        if (!role) return res.status(404).send(ERROR_MESSAGES.ROLES_PORTAL_NOT_FOUND);

        // 3) Assignacions (només Users)
        const asgJson = await callGraph(
            `/servicePrincipals/${portalSp.id}/appRoleAssignedTo?$select=id,principalId,principalType,principalDisplayName,appRoleId`,
            accessToken
        );

        const assignments = (asgJson.value || [])
            .filter(a => a.appRoleId === appRoleId)
            .filter(a => a.principalType === 'User');

        // 4) Llista d'usuaris per dropdown
        const users = await getAllUsers(accessToken);

        const helpfulInfo = UI_MESSAGES.HELP.PORTAL_ROLE_IDENTITY;

        res.render('tenantExplorer/portalRoleIdentity', {
            title: UI_MESSAGES.TITLES.PORTAL_ROLE_DETAIL(role.displayName || role.value),
            user: account,
            portalSp,
            role,
            assignments,
            users,
            helpfulInfo,
            flash,
        });
    } catch (err) {
        return handleRouteError({
            req, res, err,
            actionKey: 'roles.portal.read',
            redirectTo: '/tenant/roles',
        });
    }
});


// POST /tenant/roles/portal/:appRoleId/assignments/add
router.post('/tenant/roles/portal/:appRoleId/assignments/add', requireRole('Portal.RoleAdmin'), async (req, res) => {
    const { appRoleId } = req.params;

    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const portalAppId = process.env.AZURE_CLIENT_ID;

        const spJson = await callGraph(
            `/servicePrincipals?$filter=appId eq '${portalAppId}'&$select=id`,
            accessToken
        );
        const portalSp = spJson.value?.[0];
        if (!portalSp) throw new Error(ERROR_MESSAGES.PORTAL_SERVICE_PRINCIPAL_NOT_FOUND);

        // Hidden field: "id1,id2,id3"
        const raw = req.body.userIds || '';
        const userIds = raw.split(',').map(s => s.trim()).filter(Boolean);

        if (userIds.length === 0) {
            req.session.flash = { type: 'info', message: ERROR_MESSAGES.ROLES_PORTAL_ASSIGN_NO_SELECTION };
            return res.redirect(`/tenant/roles/portal/${encodeURIComponent(appRoleId)}`);
        }

        for (const uid of userIds) {
            await callGraphPOST(`/servicePrincipals/${portalSp.id}/appRoleAssignedTo`, accessToken, {
                principalId: uid,         // USER objectId
                resourceId: portalSp.id,  // portal service principal id
                appRoleId: appRoleId,     // role id
            });
        }



        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.PORTAL_USERS_ASSIGNED };
        return res.redirect(`/tenant/roles/portal/${encodeURIComponent(appRoleId)}`);
    } catch (err) {
        return handleRouteError({
            req, res, err,
            actionKey: 'roles.portal.assign.add',
            redirectTo: `/tenant/roles/portal/${encodeURIComponent(appRoleId)}`,
        });
    }
});


// POST /tenant/roles/portal/:appRoleId/assignments/:assignmentId/remove
router.post('/tenant/roles/portal/:appRoleId/assignments/:assignmentId/remove', requireRole('Portal.RoleAdmin'), async (req, res) => {
    const { appRoleId, assignmentId } = req.params;

    try {
        const account = req.session.user;
        const accessToken = await getTokenForGraph(account);

        const portalAppId = process.env.AZURE_CLIENT_ID;

        const spJson = await callGraph(
            `/servicePrincipals?$filter=appId eq '${portalAppId}'&$select=id`,
            accessToken
        );
        const portalSp = spJson.value?.[0];
        if (!portalSp) throw new Error(ERROR_MESSAGES.PORTAL_SERVICE_PRINCIPAL_NOT_FOUND);

        await callGraphDELETE(`/servicePrincipals/${portalSp.id}/appRoleAssignedTo/${assignmentId}`, accessToken);

        req.session.flash = { type: 'success', message: UI_MESSAGES.FLASH.PORTAL_ASSIGNMENT_REMOVED };
        return res.redirect(`/tenant/roles/portal/${encodeURIComponent(appRoleId)}`);
    } catch (err) {
        return handleRouteError({
            req, res, err,
            actionKey: 'roles.portal.assign.remove',
            redirectTo: `/tenant/roles/portal/${encodeURIComponent(appRoleId)}`,
        });
    }
});



module.exports = router;
