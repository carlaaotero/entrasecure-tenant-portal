# EntraSecure Tenant Portal

L’**EntraSecure Tenant Portal** és una aplicació web desenvolupada amb **Node.js** i **Express** que integra **Microsoft Entra ID (Azure AD)** per demostrar conceptes de **secure authentication**, **role-based access control (RBAC)** i integració amb **Microsoft Graph API**.

## Objectius del projecte

L’objectiu principal és construir una aplicació pròpia i completament funcional que permeti:

- Autenticar-se mitjançant **Microsoft Entra ID** utilitzant els protocols OpenID Connect i OAuth 2.0.
- Visualitzar la pròpia identitat, rols i claims del token (*My Identity*).  
- Explorar usuaris, grups i aplicacions del tenant (*Tenant Explorer*).  
- Mostrar informació de seguretat i inicis de sessió (*Sign-in & Security Insights*).  
- Implementar RBAC (Role-Based Access Control) tant a nivell d’aplicació (App Roles) com de tenant (Directory Roles).

---

## Mòduls principals planificats

- **My Identity** → Mostra el perfil de l’usuari autenticat, el seu context dins del tenant i els claims dels tokens.
- **Tenant Explorer** → Llista d’usuaris, grups i aplicacions del tenant. Accés restringit segons els rols definits.
- **Sign-in & Security Insights** → Visualització dels audit logs i estadístiques d’inicis de sessió.
- **RBAC & Token Viewer** → Aplicació de control d’accés basat en rols i visualització estructurada dels tokens.

---

## Tecnologies utilitzades

- **Node.js**  
- **Express**  
- **EJS** 
- **express-session** (gestió de sessió)  
- **dotenv** (gestió de variables d’entorn)  
- **MSAL for Node.js** (integració amb Entra ID)  
- **Microsoft Graph API** (obtenció de dades del tenant)

---

## Arquitectura general

L’aplicació segueix una arquitectura modular:
src/
├─ auth/ → Configuració MSAL i autenticació amb Entra ID
├─ routes/ → Definició de rutes principals i mòduls
├─ controllers/ → Lògica de negoci i interacció amb Microsoft Graph
├─ views/ → Vistes EJS per renderitzar la interfície
└─ server.js → Punt d’entrada del servidor Express


---


Aquest projecte està conceptualment inspirat en el sample oficial de Microsoft:  [ms-identity-node](https://github.com/Azure-Samples/ms-identity-node)



