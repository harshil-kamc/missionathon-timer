// Copy this file to settings.js and fill in the admin password.
// settings.js stays on the server; it is never sent to browsers.
// Restart the server (node server.js) after changing it.
export default {
  // Password for the admin dashboard at /#control. At least 8 characters.
  adminPassword: '',

  // Port the site runs on: http://this-computer:3000
  port: 3000,

  // Only set to true if the site runs behind a proxy you control
  // (for example nginx). Leave false otherwise.
  behindProxy: false,
};
