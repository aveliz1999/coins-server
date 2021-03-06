/**
 * Middleware to disallow access to any request unless the user is logged in (has a user id in session).
 * Returns a 403 Unauthorized if the user is not logged in.
 */
module.exports = function(req, res, next) {
    if(req.session.user) {
        res.cookie('authenticated', req.sessionID, {maxAge: 3600000, httpOnly: false});
        next();
    }
    else {
        res.status(403).send({message: 'Unauthorized'});
    }
};
