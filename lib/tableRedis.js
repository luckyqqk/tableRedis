/**
 * mysql数据表的redis缓存工具类
 * 封装好的CRUD方法,很适合手游研发的表数据缓存.
 * 缓存策略是根据父表id作为key,子表数据作为value.
 * 现仅支持list,其他数据类型也留好了实现位置,在同包的对应js中.
 * date:17/5/8
 * @author wuqingkai
 * @param {Object} app
 * @param {Object} opts
 */
var TableRedis = function(app, opts){
    this.app = app;
    this.opts = opts || {};
    this.host = this.opts.host;
    this.port = this.opts.port;
    this.tableForRedis = this.opts.tableForRedis;

    this.tables = null;
    this.dataType = {};
    this.dataType['list'] = require('./list');
    this.dataType['hash'] = require('./hash');
    this.dataType['set'] = require('./set');
    this.dataType['zset'] = require('./zset');
};
module.exports = TableRedis;
var pro = TableRedis.prototype;

var REDIS_TYPE              = "redisType";      // 以何数据格式存入redis
var SON_TABLES              = "sonTables";

pro.start = function(cb) {
    this.tables = require(this.app.getBase() + this.tableForRedis);
    for (var tableName in this.tables) {
        this.tables[tableName]['tableName'] = tableName;
    }
    this.redis = require("redis").createClient(this.port, this.host, this.opts);
    this.redis.on("error", function (err) {
        console.error(`redisErr:${err}`);
    });
    cb();
};

pro.stop = function(cb) {
    this.tables = null;
    this.dataType = null;
    cb();
};

/**
 * 缓存数据
 * @param tableName {string}            表名
 * @param toSet     {obj||Array}     将要设置缓存的数据(单条或多条)
 * @param cb
 */
pro.addRedisCache = function(tableName, toSet, cb) {
    if (!tableName || !toSet) {
        cb(`params null`);
        return;
    }
    var table = this.tables[tableName];
    this.dataType[table[REDIS_TYPE]].addCache(this.redis, table, toSet, cb);
};

/**
 * 获取缓存数据
 * @param tableName
 * @param priValue  含主键,取主键对应数据,否则取外键对应的数据组
 * @param forValue
 * @param cb
 */
pro.getRedisCache = function(tableName, priValue, forValue, cb) {
    var table = this.tables[tableName];
    this.dataType[table[REDIS_TYPE]].getCache(this.redis, table, priValue, forValue, cb);
};

/**
 * 更新数据
 * @param tableName
 * @param json
 * @param cb
 */
pro.updateRedisCache = function(tableName, json, cb) {
    var table = this.tables[tableName];
    var typeMgr = this.dataType[table[REDIS_TYPE]];
    typeMgr.updCache(this.redis, table, json, cb);
};

/**
 * 删除缓存
 * @param tableName
 * @param priValue  含主键,删除主键对应数据,否则删除外键对应的数据组
 * @param forValue
 * @param cb
 */
pro.removeRedisCache = function(tableName, priValue, forValue, cb) {
    var table = this.tables[tableName];
    this.dataType[table[REDIS_TYPE]].remCache(this.redis, table, priValue, forValue, cb);
};

/**
 * 根据根表和根表主键值,删除其和其下相关的数据缓存.
 * @param tableName
 * @param priValue
 * @param forValue
 * @param cb
 */
pro.removeCacheByFather = function(tableName, priValue, forValue, cb) {
    //console.error(`tableName:${tableName}, primaryValue:${primaryValue}, foreignValue:${foreignValue}`);
    if (!tableName || !priValue) {
        cb(`params is null`);
        return;
    }
    var self = this;
    var table = self.tables[tableName];
    if (!table) {
        cb(`delete cache failed:: can not find table by tableName::${tableName}`);
        return;
    }
    var pipeArr = [];   // 待删除数据
    // 自身数据加入待删除
    pipeArr.push(['del', tableName + ":" + forValue]);

    var getSonOrder = function(tName, primaryValue, _cb) {
        var theTable = self.tables[tName];
        if (!theTable[SON_TABLES]) {
            _cb();
            return;
        }
        var sonNames = theTable[SON_TABLES];
        var sonPipe = [], sonTable = null, sonType = null, sonCacheKey = "";
        sonNames.forEach((sonN)=>{
            sonTable = self.tables[sonN];
            sonType = self.dataType[sonTable[REDIS_TYPE]];
            // 父亲的主键是儿子的外键
            sonCacheKey = sonType.makeKey(sonN, sonTable['foreignKey'], 0, primaryValue);
            sonPipe.push(sonType.getCacheOrder(sonCacheKey));   // 寻找子数据
            pipeArr.push(['del', sonCacheKey]);                 // 将子数据加入待删除(del是通用删除)
        });
        // 寻找子数据
        self.redis.multi(sonPipe).exec((err, data)=>{
            if (!!err) {
                _cb();
                console.error(`sonPipe err : ${err}`);
                return;
            }
            var length = 0;         // 多少个有效的儿子
            data.forEach((aData)=>{ // aData结构 [null, [data]]
                length += aData.length;
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
                sonPri = self.tables[sonN]['primaryKey'];
                aData.forEach((aSonData)=>{
                    // 将子数据作为父数据,向下继续查找子数据
                    getSonOrder(sonN, JSON.parse(aSonData)[sonPri], checkEnd);
                });
            });
        });
    };
    getSonOrder(tableName, priValue, ()=>{
        self.redis.multi(pipeArr).exec(cb); // 统一删除待删除数据
    });
};

/**
 * 执行lua脚本
 * @param lua
 * @param paramNum
 * @param keysArray
 * @param {[Array]} paramsArray
 * @param cb
 */
pro.runLua = function(lua, paramNum, keysArray, paramsArray, cb) {
    if (typeof paramsArray == 'function') {
        cb = paramsArray;
        paramsArray = keysArray;
    }
    this.redis.eval(lua, paramNum, keysArray, paramsArray, (err, res)=>{
        cb(err, res);
    });
};

/**
 * 获得redis客户端
 * @returns {*}
 */
pro.getRedisClient = function() {
    return this.redis;
};