const { getBalances } = require(".")
const a = require("./addresses.json")

async function main() {
  const size = 2990
  const count = Math.ceil(a.length / size)
  for (let i = 0; i < count; i++) {
    const arr = a.slice(i * size, (i + 1) * size)
    console.log('Processing chunk', i, '/', count, 'with', arr.length, 'addresses')
    const res = await getBalances({ network: 'BTC', addresses: arr, skipCacheRead: true })
    // if (res === 0) console.log(arr)
    console.log(i, '/', count, arr.length, res / 1e8)
  }
  console.log('Done')
}


main().then(console.log).catch(console.error).finally(() => process.exit(0))