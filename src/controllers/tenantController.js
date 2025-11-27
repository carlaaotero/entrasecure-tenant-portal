const { callGraph } = require('./graphController');

// ======================
// USERS
// ======================
async function getUsersPreview(accessToken, top = 5) {
    const endpoint = `/users?$select=id,displayName,userPrincipalName,userType&$top=${top}`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
}

async function getAllUsers(accessToken) {
    const endpoint = `/users?$select=id,displayName,userPrincipalName,userType,accountEnabled`;
    const json = await callGraph(endpoint, accessToken);
    return json.value || [];
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
