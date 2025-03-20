const ElectrumClient = require('electrum-client');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { PromisePool } = require('@supercharge/promise-pool')

const bchaddr = require('bchaddrjs');
bitcoin.initEccLib(ecc);


// NOT WORKING FOR SOME REASON, maybe try this bchaddrjs


// https://1209k.com/bitcoin-eye/ele.php?chain=bch
const configStr = `electroncash.dk,50002,ssl,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
fulcrum.kronbit.com,50002,ssl,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
electrum.imaginary.cash,50002,ssl,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
bch.imaginary.cash,50002,ssl,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
bch.loping.net,50002,ssl,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,0.9985
electrum.imaginary.cash,50001,tcp,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
cashnode.bch.ninja,50002,ssl,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
cashnode.bch.ninja,50001,tcp,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
fulcrum.criptolayer.net,50002,ssl,00000000,890290,2025-03-20,10:05:32,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
bch0.kister.net,50002,ssl,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
bch.soul-dev.com,50002,ssl,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
fulcrum.aglauck.com,50002,ssl,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
fulcrum.jettscythe.xyz,50002,ssl,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
fulcrum.jettscythe.xyz,50001,tcp,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
bch.reichster.de,50002,ssl,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
node.minisatoshi.cash,50002,ssl,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,1.0000
blackie.c3-soft.com,50002,ssl,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
fulcrum-cash.1209k.com,50002,ssl,00000000,890290,2025-03-20,10:05:33,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
niblerino.com,50002,ssl,00000000,890290,2025-03-20,10:05:34,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
electron.jochen-hoenicke.de,51002,ssl,00000000,890290,2025-03-20,10:05:34,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
bch.aftrek.org,50002,ssl,00000000,890290,2025-03-20,10:05:34,Fulcrum,1.11.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,1.0000
bch.cyberbits.eu,50002,ssl,00000000,890290,2025-03-20,10:05:34,Fulcrum,1.11.1,1.4,open,2025-03-20,02:40:06,OK,1.0000,1.0000,1.0000
bitcoincash.stackwallet.com,50002,ssl,00000000,890290,2025-03-20,10:05:34,Fulcrum,1.9.8,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,0.9568
electrumx-bch.cryptonermal.net,50001,tcp,00000000,890290,2025-03-20,10:05:37,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:04,OK,1.0000,1.0000,0.9126
electrumx-bch.cryptonermal.net,50002,ssl,00000000,890290,2025-03-20,10:05:37,ElectrumX,1.16.0,1.4,open,2025-03-20,02:40:05,OK,1.0000,1.0000,0.9126`

const configs = configStr.split('\n').map(line => {
  const [host, port, protocol] = line.split(',')
  return { host, port, protocol }
})

const eClients = []

async function init() {
  if (eClients.length > 0)
    return;


  let contolAddress = 'qzfew0ck3kxjdytrr2vnycdjnnsyju3pwsrgsupqj2'

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
        // console.log(`Found a working BCH server: ${host}:${port}`);
        eClients.push({ host, port, protocol })
        await client.close();
      } catch (error) {
        await client.close();
        console.error('Error querying balance:', error);
      }
    })
  console.log('BCH: working electrum clients', eClients.length)
}



function addressToScripthash(address) {
  address = bchaddr.toLegacyAddress(address);
  const script = bitcoin.address.toOutputScript(address);
  const hash = bitcoin.crypto.sha256(script);
  return Buffer.from(hash.reverse()).toString('hex');
}

module.exports = {
  init,
  addressToScripthash,
  eClients,
}