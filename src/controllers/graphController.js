/**
 * graphController.js
 * ------------------
 * Wrapper genèric per fer crides a Microsoft Graph (v1.0) utilitzant node-fetch.
 *
 * Objectius:
 *  - Centralitzar el "boilerplate" (headers, base URL, logs, gestió d'errors)
 *  - Proporcionar helpers reutilitzables per:
 *      - GET (callGraph)
 *      - POST (callGraphPOST)
 *      - DELETE (callGraphDELETE)
 *  - Incloure funcions específiques per la secció "My Identity" (/me)
 *
 * IMPORTANT:
 *  - Aquest mòdul NO decideix autorització / RBAC.
 *  - Si Graph retorna 403/401, aquí es llença un error i la ruta el tracta
 *    amb el sistema de "flash + redirect" (graphErrorHandler).
 */

const fetch = require('node-fetch');

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

// Crida genèrica GET a Microsoft Graph amb un accessToken vàlid
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

  // Gestió d'errors: si Graph no retorna 2xx, llancem una excepció amb el body (el tractament UX es farà a la capa de routes amb graphErrorHandler)
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph call failed (${url}): ${response.status} ${text}`);
  }

  const json = await response.json();

  // Logs útils per debugging: si és col·lecció, mostrem la longitud; si és objecte, el contingut
  if (Array.isArray(json.value)) {
    console.log('[GRAPH] resposta té', json.value.length, 'elements');
  } else {
    console.log('[GRAPH] resposta objecte:', JSON.stringify(json, null, 2));
  }

  return json;
}

// Crida genèrica POST a Microsoft Graph
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


  // Cas habitual: 204 No Content
  if (response.status === 204) {
    return true;
  }

  // Alguns endpoints poden retornar body buit tot i ser 200/201
  const text = await response.text();
  if (!text) {
    return true;
  }

  // Si hi ha contingut, intentem parsejar JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    // Últim recurs: retornem el text per debugging
    return { raw: text };
  }

}



// Crida genèrica DELETE a Microsoft Graph
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

  return true;
}


/* -------------------------------------------------------------------------- */
/*                             MY IDENTITY (/me)                              */
/* -------------------------------------------------------------------------- */

// Selecció de propietats de /me que s'utilitzen a My Identity
const PROFILE_SELECT = [
  'id',
  'displayName',
  'userPrincipalName',
  'userType',
  'createdDateTime',
  'mailNickname',
  'lastPasswordChangeDateTime'
].join(',');


//Retorna l'objecte princiàñ de l'usuari autenticat (/me)
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



module.exports = {
  // Wrappers genèrics Graph
  callGraph,
  callGraphDELETE,
  callGraphPOST,

  //My Identity
  getUserIdentity,
  getUserMemberOf,
  getUserAppRoleAssignments,
  getUserDevices,
};
