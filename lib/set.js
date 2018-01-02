/**
 * Created by wuqingkai on 17/12/27.
 */

var PRIMARY_KEY             = "primaryKey";
var FOREIGN_KEY             = "foreignKey";

var Set = module.exports;

Set.getCacheOrder = function(key) {
};

Set.makeKey = function(tableName, foreign, priValue, forValue) {
};

Set.addCache = function(redis, table, data, cb) {
};

Set.remCache = function(redis, table, priValue, forValue, cb) {
};

Set.updCache = function(redis, table, json, cb) {
};

Set.getCache = function(redis, table, priValue, forValue, cb) {
};
