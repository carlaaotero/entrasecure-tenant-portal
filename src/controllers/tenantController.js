const { callGraph, deleteFromGraph, callGraphPOST } = require('./graphController');

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
        await deleteFromGraph(endpoint, accessToken);
    }
}

// ======================
// GROUPS
// ======================
async function getGroupsPreview(accessToken, top = 5) {
    const endpoint = `/groups?$select=id,displayName,groupTypes&$top=${top}`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

async function getAllGroups(accessToken) {
    const endpoint = `/groups?$select=id,displayName,groupTypes`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
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
    /*
      // Roles
      getRolesPreview,
      getAllRoles,
    
      // Apps
      getAppsPreview,
      getAllApps,*/
};
