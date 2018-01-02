/**
 * Created by wuqingkai on 17/12/27.
 */

var PRIMARY_KEY             = "primaryKey";
var FOREIGN_KEY             = "foreignKey";

var Zset = module.exports;

Zset.getCacheOrder = function(key) {
};

Zset.makeKey = function(tableName, foreign, priValue, forValue) {
};

Zset.addCache = function(redis, table, data, cb) {
};

Zset.remCache = function(redis, table, priValue, forValue, cb) {
};

Zset.updCache = function(redis, table, json, cb) {
};

Zset.getCache = function(redis, table, priValue, forValue, cb) {
};
