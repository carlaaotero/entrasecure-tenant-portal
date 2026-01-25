/**
 * src/errors/errorCatalog.js
 *
 * Aquest fitxer centralitza tots els missatges d’error funcionals del portal.
 * No conté lògica, només textos reutilitzables.
 *
 * Objectius principals:
 * 1) Evitar missatges d’error “hardcoded” als controllers i middleware
 * 2) Garantir coherència en el llenguatge i to dels errors
 * 3) Facilitar manteniment i evolució del projecte
 * 4) Permetre mapar errors tècnics (Graph, permisos, validacions)
 *    a missatges entenedors per a l’usuari final
 *
 * Aquest catàleg s’utilitza conjuntament amb:
 *  - graphErrorHandler.js → tradueix errors tècnics a errors funcionals
 *  - middleware RBAC → controla accessos i mostra errors de permisos
 *  - controllers → validacions de formularis i accions
 */

const ERROR_MESSAGES = {
    /**
     * ERRORS D’AUTENTICACIÓ I AUTORITZACIÓ
     * Relacionats amb sessió, login i RBAC intern del portal.
     */
    AUTH_REQUIRED: "You must sign in to access this functionality.",
    AUTH_FORBIDDEN: "You do not have permission to complete the authentication.",
    FORBIDDEN_PORTAL_ROLE: "You do not have the required portal role to access this functionality.",

    /**
     * ERRORS DE MICROSOFT GRAPH (403 – FORBIDDEN)
     * Missatges específics quan l’usuari no té Directory Roles suficients.
     * Serveixen per explicar clarament QUIN rol falta i PER QUÈ.
     */
    GRAPH_FORBIDDEN_IDENTITY_READ:
        "Microsoft Graph denied access to read your identity (403). Check delegated permissions and Directory Roles.",

    GRAPH_FORBIDDEN_USER_ADMIN:
        "Your account does not have the 'User Administrator' Directory Role in the tenant.",
    GRAPH_FORBIDDEN_GROUP_ADMIN:
        "Your account does not have the 'Groups Administrator' Directory Role in the tenant.",
    GRAPH_FORBIDDEN_APP_ADMIN:
        "Your account does not have the 'Application Administrator' Directory Role in the tenant.",
    GRAPH_FORBIDDEN_PRIV_ROLE_ADMIN:
        "This action requires the 'Privileged Role Administrator' Directory Role in the tenant.",

    GRAPH_GENERIC_FORBIDDEN:
        "Microsoft Graph denied the action (403). Check Directory Roles and permissions.",

    /**
     * ERRORS HTTP COMUNS DE GRAPH
     * Utilitzats quan no cal un missatge tan específic.
     */
    GRAPH_BAD_REQUEST:
        "The request is not valid. Please review the form fields.",
    GRAPH_NOT_FOUND:
        "The requested resource was not found.",
    GRAPH_CONFLICT:
        "Conflict detected: the resource may already exist or the data is duplicated.",

    /**
     * ERRORS INTERNS DEL PORTAL
     * Errors no controlats o inesperats.
     */
    INTERNAL_ERROR:
        "An internal portal error has occurred.",


    // --- USERS (validacions) ---
    USERS_CREATE_MISSING_FIELDS:
        "You must fill in all fields to create the user (name, UPN, and password).",
    USERS_DELETE_NO_SELECTION:
        "You have not selected any users to delete.",

    // --- GROUPS (validacions) ---
    GROUPS_CREATE_MISSING_FIELDS:
        "You must provide the group name, description, and group type.",
    GROUPS_CREATE_NO_OWNERS:
        "You must specify at least one group owner.",
    GROUPS_DELETE_NO_SELECTION:
        "You have not selected any groups to delete.",
    GROUPS_ADD_OWNERS_NO_SELECTION:
        "You have not specified any owners to add.",
    GROUPS_ADD_MEMBERS_NO_SELECTION:
        "You have not specified any members to add.",

    // --- APPS (validacions) ---
    APP_NO_OWNER_SELECTED:
        "You have not specified any owners to add.",
    APP_NO_ASSIGNEE_SELECTED:
        "You have not specified any members to assign.",

    // --- ROLES (validacions) ---
    ROLES_ADD_MEMBERS_NO_SELECTION:
        "You have not specified any members to add to the role.",
    ROLES_ACTIVATE_FAILED:
        "The role could not be activated.",

    // --- PORTAL ROLES (validacions) ---
    ROLES_PORTAL_ASSIGN_NO_SELECTION:
        "You have not selected any users to assign to this portal role.",
    ROLES_PORTAL_NOT_FOUND:
        "The portal role was not found.",
    PORTAL_SERVICE_PRINCIPAL_NOT_FOUND:
        "The portal service principal was not found.",
};

module.exports = { ERROR_MESSAGES };
