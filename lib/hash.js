/**
 * Created by wuqingkai on 17/12/27.
 */

var PRIMARY_KEY             = "primaryKey";
var FOREIGN_KEY             = "foreignKey";

var Hash = module.exports;

Hash.getCacheOrder = function(key) {
};

Hash.makeKey = function(tableName, foreign, priValue, forValue) {
};

Hash.addCache = function(redis, table, data, cb) {
};

Hash.remCache = function(redis, table, priValue, forValue, cb) {
};

Hash.updCache = function(redis, table, json, cb) {
};

Hash.getCache = function(redis, table, priValue, forValue, cb) {
};
