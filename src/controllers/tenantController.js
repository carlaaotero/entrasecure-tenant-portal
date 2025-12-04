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


// ======================
// APPS
// ======================
async function getAppsPreview(accessToken, top = 5) {
  const endpoint = `/servicePrincipals?$select=id,displayName,appId&$top=${top}`;
  const json = await callGraph(endpoint, accessToken);
  return json.value || [];
}

async function getAllApps(accessToken) {
  const endpoint = `/servicePrincipals?$select=id,displayName,appId`;
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

    /*
      // Roles
      getRolesPreview,
      getAllRoles,
    
      // Apps
      getAppsPreview,
      getAllApps,*/
};
