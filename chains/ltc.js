const ElectrumClient = require('electrum-client');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { PromisePool } = require('@supercharge/promise-pool')
bitcoin.initEccLib(ecc);

// https://1209k.com/bitcoin-eye/ele.php?chain=ltc
const configStr = `fallacy.fiatfaucet.com,50002,ssl,00000000,2864987,2025-03-20,10:06:17,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
litecoin.stackwallet.com,20063,ssl,00000000,2864987,2025-03-20,10:06:18,Fulcrum,1.9.8,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
188.166.208.106,50002,ssl,00000000,2864987,2025-03-20,10:06:18,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
5.78.97.174,50002,ssl,00000000,2864987,2025-03-20,10:06:19,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
electrum2.cipig.net,10063,tcp,00000000,2864986,2025-03-20,10:05:31,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,0.9966,0.9995
electrum2.cipig.net,20063,ssl,00000000,2864986,2025-03-20,10:05:31,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,0.9966,0.9995
ltc.aftrek.org,50001,tcp,00000000,2864986,2025-03-20,10:05:31,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
ltc.aftrek.org,50002,ssl,00000000,2864986,2025-03-20,10:05:32,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
electrum3.cipig.net,10063,tcp,00000000,2864986,2025-03-20,10:05:34,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,0.9998
electrum3.cipig.net,20063,ssl,00000000,2864986,2025-03-20,10:05:34,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,0.9998
5.161.216.180,50002,ssl,00000000,2864986,2025-03-20,10:05:34,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,0.9971
electrum1.cipig.net,10063,tcp,00000000,2864986,2025-03-20,10:05:35,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,0.9995
electrum1.cipig.net,20063,ssl,00000000,2864986,2025-03-20,10:05:35,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,0.9995
electrum-ltc.bysh.me,50002,ssl,00000000,2864986,2025-03-20,10:05:36,ElectrumX,1.15.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,0.9988
backup.electrum-ltc.org,50002,ssl,00000000,2864986,2025-03-20,10:06:06,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,0.9758
backup.electrum-ltc.org,443,ssl,00000000,2864986,2025-03-20,10:06:06,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,0.9758
backup.electrum-ltc.org,50001,tcp,00000000,2864986,2025-03-20,10:06:06,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,0.9758`
const configs = configStr.split('\n').map(line => {
  const [host, port, protocol] = line.split(',')
  return { host, port, protocol }
})

const eClients = []

async function init() {
  if (eClients.length > 0)
    return;


  let contolAddress = 'LXTras9zXwkUvmsAF15hUu86by2UdNLSWk'

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
        // console.log(res.confirmed, `Found a working ltc server: ${host}:${port}`);
        eClients.push({ host, port, protocol })
        await client.close();
      } catch (error) {
        await client.close();
        console.error('Error querying balance:', error);
      }
    })
  console.log('ltc: working electrum clients', eClients.length)
}

const litecoin = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0
};

function addressToScripthash(address) {
  const script = bitcoin.address.toOutputScript(address, litecoin);
  const hash = bitcoin.crypto.sha256(script);
  return Buffer.from(hash.reverse()).toString('hex');
}

module.exports = {
  init,
  addressToScripthash,
  eClients,
}