'use strict';

/**
 * All the user authentication in one place.
 *
 * This module allows for users to log(in|out), and get the status of their session.
 * authentication methods.
 *
 * @type {exports}
 */
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var util = require('../util/util');
var debug = {
  authenticate: require('debug')('formio:authentication:authenticate')
};

module.exports = function(router) {
  var hook = require('../util/hook')(router.formio);

  /**
   * Generate our JWT with the given payload, and pass it to the given callback function.
   *
   * @param payload {Object}
   *   The decoded JWT.
   *
   * @return {String|Boolean}
   *   The JWT from the given payload, or false if the jwt payload is still valid.
   */
  var getToken = function(payload) {
    // Ensure that we do not do multiple re-issues consecutively.
    // Re-issue at the maximum rate of 1/min.
    if (payload.iat) {
      var now = Math.floor(Date.now() / 1000);
      if ((now - payload.iat) < 60) {
        return false;
      }

      delete payload.iat;
      delete payload.exp;
    }

    return jwt.sign(payload, router.formio.config.jwt.secret, {
      expiresIn: router.formio.config.jwt.expireTime * 60
    });
  };

  /**
   * Authenticate a user.
   *
   * @param form {Object}
   *   The form object to authenticate the given user against.
   * @param userField {String}
   *   The user submission field that contains the username.
   * @param passField {String}
   *   The user submission field that contains the password.
   * @param username {String}
   *   The user submission username to login with.
   * @param password {String}
   *   The user submission password to login with.
   * @param next {Function}
   *   The callback function to call after authentication.
   */
  var authenticate = function(form, userField, passField, username, password, next) {
    // Make sure they have provided a username and password.
    if (!username) {
      return next(new Error('Missing username'));
    }
    if (!password) {
      return next(new Error('Missing password'));
    }

    // Get the query to perform on the resource.
    var query = {
      form: util.idToBson(form._id),
      deleted: {$eq: null}
    };
    query['data.' + userField] = username;

    // Find the user object.
    router.formio.resources.submission.model.findOne(query, function(err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next(new Error('Invalid user'));
      }

      // Compare the provided password.
      user = user.toObject();
      bcrypt.compare(password, user.data[passField], function(err, value) {
        if (err) {
          return next(err);
        }
        if (!value) {
          return next(new Error('Incorrect password'));
        }

        // Allow anyone to hook and modify the user.
        hook.alter('user', user, function hookUserCallback(err, _user) {
          if (err) {
            // Attempt to fail safely and not update the user reference.
            debug.authenticate(err);
          }
          else {
            // Update the user with the hook results.
            debug.authenticate(user);
            user = _user;
          }

          // Allow anyone to hook and modify the token.
          var token = hook.alter('token', {
            user: {
              _id: user._id
            },
            form: {
              _id: form._id
            }
          }, form);

          // Continue with the token data.
          next(null, {
            user: user,
            token: {
              token: getToken(token),
              decoded: token
            }
          });
        });
      });
    });
  };

  /**
   * Send the current user.
   *
   * @param req
   * @param res
   * @param next
   */
  var currentUser = function(req, res, next) {
    if (!res.token || !req.token) {
      return res.sendStatus(401);
    }

    // Set the headers if they haven't been sent yet.
    if (!res.headersSent) {
      res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token');
      res.setHeader('x-jwt-token', res.token);
    }

    // Duplicate the current request get the users information.
    var url = '/form/:formId/submission/:submissionId';
    var childReq = util.createSubRequest(req);
    childReq.method = 'GET';
    childReq.skipResource = false;

    // If this request is not directly accessing /current, allow the response to be sent.
    if (req.url !== '/current') {
      childReq.noResponse = true;
    }

    // Update the parameters to use from the decoded token.
    childReq.params = hook.alter('submissionRequestTokenQuery', {
      formId: req.token.form._id,
      submissionId: req.token.user._id
    }, req.token);

    // Execute the resourcejs methods associated with the user submissions.
    router.resourcejs[url].get.call(this, childReq, res, next);
  };

  /**
   * Return the public methods.
   */
  return {
    getToken: getToken,
    authenticate: authenticate,
    currentUser: currentUser,
    logout: function(req, res) {
      res.setHeader('x-jwt-token', '');
      res.sendStatus(200);
    }
  };
};
