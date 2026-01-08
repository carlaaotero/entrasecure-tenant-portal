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

// Cridar a Graph amb POST
async function callGraphPOST(endpoint, accessToken, body) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${GRAPH_BASE_URL}${endpoint}`;

  console.log('[GRAPH] POST', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('[GRAPH] status', response.status, response.statusText);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph POST failed (${url}): ${response.status} ${errorBody}`);
  }

  //return await response.json();

  //Graph sovint retorna 204 No Content en POST ($ref, assignacions, etc.)
  if (response.status === 204) {
    return true;
  }

  //Alguns endpoints retornen body buit tot i status 200/201
  const text = await response.text();
  if (!text) {
    return true;
  }

  //Si hi ha contingut, intentem parsejar JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    // Últim recurs: retornem el text per debugging
    return { raw: text };
  }
  
}



// Cridar a Graph amb DELETE (per operacions com eliminar usuaris, grups)
async function callGraphDELETE(endpoint, accessToken) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${GRAPH_BASE_URL}${endpoint}`;

  console.log('[GRAPH] DELETE', url);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log('[GRAPH] status', response.status, response.statusText);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph DELETE failed (${url}): ${response.status} ${text}`);
  }

  // Normalment Graph retorna 204 No Content
  return true;
}


module.exports = {
  callGraph,
  callGraphDELETE,
  callGraphPOST,

  //My Identity
  getUserIdentity,
  getUserMemberOf,
  getUserAppRoleAssignments,
  getUserDevices,
};
