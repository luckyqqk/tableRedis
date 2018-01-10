/**
 * Created by wuqingkai on 17/12/27.
 */

var PRIMARY_KEY             = "primaryKey";
var FOREIGN_KEY             = "foreignKey";

var List = module.exports;

List.getCacheOrder = function(key) {
    return ['lrange', key, 0, -1];
};

List.makeKey = function(tableName, foreign, priValue, forValue) {
    if (!!foreign) {
        return tableName + ":" + forValue;
    } else {
        return tableName + ":" + priValue;
    }
};

List.getCache = function(redis, table, priValue, forValue, cb) {
    var key = List.makeKey(table.tableName, table[FOREIGN_KEY], priValue, forValue);
    redis.lrange(key, 0, - 1, (err, data)=>{
        if (!!err) {
            cb(err);
            return;
        }
        var singleRes = null, result = [];
        data.forEach(aData=>{
            aData = JSON.parse(aData);
            result.push(aData);
            if (priValue == aData[table[PRIMARY_KEY]])
                singleRes = aData;
        });
        if (!!priValue) {
            cb(null, singleRes);
        } else {
            cb(null, result);
        }
    });
};

List.addCache = function(redis, table, data, expire, cb) {
    if (typeof expire == 'function') {
        cb = expire;
        expire = 0;
    }
    var aValue = data;
    var forCache = [];
    if (Array.isArray(data)) {
        aValue = data[0];
        data.forEach(d=>{
            forCache.push(JSON.stringify(d));
        })
    } else {
        forCache = JSON.stringify(data);
    }
    var key = List.makeKey(table.tableName, table[FOREIGN_KEY], aValue[table[PRIMARY_KEY]], aValue[table[FOREIGN_KEY]]);
    redis.rpush(key, forCache, (err, res)=>{
        if (!!expire)
            redis.expire(key, expire, cb);
        else
            cb(err, res);
    });
};

List.updCache = function(redis, table, json, expire, cb) {
    if (typeof expire == 'function') {
        cb = expire;
        expire = 0;
    }
    var key = List.makeKey(table.tableName, table[FOREIGN_KEY], json[table[PRIMARY_KEY]], json[table[FOREIGN_KEY]]);
    redis.lrange(key, 0, -1, (err, data)=>{
        if (!!err) {
            cb(err);
        } else if (!data || data.length < 1) {
            cb();
        } else {
            var idx = -1;
            for (let i = 0; i < data.length; i++) {
                var dataObj = JSON.parse(data[i]);
                if (json[table[PRIMARY_KEY]] == dataObj[table[PRIMARY_KEY]]) {
                    idx = i;
                    break;
                }
            }
            if (idx == -1) {
                if (!!expire)
                    redis.expire(key, expire, cb);
                else
                    cb();
            } else {
                redis.lset(key, idx, JSON.stringify(json), (err, res)=>{
                    if (!!expire)
                        redis.expire(key, expire, cb);
                    else
                        cb(err, res);
                });
            }
        }
    });
};

List.remCache = function(redis, table, priValue, forValue, cb) {
    var key = List.makeKey(table.tableName, table[FOREIGN_KEY], priValue, forValue);
    if (!priValue) {
        redis.del(key, cb);
        return;
    }
    redis.lrange(key, 0, -1, (err, data)=>{
        if (!!err || !data || data.length < 1) {
            cb(`table:${table.tableName} has no cache id:${json[table[PRIMARY_KEY]]}`);
            return;
        }
        var forDel = null;
        for (let i in data) {
            if (priValue == data[table[PRIMARY_KEY]]) {
                forDel = data[i];
                break;
            }
        }
        if (!forDel) {
            cb(`table:${table.tableName} has no cache id:${json[table[PRIMARY_KEY]]}`);
        } else {
            redis.lrem(key, 0, forDel, cb);
        }
    });
};