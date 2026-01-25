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
    AUTH_REQUIRED: "Has d'iniciar sessió per accedir a aquesta funcionalitat.",
    AUTH_FORBIDDEN: "No tens permisos per completar l'autenticació.",
    FORBIDDEN_PORTAL_ROLE: "No tens permisos (portal role) per accedir a aquesta funcionalitat.",

    /**
     * ERRORS DE MICROSOFT GRAPH (403 – FORBIDDEN)
     * Missatges específics quan l’usuari no té Directory Roles suficients.
     * Serveixen per explicar clarament QUIN rol falta i PER QUÈ.
     */
    GRAPH_FORBIDDEN_IDENTITY_READ:
        "Microsoft Graph ha denegat la lectura de la teva identitat (403). Comprova permisos delegats i Directory Roles.",

    GRAPH_FORBIDDEN_USER_ADMIN:
        "El teu compte no disposa del Directory Role 'User Administrator' al tenant.",
    GRAPH_FORBIDDEN_GROUP_ADMIN:
        "El teu compte no disposa del Directory Role 'Groups Administrator' al tenant.",
    GRAPH_FORBIDDEN_APP_ADMIN:
        "El teu compte no disposa del Directory Role 'Application Administrator' al tenant.",
    GRAPH_FORBIDDEN_PRIV_ROLE_ADMIN:
        "Aquesta acció requereix el Directory Role 'Privileged Role Administrator' al tenant.",

    GRAPH_GENERIC_FORBIDDEN:
        "Microsoft Graph ha denegat l'acció (403). Comprova Directory Roles i permisos.",

    /**
     * ERRORS HTTP COMUNS DE GRAPH
     * Utilitzats quan no cal un missatge tan específic.
     */
    GRAPH_BAD_REQUEST:
        "La petició no és vàlida. Revisa els camps del formulari.",
    GRAPH_NOT_FOUND:
        "No s'ha trobat el recurs demanat.",
    GRAPH_CONFLICT:
        "Conflicte: potser el recurs ja existeix o la dada és duplicada.",

    /**
     * ERRORS INTERNS DEL PORTAL
     * Errors no controlats o inesperats.
     */
    INTERNAL_ERROR:
        "S'ha produït un error intern al portal.",


    // --- USERS (validacions) ---
    USERS_CREATE_MISSING_FIELDS:
        "Has d'omplir tots els camps per crear l'usuari (nom, UPN i contrasenya).",
    USERS_DELETE_NO_SELECTION:
        "No has seleccionat cap usuari per eliminar.",

    // --- GROUPS (validacions) ---
    GROUPS_CREATE_MISSING_FIELDS:
        "Cal indicar el nom del grup, la descripció i el tipus de grup.",
    GROUPS_CREATE_NO_OWNERS:
        "Cal indicar com a mínim un owner del grup.",
    GROUPS_DELETE_NO_SELECTION:
        "No has seleccionat cap grup per eliminar.",
    GROUPS_ADD_OWNERS_NO_SELECTION:
        "No has indicat cap owner per afegir.",
    GROUPS_ADD_MEMBERS_NO_SELECTION:
        "No has indicat cap member per afegir.",

    // --- APPS (validacions) ---
    APP_NO_OWNER_SELECTED: "No has indicat cap owner per afegir.",
    APP_NO_ASSIGNEE_SELECTED: "No has indicat cap member per assignar.",

    // --- ROLES (validacions) ---
    ROLES_ADD_MEMBERS_NO_SELECTION:
        "No has indicat cap member per afegir al rol.",
    ROLES_ACTIVATE_FAILED:
        "No s’ha pogut activar el rol.",

    // --- PORTAL ROLES (validacions) ---
    ROLES_PORTAL_ASSIGN_NO_SELECTION:
        "No has seleccionat cap usuari per assignar a aquest portal role.",
    ROLES_PORTAL_NOT_FOUND:
        "No s'ha trobat el portal role.",
    PORTAL_SERVICE_PRINCIPAL_NOT_FOUND:
        "No s'ha trobat el service principal del portal.",

};

module.exports = { ERROR_MESSAGES };
