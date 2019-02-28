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
