const bitcoin = require('./bitcoin')
const litecoin = require('./ltc')
const bch = require('./bch')
const dogecoin = require('./doge')
const { getRedisConnection } = require('../db');
const { PromisePool } = require('@supercharge/promise-pool')
const ElectrumClient = require('electrum-client');

const networkMap = {
  'BTC': bitcoin,
  // 'LTC': litecoin,
  // 'BCH': bch,
  // 'DOGE': dogecoin
}

async function init() {
  const initFns = Object.values(networkMap).map(network => network.init())
  await Promise.all(initFns)
}

const ONE_HOUR = 3600;

function getTtl(balance) {
  if (balance > 1e9) {
    return ONE_HOUR
  } else if (balance > 1e8) {
    return ONE_HOUR * 4
  } else if (balance > 1e6) {
    return ONE_HOUR * 13;
  } else {
    return ONE_HOUR * 44
  }
}

async function _getBalances(network, addresses) {
  if (!networkMap[network]) {
    throw new Error(`Unsupported network. Supported networks: ${Object.keys(networkMap).join(', ')}`)
  }

  const { eClients, addressToScripthash, } = networkMap[network];

  const client = getRedisConnection();
  const cachedBalances = await client.mget(addresses);
  const missingAddresses = [];
  const redisActions = []
  const responseMap = {}
  const { errors } = await PromisePool.for(addresses)
    .withConcurrency(31)
    .process(async (address, index) => {
      const cachedBalance = cachedBalances[index] ? cachedBalances[index] : null;
      if (cachedBalance !== null) {
        responseMap[address] = cachedBalance;
      } else {
        missingAddresses.push(address);
        const balance = await getBalance(address);
        responseMap[address] = balance;
        redisActions.push(['setex', address, getTtl(+balance), balance]);
      }
    })

  if (errors.length)
    console.log('responseMap', responseMap, errors)

  if (redisActions.length > 0)
    await client.multi(redisActions).exec();

  return responseMap

  function getRandomClient() {
    if (eClients.length === 0) {
      throw new Error('No working electrum clients');
    }
    return eClients[Math.floor(Math.random() * eClients.length)];
    return new ElectrumClient(port, host, protocol);
  }


  async function getBalance(address, retriesLeft = 3) {
    const client = getRandomClient();
    try {
      const scripthash = addressToScripthash(address);

      const balance = await client.blockchainScripthash_getBalance(scripthash);
      await client.close();
      return balance.confirmed
    } catch (error) {
      console.error('Error querying balance:', error);
      await client.close();
      if (retriesLeft > 0) {
        console.log('Retrying...');
        return getBalance(address, retriesLeft - 1);
      } else {
        console.error('No more retries left');
        return;
      }
    }
  }
}

async function getBalances({ network, addresses, combined = true }) {
  const chunks = [];
  const chunkSize = 500;
  let resNumber = 0
  let resObject = {}
  for (let i = 0; i < addresses.length; i += chunkSize) {
    chunks.push(addresses.slice(i, i + chunkSize));
  }
  for (const chunk of chunks) {
    const balances = await _getBalances(network, chunk);
    if (combined) {
      resNumber = Object.values(balances).filter(balance => !isNaN(balance)).reduce((a, b) => a + +b, resNumber);
    } else {
      resObject = { ...resObject, ...balances };
    }
  }
  return combined ? resNumber : resObject;
}


async function getBalances2({ network, addresses, combined = true }) {
  if (network !== 'BTC') throw new Error('Unsupported network. Supported networks: BTC')
  const client = getRedisConnection();

  const chunks = [];
  const allMissingAddresses = [];
  const missingAddressesChunks = [];
  const chunkSize = 500;
  const missingChunkSize = 99;
  let resNumber = 0
  let resObject = {}

  for (let i = 0; i < addresses.length; i += chunkSize) {
    chunks.push(addresses.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const { balances, missingAddresses } = await _getBalancesRedis(chunk);
    allMissingAddresses.push(...missingAddresses);
    if (combined) {
      resNumber = Object.values(balances).filter(balance => !isNaN(balance)).reduce((a, b) => a + +b, resNumber);
    } else {
      resObject = { ...resObject, ...balances };
    }
  }



  for (let i = 0; i < allMissingAddresses.length; i += missingChunkSize) {
    missingAddressesChunks.push(allMissingAddresses.slice(i, i + missingChunkSize));
  }

  for (const chunk of missingAddressesChunks) {
    const balances = await _getBalances(chunk);
    if (missingAddressesChunks.length > 5)
      await sleep(1000)
    if (combined) {
      resNumber = Object.values(balances).filter(balance => !isNaN(balance)).reduce((a, b) => a + +b, resNumber);
    } else {
      resObject = { ...resObject, ...balances };
    }
  }

  return combined ? resNumber : resObject;




  async function _getBalancesRedis(addrs) {
    const client = getRedisConnection();
    const cachedBalances = await client.mget(addresses);
    const missingAddresses = [];
    const balances = {}
    cachedBalances.forEach((balance, index) => {
      if (balance !== null) {
        balances[addrs[index]] = balance;
      } else {
        missingAddresses.push(addrs[index]);
      }
    })
    return { balances, missingAddresses }
  }

  async function _getBalances(addrs) {
    const balances = await bitcoin.pullFromBlockchainInfo(addrs);
    const redisActions = []
    Object.entries(balances).forEach(([address, balance]) => {
      redisActions.push(['setex', address, getTtl(+balance), balance]);
    })

    if (redisActions.length > 0)
      await client.multi(redisActions).exec();
    return balances
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  init,
  getBalances: getBalances2,
}