// src/errors/errorCatalog.js

const ERROR_MESSAGES = {
    AUTH_REQUIRED: "Has d'iniciar sessió per accedir a aquesta funcionalitat.",
    FORBIDDEN_PORTAL_ROLE: "No tens permisos (portal role) per accedir a aquesta funcionalitat.",

    GRAPH_FORBIDDEN_IDENTITY_READ:
        "❌ Microsoft Graph ha denegat la lectura de la teva identitat (403). Comprova permisos delegats i Directory Roles.",

    GRAPH_FORBIDDEN_USER_ADMIN:
        "❌ El teu compte no disposa del Directory Role 'User Administrator' al tenant.",
    GRAPH_FORBIDDEN_GROUP_ADMIN:
        "❌ El teu compte no disposa del Directory Role 'Groups Administrator' al tenant.",
    GRAPH_FORBIDDEN_APP_ADMIN:
        "❌ El teu compte no disposa del Directory Role 'Application Administrator' al tenant.",
    GRAPH_FORBIDDEN_PRIV_ROLE_ADMIN:
        "❌ Aquesta acció requereix el Directory Role 'Privileged Role Administrator' al tenant.",

    GRAPH_GENERIC_FORBIDDEN:
        "❌ Microsoft Graph ha denegat l'acció (403). Comprova Directory Roles i permisos.",

    GRAPH_BAD_REQUEST:
        "La petició no és vàlida. Revisa els camps del formulari.",
    GRAPH_NOT_FOUND:
        "No s'ha trobat el recurs demanat.",
    GRAPH_CONFLICT:
        "Conflicte: potser el recurs ja existeix o la dada és duplicada.",

    INTERNAL_ERROR:
        "S'ha produït un error intern al portal.",



    // --- USERSS ---
    USERS_CREATE_MISSING_FIELDS:
        "Has d'omplir tots els camps per crear l'usuari (nom, UPN i contrasenya).",
    USERS_DELETE_NO_SELECTION:
        "No has seleccionat cap usuari per eliminar.",

    // --- GROUPS ---
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
};

module.exports = { ERROR_MESSAGES };
