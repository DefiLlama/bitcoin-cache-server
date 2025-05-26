const axios = require('axios')
const retry = require('async-retry')
const { elastic } = require('@defillama/sdk')

const token = {}

const HEADERS = {
  "Content-Type": "application/json",
  "X-API-KEY": process.env.ALLIUM_API_KEY,
};

async function startAlliumQuery(sqlQuery) {
  const { data: { run_id } } = await axios.post(`https://api.allium.so/api/v1/explorer/queries/phBjLzIZ8uUIDlp0dD3N/run-async`, {
    parameters: {
      fullQuery: sqlQuery
    }
  }, {
    headers: HEADERS
  })

  return run_id
}

async function retrieveAlliumResults(queryId, sqlQuery, timeoutId) {
  const { data: { data } } = await axios.get(`https://api.allium.so/api/v1/explorer/query-runs/${queryId}/results?f=json`, {
    headers: HEADERS
  })
  delete token[sqlQuery]
  clearTimeout(timeoutId)
  return data
}

async function queryAllium(sqlQuery) {
  let startTime = +Date.now() / 1e3
  const metadata = {
    application: "allium",
    query: 'bitcoin-cache',
    table: 'bitcoin-cache',
  }
  success = false

  try {
    const response = await _queryAllium(sqlQuery);
    success = true
    let endTime = +Date.now() / 1e3
    await elastic.addRuntimeLog({ runtime: endTime - startTime, success, metadata, })
    return response
  } catch (e) {
    await elastic.addRuntimeLog({ runtime: endTime - startTime, success, metadata, })
    await elastic.addErrorLog({ error: (e?.toString()), metadata, })
    throw e
  }
}

async function _queryAllium(sqlQuery) {

  const timeoutId = setTimeout(() => {
    delete token[sqlQuery]
  }, 1000 * 60 * 10)


  return await retry(
    async (bail) => {
      if (!token[sqlQuery]) {
        try {
          token[sqlQuery] = await startAlliumQuery(sqlQuery);
        } catch (e) {
          console.log("query run-async", e);
          throw e
        }
      }

      if (!token[sqlQuery]) {
        throw new Error("Couldn't get a token from allium")
      }

      const { data: status } = await axios.get(`https://api.allium.so/api/v1/explorer/query-runs/${token[sqlQuery]}/status`, {
        headers: HEADERS
      })

      if (status === "success") {
        return retrieveAlliumResults(token[sqlQuery], sqlQuery, timeoutId)
      } else if (status === "failed") {
        // console.log(`Query ${sqlQuery} failed`, statusReq.data)
        bail(new Error(`Query ${sqlQuery} failed, error ${JSON.stringify(statusReq.data)}`))
        return;
      }
      throw new Error("Still running")
    },
    {
      retries: 20,
      maxTimeout: 1000 * 60 * 30
    }
  );
}



async function pullFromAllium(addresses) {
  const startTime = new Date().getTime()

  const query = addrs => `
    SELECT address, balance as value from bitcoin.assets.balances_latest  
      WHERE address in (
      '${addrs.join("', '")}'
      )`
  const res = await queryAllium(query(addresses))

  const addressResponseMap = {}
  let btcSum = 0
  res.forEach(addr => {
    btcSum += +addr.value
    addressResponseMap[addr.address] = addr.value * 1e8
  })

  let missingCounter = 0
  addresses.forEach(addr => {
    if (!addressResponseMap[addr]) {
      // console.log('missing', addr)
      missingCounter++
      addressResponseMap[addr] = 0
    }
  })

  const timeTaken = new Date().getTime() - startTime

  console.log(new Date().toISOString(), 'allium', { addrCount: addresses.length, btcSum, missingCounter, timeTaken: Number(timeTaken / 1000).toFixed(2) })
  return addressResponseMap
}

module.exports = {
  pullFromAllium,
}
