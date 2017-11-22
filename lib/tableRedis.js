/**
 * mysql数据表的redis缓存工具类
 * 用list缓存表数据,减轻数据的查询压力.
 *
 * 功能简介:
 *      查询缓存数据,更新/新增缓存数据.并设置数据过期时间.
 * date:17/5/8
 * @author wuqingkai
 * @param {Object} dbTable
 * @param {Object} redisInfo
 */
var TableRedis = function(dbTable, redisInfo){
    this.dbTable = dbTable;
    this.name = "tableRedis-" + dbTable.databaseName;
    this.redisClient = require("ioredis").createClient(redisInfo['port'], redisInfo['host'], redisInfo['password']);
    this.redisClient.on("error", function (err) {
        console.error(`redisErr:${err}`);
    });
    //redisClient.select(1);
};
module.exports = TableRedis;
var pro = TableRedis.prototype;

//var TABLE_NAME              = "tableName";
//var COLUMN                  = "column";
//var COLUMN_NAME             = "columnName";
//var COLUMN_NAMES            = "columnNames";
//var COLUMN_DEFAULT_VALUE    = "columnDefaultValue";
var PRIMARY_KEY             = "primaryKey";
var FOREIGN_KEY             = "foreignKey";
var SON_KEY                 = "sonKey";
//var AUTO_INCREMENT          = "autoIncrement";

/**
 * 缓存数据
 * hash
 * 没有外键的表用hash结构缓存.
 * hash的双key为表名和主键值
 *      tableName, primaryKey
 * List
 * 有外键的表用List结构缓存.
 *      表名:外键值
 *      tableName:foreignKey
 * @param tableName {string}            表名
 * @param toSet     {obj||Array}     将要设置缓存的数据(单条或多条)
 * @param cb
 */
pro.addRedisCache = function(tableName, toSet, cb) {
    if (!tableName || !toSet) {
        cb(`params null`);
        return;
    }
    var table = this.dbTable.getTable(tableName);
    if (!!table[FOREIGN_KEY]) {
        // list
        var redisOrder = [];
        redisOrder.push('rpush');
        if (Array.isArray(toSet)) {
            redisOrder.push(tableName + ":" + toSet[0][table[FOREIGN_KEY]]);
            toSet.forEach((data)=>{
                redisOrder.push(JSON.stringify(data));
            });
        } else {
            redisOrder.push(tableName + ":" + toSet[table[FOREIGN_KEY]]);
            redisOrder.push(JSON.stringify(toSet));
        }
        this.redisClient.pipeline([redisOrder]).exec((err, data)=>{
            cb(err, data);
        });
    } else {
        // map
        var pipeArr = [];
        if (Array.isArray(toSet)) {
            toSet.forEach((data)=>{
                pipeArr.push(['hset', tableName, data[table[PRIMARY_KEY]], JSON.stringify(data)]);
            });
        } else {
            pipeArr.push(['hset', tableName, toSet[table[PRIMARY_KEY]], JSON.stringify(toSet)]);
        }
        this.redisClient.pipeline(pipeArr).exec((err, data)=>{
            cb(err, data);
        });
    }
};

/**
 *
 * 获取缓存数据
 * @param tableName
 * @param sign
 * @param cb
 */
pro.getRedisCache = function(tableName, sign, cb) {
    var table = this.dbTable.getTable(tableName);
    if (!!table[FOREIGN_KEY]) {
        // list
        var cacheKey = tableName + ":" + sign;
        this.redisClient.lrange(cacheKey, 0, -1, cb);
    } else {
        // map
        this.redisClient.hget(tableName, sign, cb);
    }
};

/**
 * 获取list中某下标的数据
 * @param tableName
 * @param sign
 * @param index
 * @param cb
 */
pro.getRedisCacheByIndex = function(tableName, sign, index, cb) {
    var cacheKey = tableName + ":" + sign;
    this.redisClient.lindex(cacheKey, index, cb);
};

/**
 * 更新list中某下标的数据
 * @param tableName
 * @param json
 * @param index
 * @param cb
 */
pro.updateRedisCache = function(tableName, json, index, cb) {
    if (!!index && typeof index === 'function') {
        cb = index;
        index = null;
    } else if (!cb) {
        return;
    }
    if (!tableName || !json) {
        cb("updateRedisCache failed :: param is null");
        return;
    }

    var table = this.dbTable.getTable(tableName);
    if (!table) {
        cb(`updateRedisCache :: can not find table by data::${tableName}`);
        return;
    } else if (!table[PRIMARY_KEY]) {
        cb(`updateRedisCache :: table has no pri key by data::${tableName}`);
        return;
    }
    if (!!table[FOREIGN_KEY]) {
        if (isNaN(index)) {
            cb(`table has foreignKey mast has index!::${tableName}`);
            return;
        }
        // list
        var cacheKey = tableName + ":" + json[table[FOREIGN_KEY]];
        this.redisClient.lset(cacheKey, index, JSON.stringify(json), cb);
    } else {
        // map
        this.redisClient.hset(tableName, json[table[PRIMARY_KEY]], JSON.stringify(json), cb);
    }
};

/**
 * 删除list中的某个值
 * @param tableName
 * @param foreignValue
 * @param toRem
 * @param cb
 */
pro.removeCacheByValue = function(tableName, foreignValue, toRem, cb) {
    var key = tableName + ":" + foreignValue;
    if (Array.isArray(toRem)) {
        var pipeArr = [];
        toRem.forEach((v)=>{
            pipeArr.push(['lrem', key, 0, v]);
        });
        this.redisClient.pipeline(pipeArr).exec(cb);
    } else {
        this.redisClient.lrem(key, toRem, cb);
    }
};

/**
 * 删除list
 * @param tableName
 * @param foreignValue
 * @param cb
 */
pro.removeCacheByKey = function(tableName, foreignValue, cb) {
    var key = tableName + ":" + foreignValue;
    this.redisClient.del(key, cb);
};

/**
 * 根据根表和根表主键值,删除其和其下相关的数据缓存.
 * @param tableName
 * @param primaryValue
 * @param foreignValue
 * @param cb
 */
pro.deleteRedisCacheByFather = function(tableName, primaryValue, foreignValue, cb) {
    //console.error(`tableName:${tableName}, primaryValue:${primaryValue}, foreignValue:${foreignValue}`);
    if (!tableName || !primaryValue) {
        cb(`params is null`);
        return;
    }
    var self = this;
    var table = self.dbTable.getTable(tableName);
    if (!table) {
        cb(`delete cache failed:: can not find table by tableName::${tableName}`);
        return;
    }
    var pipeArr = [];   // 待删除数据
    // 自身数据加入待删除
    if (!!table[FOREIGN_KEY]) {
        pipeArr.push(['del', tableName + ":" + foreignValue]);
    } else {
        pipeArr.push(['hdel', tableName, primaryValue]);
    }
    var getSonOrder = function(tName, primaryValue, _cb) {
        var theTable = self.dbTable.getTable(tName);
        if (!theTable[SON_KEY]) {
            _cb();
            return;
        }
        var sonNames = theTable[SON_KEY];
        var sonPipe = [], sonCacheKey = "";
        sonNames.forEach((sonN)=>{
            sonCacheKey = sonN + ":" + primaryValue;        // 父亲的主键是儿子的外键
            sonPipe.push(["lrange", sonCacheKey, 0, -1]);   // 寻找子数据
            pipeArr.push(['del', sonCacheKey]);             // 将子数据加入待删除
        });
        // 寻找子数据
        self.redisClient.pipeline(sonPipe).exec((err, data)=>{
            if (!!err) {
                _cb();
                console.error(`sonPipe err : ${err}`);
                return;
            }
            var length = 0;         // 多少个有效的儿子
            data.forEach((aData)=>{ // aData结构 [null, [data]]
                length += aData[1].length;
            });
            if (length == 0) {
                _cb();
                return;
            }
            var count = 0;      // 多少个儿子完成了找孙子的任务
            var checkEnd = function() {
                ++count === length && _cb();
            };
            var sonN = "", sonPri = null;
            data.forEach((aData, idx)=>{ // aData结构 [null, [data]]
                sonN = sonNames[idx];
                sonPri = self.dbTable.getTable(sonN)[PRIMARY_KEY];
                aData[1].forEach((aSonData)=>{
                    // 将子数据作为父数据,向下继续查找子数据
                    getSonOrder(sonN, JSON.parse(aSonData)[sonPri], checkEnd);
                });
            });
        });
    };
    getSonOrder(tableName, primaryValue, ()=>{
        self.redisClient.pipeline(pipeArr).exec(cb); // 统一删除待删除数据
    });
};

/**
 * 执行lua脚本
 * @param lua
 * @param paramNum
 * @param keysArray
 * @param [Array] paramsArray
 * @param cb
 */
pro.runLua = function(lua, paramNum, keysArray, paramsArray, cb) {
    if (typeof paramsArray == 'function') {
        cb = paramsArray;
        paramsArray = keysArray;
    }
    this.redisClient.eval(lua, paramNum, keysArray, paramsArray, (err, res)=>{
        cb(err, res);
    });
};