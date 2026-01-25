/**
 * src/messages/uiMessages.js
 *
 * Aquest fitxer centralitza tots els textos visibles de la interfície d’usuari (UI):
 * - Títols de pàgina
 * - Labels i textos comuns
 * - Missatges flash (feedback d'accions)
 * - Textos d’ajuda contextual
 * - Missatges informatius i modals
 *
 * Objectius principals:
 * 1) Evitar strings “hardcoded” repartits pel codi
 * 2) Facilitar manteniment i coherència visual
 * 3) Permetre canvis futurs (idioma, copy, UX) sense tocar la lògica
 */

const UI_MESSAGES = {
    TITLES: {
        HOME: "EntraSecure Tenant Portal",
        MY_IDENTITY: "My Identity · EntraSecure",
        TENANT_HOME: "Tenant Explorer · EntraSecure",
        USERS_LIST: "Tenant users",
        GROUPS_LIST: "Tenant groups",
        APPS_LIST: "Tenant applications",
        ROLES_LIST: "Roles",
        SECURITY_OVERVIEW: "Tenant Security Overview · EntraSecure",

        // Dynamic titles for detail views
        USER_DETAIL: (nameOrUpn) => `User · ${nameOrUpn}`,
        GROUP_DETAIL: (name) => `Group · ${name || "Details"}`,
        APP_DETAIL: (nameOrAppId) => `App · ${nameOrAppId}`,
        ROLE_DETAIL: (nameOrId) => `Role · ${nameOrId}`,
        PORTAL_ROLE_DETAIL: (nameOrValue) => `Portal role · ${nameOrValue}`,
    },

    LABELS: {
        AUTH_PROTOCOL: {
            OTHER: "Other",
            SAML: "SAML",
            OIDC: "OIDC / OAuth2",
        },
        UNNAMED: "(Unnamed)",
        DEFAULT_ACCESS: "Default access",
    },

    FLASH: {
        LOGIN_SUCCESS: "Successfully signed in.",

        // USERS
        USERS_CREATED: (displayName) => `User created: ${displayName}`,
        USERS_DELETED: (count) => `Users deleted: ${count}`,

        // GROUPS
        GROUP_CREATED: (displayName) => `Group created: ${displayName}`,
        GROUPS_DELETED: (count) => `Groups deleted: ${count}`,
        GROUP_OWNERS_ADDED: "Owners added successfully.",
        GROUP_MEMBERS_ADDED: "Members added successfully.",
        GROUP_MEMBER_REMOVED: "Member removed from the group.",
        GROUP_OWNER_REMOVED: "Owner removed from the group.",

        // APPS
        APP_OWNERS_ADDED: "Owners added to the application.",
        APP_OWNER_REMOVED: "Owner removed from the application.",
        APP_ASSIGNMENTS_ADDED: "Assignments added to the application.",
        APP_ASSIGNMENT_REMOVED: "Assignment removed from the application.",

        // ROLES
        ROLE_MEMBERS_ADDED: "Members added successfully.",
        ROLE_MEMBER_REMOVED: "Member removed from the role.",
        ROLE_ACTIVATED: "Role activated successfully.",

        // PORTAL ROLES (internal RBAC)
        PORTAL_USERS_ASSIGNED: "Users assigned successfully.",
        PORTAL_ASSIGNMENT_REMOVED: "Assignment removed.",
    },


    HELP: {
        MY_IDENTITY: `
This view shows how your identity is represented in Microsoft Entra ID.
It includes basic user attributes, group memberships, directory roles and
application role assignments.

It helps to understand how access is defined at both tenant and application level.

`.trim(),

        USER_IDENTITY: `
This view displays the identity of a tenant user, including basic properties,
group memberships, directory roles and application role assignments.

It is useful to analyze the access context and privileges of a specific user.

`.trim(),

        GROUP_IDENTITY: `
        This view shows the main information of a group, including its members and owners.
It also displays the roles and application assignments associated with the group.

It helps to understand how access can be managed indirectly through groups. 
`.trim(),

        APP_IDENTITY: `
This view shows the identity of an application within the tenant.
It includes owners, assigned users, application roles and credential information.

It is useful to analyze application access and governance configuration.
`.trim(),

        PORTAL_ROLE_IDENTITY: `
            This view shows a Directory Role defined by Microsoft Entra ID.
Directory Roles control what actions an identity can perform at tenant level.

They are enforced by Microsoft Graph during authorization.
`.trim(),

        INTERN_ROLE_IDENTITY: `
            This view represents an internal role of the portal based on App Roles.
These roles control access to portal functionalities.

App Roles are included in the authentication token and evaluated by the portal.
`.trim(),

    },

    INFO: {
        ROLE_IMPLICIT_USER_ROLE:
            "This role is an internal system role (implicit user role). Microsoft Entra ID does not allow it to be enabled or managed manually because it is automatically assigned based on the user's state or type.",
    },

    MODAL: {
        CONFIRM_TITLE: "Confirmation",
        CONFIRM_DELETE_MESSAGE: "Do you want to delete this item?",
        OK: "Confirm",
        CANCEL: "Cancel",
    },
};

    module.exports = { UI_MESSAGES };
