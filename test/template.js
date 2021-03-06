'use strict';

module.exports = function() {
  // The default project template.
  var template = require('../src/templates/default.json');

  // Create a registration form for admins for testing purposes.
  template.forms.adminRegister = {
    title: 'Admin Register',
    name: 'adminRegister',
    path: 'admin/register',
    type: 'form',
    access: [
      {
        type: 'read_all',
        roles: ['anonymous']
      }
    ],
    submissionAccess: [
      {
        type: 'create_own',
        roles: ['anonymous']
      }
    ],
    components: [
      {
        type: 'email',
        persistent: true,
        unique: false,
        protected: false,
        defaultValue: '',
        suffix: '',
        prefix: '',
        placeholder: 'Enter your email address',
        key: 'admin.email',
        label: 'Email',
        inputType: 'email',
        tableView: true,
        input: true
      },
      {
        type: 'password',
        persistent: true,
        protected: true,
        suffix: '',
        prefix: '',
        placeholder: 'Enter your password.',
        key: 'admin.password',
        label: 'Password',
        inputType: 'password',
        tableView: false,
        input: true
      },
      {
        theme: 'primary',
        disableOnInvalid: true,
        action: 'submit',
        block: false,
        rightIcon: '',
        leftIcon: '',
        size: 'md',
        key: 'submit',
        label: 'Submit',
        input: true,
        type: 'button'
      }
    ]
  };

  // Create a register action for this form.
  template.actions.adminRegister = {
    title: 'Authentication',
    name: 'auth',
    form: 'adminRegister',
    handler: ['before'],
    method: ['create'],
    priority: 0,
    settings: {
      association: 'new',
      role: 'administrator',
      username: 'admin.email',
      password: 'admin.password'
    }
  };

  // Add some users.
  template.users = {
    // An owner of the project.
    admin: {
      token: '',
      data: {
        email: 'admin@example.com',
        password: 'test123'
      }
    },

    // A administrator of this User-created Project.
    admin2: {
      token: '',
      data: {
        email: 'admin2@example.com',
        password: 'test123'
      }
    },

    // A user of this User-created Project.
    user1: {
      token: '',
      data: {
        email: 'user1@example.com',
        password: 'test123'
      }
    },

    // A user of this User-created Project.
    user2: {
      token: '',
      data: {
        email: 'user2@example.com',
        password: 'test123'
      }
    }
  };

  return template;
};
