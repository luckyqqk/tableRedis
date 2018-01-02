var TableRedis = require('../tableRedis');

module.exports = function(app, opts) {
  var service = new TableRedis(app, opts);
  app.set('tableRedis', service, true);
  return service;
};