const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('./database/mysql');

const app = express();

// Initialize the cookie session with a MySQL database
const appSession = {
  cookie: {
    maxAge: 3600000,
    httpOnly: false
  },
  name: 'sessId',
  saveUninitialized: true,
  secret: process.env.SESSION_SECRETS,
  resave: true,
  rolling: true,
  store: new MySQLStore({}, mysql.pool)
};
// Enable security if not in development mode
if(app.get('env') !== 'development'){
  app.set('trust proxy', 1);
  appSession.cookie.secure = true;
}
app.use(session(appSession));

app.use(logger('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use middleware to html sanitize all output to the client
const sanitize = require('sanitize-html');
const sanitizeResponse = function(req, res, next) {
  const send = res.send;

  res.send = function(body) {
    if(body instanceof String) {
      body = sanitize(body, {allowedTags: [], allowedAttributes: {}});
      send.call(this, body);
    }
    else {
      body = JSON.parse(sanitize(JSON.stringify(body), {allowedTags: [], allowedAttributes: {}}));
      send.call(this, body);
    }
  };
  next();
};
app.use(sanitizeResponse);

const usersRouter = require('./routes/users');
const transactionsRouter = require('./routes/transactions');
const coinsRouter = require('./routes/coins');

app.use('/users', usersRouter);
app.use('/transactions', transactionsRouter);
app.use('/coins', coinsRouter);

/**
 * Middleware to disallow access to media if not authorized.
 * Returns a 403 Unauthorized if the user is not logged in.
 */
app.use(function(req, res, next) {
  if(req.session.user) {
    next();
  }
  else {
    res.status(403).send({message: 'Unauthorized'});
  }
});
app.use(express.static(path.join(__dirname, 'public')));

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  console.log(err);
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Send the error page
  res.status(err.status || 500).send(err);
});

module.exports = app;
