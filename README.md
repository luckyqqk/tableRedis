# tableRedis
mysql table data redis cache tool

### 作用分析
* 作为服务器研发,缓存的使用很重要,写逻辑的时候总会去考虑什么地方加缓存,什么地方删缓存.
* 不可多加,更不可少加.经验不足的工程师往往会因为缓存的考虑不周而导致很奇怪的bug.
* 为了避免不必要的bug和增加研发的速度,某写了一个缓存的工具类.
* 该类使用了自研的[dbTable](https://github.com/luckyqqk/dbTable.git),一个加载了mysql表结构关系的工具类.
* 游戏研发中的数据结构很有意思,playerId是几乎所有用户表的外键.那么,
* 该工具类就根据这个特点,采用了根据外键缓存到redis中list结构的方式,再加上一些方法,提供CRUD的接口,该工具类就完成了.

### 依赖
```
"dependencies": {
		"ioredis": "^3.1.4"
}
```

### 方法支持

#### 缓存数据,参数toSet支持数组
```
addRedisCache(tableName, toSet, cb)
```
#### 获取缓存数据, sigin即为外键值
```
getRedisCache(tableName, sign, cb)
```
#### 获取list中某下标的数据
```
getRedisCacheByIndex(tableName, sign, index, cb)
```
#### 更新list中某下标的数据
```
updateRedisCache(tableName, json, index, cb)
```
#### 删除list中的某个值
```
removeCacheByValue(tableName, foreignValue, toRem, cb)
```
#### 删除list
```
removeCacheByKey(tableName, foreignValue, cb)
```
#### 根据根表和根表主键值,删除其和其下相关的数据缓存.(玩家下线时调用)
```
deleteRedisCacheByFather(tableName, primaryValue, foreignValue, cb)
```

#### 执行lua脚本(附加功能,实际项目中没怎么用过)
```
runLua(lua, paramNum, keysArray, paramsArray, cb)
```
