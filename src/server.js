// Punt d'entrada de l'app.

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const path = require('path');

const app = express();

// --- Config bàsica ---
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_insecure_change_me';

// View engine: EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            // secure: true, // activa-ho quan tinguis HTTPS
            maxAge: 1000 * 60 * 60, // 1 hora
        },
    })
);

const { getDisplayRole } = require('./middleware/rbac');

// RBAC role + user per totes les views (EJS)
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  res.locals.portalRole = req.session?.user ? getDisplayRole(req) : 'Default';
  res.locals.flash = req.session?.flash || null;
  next();
});

// Estàtics (CSS/JS/imatges)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rutes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const identityRoutes = require('./routes/identity');
const tenantExplorerRoutes = require('./routes/tenantExplorer');
const securityRoutes = require('./routes/security');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/', identityRoutes);
app.use('/', tenantExplorerRoutes);
app.use('/', securityRoutes);

// Healthcheck
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// 404
app.use((req, res) => {
     res.status(404).render('index', {
    title: 'Pàgina no trobada',
    user: req.session?.user || null,
    flash: req.session?.flash || null,
  });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server escoltant a http://localhost:${PORT}`);
});
