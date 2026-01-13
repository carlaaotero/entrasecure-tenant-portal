// controllers/securityController.js

const { callGraph } = require('./graphController');
const {
    getAllUsers,
    getAllGroups,
    getAllApps,
    getDirectoryRoles,
    getDirectoryRoleMembers,
    getTenantAppOwners,
    getAllAppRegistrations,
    getApplicationByAppId,
} = require('./tenantController');

const DAY = 1000 * 60 * 60 * 24;



function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function mapWithConcurrency(items, limit, mapper) {
    const batches = chunk(items, limit);
    const results = [];
    for (const b of batches) {
        const partial = await Promise.all(b.map(mapper));
        results.push(...partial);
    }
    return results;
}

function safeDate(d) {
    const x = d ? new Date(d) : null;
    return x && !isNaN(x) ? x : null;
}

function countExpiringCreds(appRegs, withinDays = 30) {
    const now = new Date();
    const threshold = new Date(now.getTime() + withinDays * DAY);

    let expired = 0;
    let expiringSoon = 0;

    // comptem creds a nivell global (i després també podem marcar apps)
    for (const a of appRegs) {
        const pw = a.passwordCredentials || [];
        const keys = a.keyCredentials || [];

        const all = [...pw, ...keys];
        for (const c of all) {
            const end = safeDate(c.endDateTime);
            if (!end) continue;

            if (end < now) expired++;
            else if (end <= threshold) expiringSoon++;
        }
    }

    return { expired, expiringSoon };
}

// Service principal del portal via appId
async function getPortalServicePrincipal(accessToken, portalAppId) {
    const endpoint =
        `/servicePrincipals?$filter=appId eq '${portalAppId}'&$select=id,appId,displayName,appRoles`;
    const json = await callGraph(endpoint, accessToken);
    return (json.value && json.value[0]) ? json.value[0] : null;
}


async function getPortalRbacDistribution(accessToken, portalSpId) {
    // App role assignments de la teva Enterprise App
    // Nota: l'API retorna l'assignació al resource (servicePrincipal)
    const endpoint =
        `/servicePrincipals/${portalSpId}/appRoleAssignedTo?$select=principalId,principalType,appRoleId`;
    const json = await callGraph(endpoint, accessToken);
    const items = json.value || [];

    // appRoleId == 0000... és "Default Access"
    const counts = {};
    for (const a of items) {
        const k = a.appRoleId || 'unknown';
        counts[k] = (counts[k] || 0) + 1;
    }
    return { totalAssignments: items.length, byAppRoleId: counts };
}

async function buildSecurityOverview(accessToken, options = {}) {
    const portalAppId = process.env.AZURE_CLIENT_ID || null;

    // 1) Carreguem bàsics (en paral·lel)
    const [users, groups, apps, directoryRoles, appRegs] = await Promise.all([
        getAllUsers(accessToken),
        getAllGroups(accessToken),
        getAllApps(accessToken),               // servicePrincipals (enterprise apps)
        getDirectoryRoles(accessToken),
        getAllAppRegistrations(accessToken),   // applications list (app registrations)
    ]);

    const m365Groups = groups.filter(g => (g.groupTypes || []).includes('Unified')).length;
    const securityGroups = groups.filter(g => !(g.groupTypes || []).includes('Unified') && g.securityEnabled === true).length;

    // --- FILTER: només Enterprise Apps pròpies ---
    const ownAppIds = new Set(
        (appRegs || []).map(a => a.appId).filter(Boolean)
    );

    const ownEnterpriseApps = (apps || []).filter(sp =>
        sp.appId && ownAppIds.has(sp.appId)
    );


    // 2) Users breakdown
    const totalUsers = users.length;
    const guests = users.filter(u => (u.userType || '').toLowerCase() === 'guest').length;
    const members = totalUsers - guests;
    const disabled = users.filter(u => u.accountEnabled === false).length;

    // 3) Groups without owners (1 crida per grup)
    const groupOwnersResults = await mapWithConcurrency(groups, 6, async (g) => {
        try {
            const json = await callGraph(`/groups/${g.id}/owners/microsoft.graph.user?$select=id`, accessToken);



            const owners = (json.value || []);
            return { group: g, ownersCount: owners.length, status: 'ok' };


        } catch (err) {
            // si no podem comprovar owners, ho marquem com "unknown"
            return { group: g, ownersCount: null, status: 'error' };
        }
    });

    const groupsWithoutOwners = groupOwnersResults.filter(
        x => x.status === 'ok' && x.ownersCount === 0
    );

    console.log('DEBUG owners check:');
    groupOwnersResults.forEach(x => {
        console.log(x.group.displayName, 'status=', x.status, 'ownersCount=', x.ownersCount);
    });

    console.log('groupsWithoutOwners:', groupsWithoutOwners.map(x => x.group.displayName));

    // 4) Apps without owners (1 crida per app / service principal)
    const appOwnersResults = await mapWithConcurrency(ownEnterpriseApps, 6, async (sp) => {
        const owners = await getTenantAppOwners(accessToken, sp.id);
        return { sp, ownersCount: owners.length };
    });
    const appsWithoutOwners = appOwnersResults.filter(x => x.ownersCount === 0);

    // 5) Credential hygiene (a nivell App Registration)
    // Per tenir-ho “visual” i simple: comptem creds expirades i expiring soon
    // També podem calcular quantes apps tenen algún secret que expira.
    const { expired: credsExpired, expiringSoon: credsExpiringSoon } =
        countExpiringCreds(appRegs, 30);

    // 6) Privileged directory role assignments
    // Llista curta “didàctica” (sense top 5)
    const HIGH_IMPACT = new Set([
        'Global Administrator',
        'Privileged Role Administrator',
        'Security Administrator',
        'Conditional Access Administrator',
        'Application Administrator',
        'Cloud Application Administrator',
        'User Administrator',
        'Helpdesk Administrator',
        'Authentication Administrator',
    ]);

    const membersPerRole = await mapWithConcurrency(directoryRoles, 5, async (r) => {
        const members = await getDirectoryRoleMembers(accessToken, r.id);
        const count = (members || []).length;
        const highImpact = HIGH_IMPACT.has(r.displayName);
        return { role: r, count, highImpact };
    });

    const privilegedAssignments = membersPerRole
        .filter(x => x.highImpact)
        .reduce((sum, x) => sum + x.count, 0);

    const privilegedRolesInUse = await mapWithConcurrency(
        membersPerRole.filter(x => x.highImpact && x.count > 0),
        4,
        async (x) => {
            // Tornem a demanar els membres per tenir els noms (per UI)
            const members = await getDirectoryRoleMembers(accessToken, x.role.id);

            // Ens quedem només amb usuaris (ignorem service principals si surten)
            const users = (members || [])
                .filter(m => !m.appId) // si té appId normalment és SP
                .map(m => ({
                    id: m.id,
                    displayName: m.displayName,
                    userPrincipalName: m.userPrincipalName
                }));

            return {
                id: x.role.id,
                displayName: x.role.displayName,
                membersCount: users.length,
                users
            };
        }
    );



    // 7) Portal RBAC distribution (optional)
    let portalRbac = null;
    if (portalAppId) {
        const portalSp = await getPortalServicePrincipal(accessToken, portalAppId);
        if (portalSp && portalSp.id) {
            const dist = await getPortalRbacDistribution(accessToken, portalSp.id);

            // Mapa d’IDs → labels (tu ho adaptes als teus App Roles)
            // IMPORTANT: aquí posa els appRoleId reals dels teus Portal roles (del App Registration)
            // Construïm el mapping automàtic: appRoleId -> nom del rol
            const roleIdToLabel = {
                '00000000-0000-0000-0000-000000000000': 'Default access',
            };

            // portalSp.appRoles ve del Graph: id + displayName/value
            const appRoles = (portalSp.appRoles || []);
            for (const r of appRoles) {
                if (!r || !r.id) continue;
                // Prioritza displayName (més friendly); si no existeix, value; i si no, l'id
                roleIdToLabel[r.id] = r.displayName || r.value || r.id;
            }

            const byLabel = {};
            for (const [appRoleId, c] of Object.entries(dist.byAppRoleId)) {
                const label = roleIdToLabel[appRoleId] || appRoleId; // fallback per si algun rol no ve
                byLabel[label] = (byLabel[label] || 0) + c;
            }


            portalRbac = {
                portalAppId,
                portalSpName: portalSp.displayName,
                totalAssignments: dist.totalAssignments,
                byLabel,
            };
        } else {
            portalRbac = { portalAppId, error: 'Service principal not found for AZURE_CLIENT_ID' };
        }
    } else {
        portalRbac = { error: 'AZURE_CLIENT_ID not configured' };
    }

    // 8) Capacity indicators (qualitatius)
    function levelByThreshold(n, t1, t2) {
        if (n < t1) return { label: 'Low', pct: 25 };
        if (n < t2) return { label: 'Moderate', pct: 55 };
        return { label: 'High', pct: 85 };
    }

    const identityVolume = levelByThreshold(totalUsers, 200, 2000);
    const appFootprint = levelByThreshold(ownEnterpriseApps.length, 30, 200);

    const privilegedRatio = totalUsers > 0 ? (privilegedAssignments / totalUsers) : 0;
    const privilegedConcentration =
        privilegedRatio < 0.02 ? { label: 'Low', pct: 25 } :
            privilegedRatio < 0.06 ? { label: 'Moderate', pct: 55 } :
                { label: 'High', pct: 85 };


    function appHasExpiringCred(app, withinDays = 30) {
        const now = new Date();
        const threshold = new Date(now.getTime() + withinDays * DAY);
        const creds = [...(app.passwordCredentials || []), ...(app.keyCredentials || [])];
        return creds.some(c => {
            const end = safeDate(c.endDateTime);
            return end && end > now && end <= threshold;
        });
    }

    const myAppsExpiringSoon = appRegs
        .filter(a => appHasExpiringCred(a, 30))
        .map(a => ({ id: a.id, displayName: a.displayName, appId: a.appId }))


    return {
        // Overview
        totals: {
            users: totalUsers,
            groups: groups.length,
            apps: ownEnterpriseApps.length
            ,
            directoryRoles: directoryRoles.length,
            plan: 'Microsoft Entra ID Free',
        },

        groupsBreakdown: { security: securityGroups, m365: m365Groups },


        // Identity
        identity: { members, guests, disabled },

        // Governance
        groupsWithoutOwners: {
            count: groupsWithoutOwners.length,
            items: groupsWithoutOwners.map(x => ({ id: x.group.id, displayName: x.group.displayName })),

        },
        appsWithoutOwners: {
            count: appsWithoutOwners.length,
            items: appsWithoutOwners.map(x => ({ id: x.sp.id, displayName: x.sp.displayName, appId: x.sp.appId })),
        },

        // Credentials
        credentials: {
            expiringSoon: credsExpiringSoon,
            expired: credsExpired,
            withinDays: 30,
        },

        // Privileged access
        privileged: {
            assignments: privilegedAssignments,
            highImpactRolesCount: membersPerRole.filter(x => x.highImpact).length,
        },

        privilegedRolesInUse,

        // Portal RBAC
        portalRbac,

        // Capacity
        capacity: {
            identityVolume,
            appFootprint,
            privilegedConcentration,
            notes: [
                'Aquest tenant utilitza l’edició Free: algunes funcions avançades (PIM, sign-in logs, Conditional Access) no estan disponibles.',
            ],
        },

        appsExpiringSoon: {
            count: myAppsExpiringSoon.length,
            items: myAppsExpiringSoon
        },




    };
}

module.exports = { buildSecurityOverview };
