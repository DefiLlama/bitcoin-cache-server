const ElectrumClient = require('electrum-client');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { PromisePool } = require('@supercharge/promise-pool')
bitcoin.initEccLib(ecc);

// https://1209k.com/bitcoin-eye/ele.php?chain=doge
const configStr = `electrum3.cipig.net,10060,tcp,00000000,5633273,2025-03-20,10:06:18,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
electrum3.cipig.net,20060,ssl,00000000,5633273,2025-03-20,10:06:18,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
doge.aftrek.org,50002,ssl,00000000,5633273,2025-03-20,10:06:19,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
doge.aftrek.org,50001,tcp,00000000,5633273,2025-03-20,10:06:19,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
electrum1.cipig.net,10060,tcp,00000000,5633273,2025-03-20,10:06:22,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
electrum1.cipig.net,20060,ssl,00000000,5633273,2025-03-20,10:06:22,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
electrum2.cipig.net,10060,tcp,00000000,5633273,2025-03-20,10:06:23,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
electrum2.cipig.net,20060,ssl,00000000,5633273,2025-03-20,10:06:23,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
dogecoin.stackwallet.com,50022,ssl,00000000,5633273,2025-03-20,10:06:23,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,0.9475`
const configs = configStr.split('\n').map(line => {
  const [host, port, protocol] = line.split(',')
  return { host, port, protocol }
})

const eClients = []

async function init() {
  if (eClients.length > 0)
    return;


  let contolAddress = 'D7BrtudMAdwz2U7vSGumVDuxZsZNibJuzw'

  const scripthash = addressToScripthash(contolAddress);
  await PromisePool
    .withConcurrency(15)
    .for(configs)
    .process(async ({ host, port, protocol }) => {
      const client = new ElectrumClient(port, host, protocol)
      try {

        await client.connect();
        await client.server_version('bitske', '1.4');
        const res = await client.blockchainScripthash_getBalance(scripthash);
        // console.log(res.confirmed, `Found a working Doge server: ${host}:${port}`);
        eClients.push({ host, port, protocol })
        await client.close();
      } catch (error) {
        await client.close();
        console.error('Error querying balance:', error);
      }
    })
  console.log('Doge: working electrum clients', eClients.length)
}

const dogecoin = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: 'dc',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e
};

function addressToScripthash(address) {
  const script = bitcoin.address.toOutputScript(address, dogecoin);
  const hash = bitcoin.crypto.sha256(script);
  return Buffer.from(hash.reverse()).toString('hex');
}

module.exports = {
  init,
  addressToScripthash,
  eClients,
}