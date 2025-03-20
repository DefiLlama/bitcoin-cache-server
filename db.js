const Redis = require('ioredis');

let _redis


function getRedisConnection() {
  if (_redis) return _redis;
  if (!process.env.COMMON_REDIS_CACHE) {
    throw new Error('Missing COMMON_REDIS_CACHE env variable')
  }
  _redis = new Redis(process.env.COMMON_REDIS_CACHE)
  return _redis;
}

process.on("exit", async () => {
  if (_redis) {
    const redis = await _redis;
    redis.quit();
  }
});

async function testRedisConnection() {
  const redis = getRedisConnection();
  try {
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    if (value === 'test_value') {
      console.log('Redis connection works and able to write.');
    } else {
      console.log('Redis connection failed to write.');
    }
  } catch (error) {
    console.error('Error testing Redis connection:', error);
  }
}

module.exports = { getRedisConnection };