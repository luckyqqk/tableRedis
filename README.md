# tableRedis
mysql table data redis cache tool

### 作用分析
* 作为服务器研发,缓存的使用很重要,写逻辑的时候总会去考虑什么地方加缓存,什么地方删缓存.
* 不可多加,更不可少加.经验不足的工程师往往会因为缓存的考虑不周而导致很奇怪的bug.
* 为了避免不必要的bug和增加研发的速度,某写了一个缓存的工具类.
* 游戏研发中的数据结构很有意思,playerId是几乎所有用户表的外键.那么,
* 该工具类就根据这个特点,采用了根据外键缓存到redis中,再加上一些方法,提供CRUD的接口,该工具类就完成了.
* 注:目前仅支持list格式,其他格式的文件已经添加,相应的方法还未实现,如有需求者可自行在对应的js中添加相应的方法即可使用.
* 但游戏中的数据并非所有都具有这个特点,其它情况可调用getRedisClient方法获得redis客户端自行存储.

### 依赖
```
"dependencies": {
		"redis": "^2.8.0"
}
```
### pomelo配置
1.安装, 进入项目目录的game-server
```
npm install table-redis --save
```
2.建立自己表的结构和缓存方式的excel,我已在excelDemo中提交示例的excel.
建立好excel后用[倒表工具](https://github.com/luckyqqk/excel2json)导出json,并记住json位置.

3.进入config文件夹,创建talbeRedis文件夹,进入tableRedis文件夹,创建redis.json.
```
{
  "redis" : {
    "host" : "192.168.1.xxx",
    "port" : 6379,
    "tableForRedis":"/app/data/json/tableForRedis"	// 缓存配置的json
  }
}
```
4.在app.js中的服务配置中添加如下代码
```
app.use(TableRedis, require(app.getBase() + "/config/tableRedis/redis.json"));
```

### 方法支持

#### 缓存数据,参数toSet支持数组
* @param {string}          tableName   表名
* @param {(object|array)}  toSet       将要设置缓存的数据(单条或多条)
* @param {number}          [expire]    缓存过期时间(秒)
```
addRedisCache = function(tableName, toSet, expire, cb)
```
#### 获取缓存数据
* @param tableName
* @param priValue  主键不为0,则获取主键对应数据,否则获取外键对应数据
* @param forValue
```
getRedisCache = function(tableName, priValue, forValue, cb)
```
#### 更新数据
* @param {number}      [expire]             缓存过期时间(秒)
```
updateRedisCache = function(tableName, json, expire, cb)
```
#### 删除缓存
* @param priValue  主键不为0,则删除主键对应数据,否则删除外键对应数据
```
removeRedisCache = function(tableName, priValue, forValue, cb)
```
#### 根据根表和根表主键值,删除其和其下相关的数据缓存.(玩家下线时调用)
```
removeCacheByFather = function(tableName, priValue, forValue, cb)
```
### 获得redis客户端
```
getRedisClient = function()
```
#### 执行lua脚本(附加功能,实际项目中没怎么用过)
```
runLua(lua, paramNum, keysArray, paramsArray, cb)
```
