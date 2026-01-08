const { callGraph, callGraphDELETE, callGraphPOST } = require('./graphController');

// ======================
// USERS
// ======================
async function getUsersPreview(accessToken, top = 5) {
    const endpoint = `/users?$select=id,displayName,userPrincipalName,userType&$top=${top}`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

async function getAllUsers(accessToken) {
    const endpoint = `/users?$select=id,displayName,userPrincipalName,userType,accountEnabled`; // afegir ,signInActivity quan tingui llicència d'Entra ID
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

const USER_PROFILE_SELECT = [
    'id',
    'displayName',
    'userPrincipalName',
    'userType',
    'createdDateTime',
    'mailNickname',
    'lastPasswordChangeDateTime'
].join(',');

async function getTenantUserById(accessToken, userId) {
    const endpoint = `/users/${userId}?$select=${USER_PROFILE_SELECT}`;
    const json = await callGraph(endpoint, accessToken);
    return json;
}

async function getTenantUserMemberOf(accessToken, userId) {
    const endpoint = `/users/${userId}/memberOf?$select=displayName,id`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

async function getTenantUserAppRoleAssignments(accessToken, userId) {
    const endpoint = `/users/${userId}/appRoleAssignments?$select=id,resourceDisplayName,principalDisplayName,appRoleId`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

// Crear un usuari al tenant
async function createUser(accessToken, userObject) {
    const endpoint = "/users";
    return await callGraphPOST(endpoint, accessToken, userObject);
}


// Eliminar un o més usuaris del tenant
async function deleteUsers(accessToken, userIds) {
    if (!userIds) return;

    const ids = Array.isArray(userIds) ? userIds : [userIds];

    for (const id of ids) {
        const endpoint = `/users/${id}`;
        await callGraphDELETE(endpoint, accessToken);
    }
}

// ======================
// GROUPS
// ======================

const GROUP_PROFILE_SELECT = [
    'id',
    'displayName',
    'description',
    'groupTypes',
    'mail',
    'mailNickname',
    'createdDateTime',
    'securityEnabled',
    'mailEnabled',
    'visibility',
    'onPremisesSyncEnabled'
];

async function getGroupsPreview(accessToken, top = 5) {
    const endpoint = `/groups?$select=id,displayName,groupTypes,onPremisesSyncEnabled&$top=${top}`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

async function getAllGroups(accessToken) {
    const endpoint = `/groups?$select=id,displayName,groupTypes,onPremisesSyncEnabled`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}



// Crear un grup al tenant (Security o Microsoft 365)
async function createGroup(accessToken, userObject) {
    const endpoint = "/groups";
    return await callGraphPOST(endpoint, accessToken, userObject);
}

// Afegir owners a un grup a partir de UPN o ID
async function addOwnersToGroup(accessToken, groupId, ownerKeys) {
    if (!ownerKeys || !groupId) return;

    const keys = Array.isArray(ownerKeys) ? ownerKeys : [ownerKeys];

    for (const rawKey of keys) {
        const key = (rawKey || '').trim();
        if (!key) continue;

        try {
            // /users/{id | userPrincipalName} funciona
            const userRes = await callGraph(
                `/users/${encodeURIComponent(key)}?$select=id`,
                accessToken
            );
            const userId = userRes && userRes.id;
            if (!userId) continue;

            const body = {
                '@odata.id': `https://graph.microsoft.com/v1.0/users/${userId}`,
            };

            await callGraphPOST(
                `/groups/${groupId}/owners/$ref`,
                accessToken,
                body
            );
        } catch (err) {
            console.error(
                `No s'ha pogut afegir ${key} com a owner del grup ${groupId}:`,
                err.message || err
            );
        }
    }
}

// Afegir members (usuaris) a un grup a partir de UPN o ID
async function addMembersToGroup(accessToken, groupId, memberKeys) {
    if (!memberKeys || !groupId) return;

    const keys = Array.isArray(memberKeys) ? memberKeys : [memberKeys];

    for (const rawKey of keys) {
        const key = (rawKey || '').trim();
        if (!key) continue;

        try {
            // /users/{id | userPrincipalName} funciona igual que per owners
            const userRes = await callGraph(
                `/users/${encodeURIComponent(key)}?$select=id`,
                accessToken
            );
            const userId = userRes && userRes.id;
            if (!userId) continue;

            const body = {
                '@odata.id': `https://graph.microsoft.com/v1.0/users/${userId}`,
            };

            await callGraphPOST(
                `/groups/${groupId}/members/$ref`,
                accessToken,
                body
            );
        } catch (err) {
            console.error(
                `No s'ha pogut afegir ${key} com a member del grup ${groupId}:`,
                err.message || err
            );
        }
    }
}


// ----- Detall del grup -----

async function getTenantGroupById(accessToken, groupId) {
    const endpoint =
        `/groups/${groupId}?$select=${GROUP_PROFILE_SELECT.join(',')}`;
    const json = await callGraph(endpoint, accessToken);
    return json;
}

// Members del grup (només usuaris)
async function getTenantGroupMembers(accessToken, groupId) {
    const endpoint =
        `/groups/${groupId}/members?` +
        `$select=id,displayName,userPrincipalName,userType,accountEnabled`;
    const json = await callGraph(endpoint, accessToken);
    const items = json.value || [];

    // Ens quedem només amb objectes de tipus usuari
    return items.filter(m => {
        const t = (m['@odata.type'] || '').toLowerCase();
        return t.includes('user') || !t; // per si ve sense @odata.type
    });
}

// Owners del grup
async function getTenantGroupOwners(accessToken, groupId) {
    const endpoint =
        `/groups/${groupId}/owners?` +
        `$select=id,displayName,userPrincipalName,userType`;
    const json = await callGraph(endpoint, accessToken);
    const items = json.value || [];

    return items.filter(o => {
        const t = (o['@odata.type'] || '').toLowerCase();
        return t.includes('user') || !t;
    });
}

// Directory roles on el grup és membre (role-assignable group)
async function getTenantGroupDirectoryRoles(accessToken, groupId) {
    const endpoint =
        `/groups/${groupId}/memberOf?$select=id,displayName`;
    const json = await callGraph(endpoint, accessToken);
    const items = json.value || [];

    return items.filter(r => {
        const t = (r['@odata.type'] || '').toLowerCase();
        return t.includes('directoryrole');
    });
}

// App role assignments on el grup té rols sobre aplicacions
async function getTenantGroupAppRoleAssignments(accessToken, groupId) {
    const endpoint =
        `/groups/${groupId}/appRoleAssignments?` +
        `$select=id,resourceDisplayName,appRoleId,principalDisplayName,principalId,resourceId`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

// Eliminar un o més usuaris del tenant
async function deleteGroups(accessToken, groupIds) {
    if (!groupIds) return;

    const ids = Array.isArray(groupIds) ? groupIds : [groupIds];

    for (const id of ids) {
        const endpoint = `/groups/${id}`;
        await callGraphDELETE(endpoint, accessToken);
    }
}


// ======================
// APPS
// ======================

// Llista d'apps (Enterprise apps / service principals)
async function getAppsPreview(accessToken, top = 5) {
    const endpoint = `/servicePrincipals?$select=id,displayName,appId,servicePrincipalType,preferredSingleSignOnMode&$top=${top}`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

async function getAllApps(accessToken) {
    const endpoint = `/servicePrincipals?$select=id,displayName,appId,servicePrincipalType,preferredSingleSignOnMode`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

// Detall d'un service principal (Enterprise app)
async function getTenantAppById(accessToken, spId) {
    const endpoint = `/servicePrincipals/${spId}?$select=id,displayName,appId,servicePrincipalType,preferredSingleSignOnMode,createdDateTime`;
    const json = await callGraph(endpoint, accessToken);
    return json;
}

// Owners de l'app (service principal)
async function getTenantAppOwners(accessToken, spId) {
    const endpoint = `/servicePrincipals/${spId}/owners?$select=id,displayName,userPrincipalName,userType`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

// Assignacions de rols (qui té permisos sobre l'app)
async function getTenantAppRoleAssignments(accessToken, spId) {
    const endpoint =
        `/servicePrincipals/${spId}/appRoleAssignedTo?` +
        `$select=id,principalDisplayName,principalId,principalType,appRoleId,resourceId`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

// Aplicació (App registration) associada, via appId
async function getApplicationByAppId(accessToken, appId) {
    const endpoint =
        `/applications?$filter=appId eq '${appId}'` +
        `&$select=id,appId,displayName,createdDateTime,appRoles,requiredResourceAccess,passwordCredentials,keyCredentials`;
    const json = await callGraph(endpoint, accessToken);
    const apps = json.value || [];
    return apps[0] || null;
}

// Federated identity credentials (POTSER NO HO FARÉ SERVIR)
async function getFederatedIdentityCredentials(accessToken, applicationObjectId) {
    const endpoint = `/applications/${applicationObjectId}/federatedIdentityCredentials`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

// Llista d'app registrations del tenant (només appId + displayName)
async function getAllAppRegistrations(accessToken) {
    const endpoint = `/applications?$select=id,appId,displayName`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

// Dona noms humans als permisos de requiredResourceAccess
async function resolveApplicationPermissions(accessToken, requiredResourceAccess) {
    if (!requiredResourceAccess || !requiredResourceAccess.length) return [];

    const results = [];

    for (const ra of requiredResourceAccess) {
        const resourceAppId = ra.resourceAppId;
        const resourceAccess = ra.resourceAccess || [];

        if (!resourceAppId || resourceAccess.length === 0) continue;

        // 1) Trobar el service principal de l'API (p. ex. Microsoft Graph)
        const spJson = await callGraph(
            `/servicePrincipals?$filter=appId eq '${resourceAppId}'&$select=appId,displayName,oauth2PermissionScopes,appRoles`,
            accessToken
        );
        const apiSp = (spJson.value && spJson.value[0]) || null;
        if (!apiSp) continue;

        const scopes = apiSp.oauth2PermissionScopes || [];
        const roles = apiSp.appRoles || [];

        const perms = resourceAccess.map(perm => {
            let name = null;
            let displayName = null;
            let typeLabel = perm.type === 'Role' ? 'Application' : 'Delegated';

            if (perm.type === 'Scope') {
                const scope = scopes.find(s => s.id === perm.id);
                if (scope) {
                    name = scope.value;
                    displayName = scope.userConsentDisplayName;
                }
            } else if (perm.type === 'Role') {
                const role = roles.find(r => r.id === perm.id);
                if (role) {
                    name = role.value;
                    displayName = role.displayName;
                }
            }

            return {
                id: perm.id,
                rawType: perm.type,
                type: typeLabel,
                name: name || '(permís desconegut)',
                displayName,
            };
        });

        results.push({
            apiDisplayName: apiSp.displayName,
            apiAppId: apiSp.appId,
            permissions: perms,
        });
    }

    return results;
}

// Afegir owners a una Enterprise App (service principal) a partir de UPN o ID
async function addOwnersToApp(accessToken, spId, ownerKeys) {
    if (!ownerKeys || !spId) return;

    const keys = Array.isArray(ownerKeys) ? ownerKeys : [ownerKeys];

    for (const rawKey of keys) {
        const key = (rawKey || '').trim();
        if (!key) continue;

        try {
            // Resolem userId des de /users/{id | userPrincipalName}
            const userRes = await callGraph(
                `/users/${encodeURIComponent(key)}?$select=id`,
                accessToken
            );
            const userId = userRes && userRes.id;
            if (!userId) continue;

            const body = {
                '@odata.id': `https://graph.microsoft.com/v1.0/users/${userId}`,
            };

            // POST /servicePrincipals/{id}/owners/$ref
            await callGraphPOST(
                `/servicePrincipals/${spId}/owners/$ref`,
                accessToken,
                body
            );
        } catch (err) {
            console.error(
                `No s'ha pogut afegir ${key} com a owner de l'app ${spId}:`,
                err.message || err
            );
        }
    }
}


// Afegir usuaris assignats a una Enterprise App (appRoleAssignedTo)
// Per UX simple (com groups), assignem el "default app role" (GUID buit).
async function addUsersToApp(accessToken, spId, userKeys) {
    if (!userKeys || !spId) return;

    const keys = Array.isArray(userKeys) ? userKeys : [userKeys];

    for (const rawKey of keys) {
        const key = (rawKey || '').trim();
        if (!key) continue;

        try {
            const userRes = await callGraph(
                `/users/${encodeURIComponent(key)}?$select=id`,
                accessToken
            );
            const userId = userRes && userRes.id;
            if (!userId) continue;

            const body = {
                principalId: userId,
                resourceId: spId,
                // default appRole (equivalent a "Default Access" quan l'app no té roles)
                appRoleId: '00000000-0000-0000-0000-000000000000',
            };

            // POST /servicePrincipals/{id}/appRoleAssignedTo
            await callGraphPOST(
                `/servicePrincipals/${spId}/appRoleAssignedTo`,
                accessToken,
                body
            );
        } catch (err) {
            console.error(
                `No s'ha pogut assignar ${key} a l'app ${spId}:`,
                err.message || err
            );
        }
    }
}



/*
// ======================
// ROLES
// ======================
async function getRolesPreview(accessToken, top = 5) {
  const endpoint = `/directoryRoles?$select=id,displayName&$top=${top}`;
  const json = await callGraph(endpoint, accessToken);
  return json.value || [];
}

async function getAllRoles(accessToken) {
  const endpoint = `/directoryRoles?$select=id,displayName`;
  const json = await callGraph(endpoint, accessToken);
  return json.value || [];
}




*/
// ======================
// EXPORTS
// ======================
module.exports = {
    // Users
    getUsersPreview,
    getAllUsers,
    getTenantUserById,
    getTenantUserMemberOf,
    getTenantUserAppRoleAssignments,
    deleteUsers,
    createUser,

    // Groups
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
    /*
      // Roles
      getRolesPreview,
      getAllRoles, */


};
