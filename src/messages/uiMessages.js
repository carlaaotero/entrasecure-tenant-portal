// src/messages/uiMessages.js

const UI_MESSAGES = {
  TITLES: {
    HOME: "EntraSecure Tenant Portal",
    MY_IDENTITY: "My Identity · EntraSecure",
    TENANT_HOME: "Tenant Explorer · EntraSecure",
    USERS_LIST: "Usuaris del tenant",
    GROUPS_LIST: "Tenant groups",
    APPS_LIST: "Aplicacions del tenant",
    ROLES_LIST: "Roles",
    SECURITY_OVERVIEW: "Tenant Security Overview · EntraSecure",

    // dinàmics
    USER_DETAIL: (nameOrUpn) => `Usuari · ${nameOrUpn}`,
    GROUP_DETAIL: (name) => `Group · ${name || "Detall"}`,
    APP_DETAIL: (nameOrAppId) => `App · ${nameOrAppId}`,
    ROLE_DETAIL: (nameOrId) => `Role · ${nameOrId}`,
    PORTAL_ROLE_DETAIL: (nameOrValue) => `Portal role · ${nameOrValue}`,
  },

  LABELS: {
    AUTH_PROTOCOL: {
      OTHER: "Altres",
      SAML: "SAML",
      OIDC: "OIDC / OAuth2",
    },
    UNNAMED: "(Unnamed)",
    DEFAULT_ACCESS: "Default access",
  },

  FLASH: {
    LOGIN_SUCCESS: "Sessió iniciada correctament.",
    
    // USERS
    USERS_CREATED: (displayName) => `Usuari creat: ${displayName}`,
    USERS_DELETED: (count) => `Usuaris eliminats: ${count}`,

    // GROUPS
    GROUP_CREATED: (displayName) => `Grup creat: ${displayName}`,
    GROUPS_DELETED: (count) => `Grups eliminats: ${count}`,
    GROUP_OWNERS_ADDED: "Owners afegits correctament.",
    GROUP_MEMBERS_ADDED: "Members afegits correctament.",
    GROUP_MEMBER_REMOVED: "Member eliminat del grup.",
    GROUP_OWNER_REMOVED: "Owner eliminat del grup.",

    // APPS
    APP_OWNERS_ADDED: "Owners afegits a l'aplicació.",
    APP_OWNER_REMOVED: "Owner eliminat de l'aplicació.",
    APP_ASSIGNMENTS_ADDED: "Assignacions afegides a l'aplicació.",
    APP_ASSIGNMENT_REMOVED: "Assignació eliminada de l'aplicació.",

    // ROLES
    ROLE_MEMBERS_ADDED: "Membres afegits correctament.",
    ROLE_MEMBER_REMOVED: "Member eliminat del rol.",
    ROLE_ACTIVATED: "Rol activat correctament.",

    // PORTAL ROLES
    PORTAL_USERS_ASSIGNED: "Usuaris assignats correctament.",
    PORTAL_ASSIGNMENT_REMOVED: "Assignació eliminada.",
  },

  HELP: {
    MY_IDENTITY: `
Aquest apartat mostra informació bàsica de la identitat a Microsoft Entra ID
(per exemple, display name, UPN, tipus d'usuari i dates clau), així com la
seva pertinença a grups, rols de directori, aplicacions assignades i
dispositius registrats. És útil per entendre com es representen i relacionen
els objectes dins d'un tenant d'Entra ID.
`.trim(),

    USER_IDENTITY: `
Aquesta vista mostra la identitat d'un usuari del tenant de Microsoft Entra ID,
incloent les seves propietats bàsiques, grups, rols de directori i aplicacions
on té rols assignats. És útil per analitzar el context d'accés d'un usuari concret.
`.trim(),

    GROUP_IDENTITY:
      "Aquesta vista mostra informació bàsica del grup, els seus membres, owners, rols de directori on el grup actua com a administrador i les aplicacions on té app roles assignats.",

    APP_IDENTITY: `
Aquesta vista mostra la identitat d'una aplicació dins del tenant de Microsoft Entra ID,
incloent-hi informació bàsica del service principal (Enterprise app), els seus owners, 
els usuaris i grups amb app roles assignats i els tipus de credencial que utilitza 
(secrets, certificats o federated credentials).
`.trim(),

    PORTAL_ROLE_IDENTITY:
      "RBAC intern del portal basat en App Roles. Amb Entra ID Free, les assignacions es realitzen directament a usuaris. Quan un usuari té un App Role assignat, apareix al claim 'roles' del token.",
  },

  INFO: {
    ROLE_IMPLICIT_USER_ROLE:
      "Aquest rol és un rol intern del sistema (implicit user role). Microsoft Entra ID no permet activar-lo ni gestionar-lo manualment perquè s’assigna automàticament segons l’estat/tipus d’usuari.",
  },
};

module.exports = { UI_MESSAGES };
