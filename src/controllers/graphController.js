const fetch = require('node-fetch');

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

//Cridar a Graph amb un accessToken vàlid
async function callGraph(endpoint, accessToken) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${GRAPH_BASE_URL}${endpoint}`;
  
  console.log('[GRAPH] GET', url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('[GRAPH] status', response.status, response.statusText);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph call failed (${url}): ${response.status} ${text}`);
  }
  
  const json = await response.json();

  //només mostrem la longitud:
  if (Array.isArray(json.value)) {
    console.log('[GRAPH] resposta té', json.value.length, 'elements');
  } else {
    console.log('[GRAPH] resposta objecte:', JSON.stringify(json, null, 2));
  }

  return json;
  //return await response.json();
}

// Propietats que volem del /me
const PROFILE_SELECT = [
  'id',
  'displayName',
  'userPrincipalName',
  'userType',
  'createdDateTime',
  'mailNickname',
  'lastPasswordChangeDateTime'
].join(',');

//Retorna identity /me de Graph amb un accessToken vàlid
async function getUserIdentity(accessToken) {
  const endpoint = `/me?$select=${PROFILE_SELECT}`;
  const json = await callGraph(endpoint, accessToken);

  console.log('[GRAPH] /me (select) rebut:', JSON.stringify(json, null, 2));

  return json;
}


//Retorna els objectes dels quals l'usuari és membre (/me/memberOf). Aquí hi pot haver grups, directory roles, ...
async function getUserMemberOf(accessToken) {
  const json = await callGraph(
    '/me/memberOf?$select=displayName,id',
    accessToken
  );
  return json.value || [];
}


//Retorna les App Role Assignments de l'usuari (/me/appRoleAssignments). Serveix per veure a quines aplicacions té rols assignats.
async function getUserAppRoleAssignments(accessToken) {
  const json = await callGraph(
    '/me/appRoleAssignments?$select=id,resourceDisplayName,principalDisplayName,appRoleId',
    accessToken
  );
  return json.value || [];
}


//Retorna els dispositius registrats per l'usuari (/me/registeredDevices).
async function getUserDevices(accessToken) {
  const json = await callGraph(
    '/me/registeredDevices?$select=id,displayName',
    accessToken
  );
  return json.value || [];
}


/*
Retorna el perfil /me de Graph amb un accessToken vàlid
 */
/*async function getUserProfile(accessToken) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Graph /me failed: ${response.status} ${text}`);
    }

    return await response.json();
}*/

module.exports = {
  callGraph,

  //My Identity
  getUserIdentity,
  getUserMemberOf,
  getUserAppRoleAssignments,
  getUserDevices,
};
