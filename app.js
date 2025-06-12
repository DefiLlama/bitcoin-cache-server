
const HyperExpress = require('hyper-express')
const { getBalances, init } = require('./chains')

const webserver = new HyperExpress.Server()

const port = +(process.env.PORT ?? 5001)
const skipSubPath = process.env.API2_SKIP_SUBPATH === 'true'

if (!skipSubPath && !process.env.API2_SUBPATH) throw new Error('Missing API2_SUBPATH env var')

async function main() {
  console.time('Api Server init')
  // await init()
  webserver.use((_req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*');
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    next();
  });

  if (skipSubPath) {
    setRoutes(webserver, '/')
  }

  if (process.env.API2_SUBPATH) {
    const router = new HyperExpress.Router()
    const subPath = '/' + process.env.API2_SUBPATH
    webserver.use(subPath, router)

    setRoutes(router, subPath)
  }
  webserver.get('/hash', (_req, res) => res.send('yes'))

  webserver.listen(port)
    .then(() => {
      console.timeEnd('Api Server init')
      console.log('Webserver started on port ' + port)
    })
    .catch((e) => console.log('Failed to start webserver on port ' + port, e.message))
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('Shutting down gracefully...');
  setTimeout(() => process.exit(0), 5000); // wait 5 seconds before forcing shutdown
  webserver.close(() => {
    console.log('Server has been shut down gracefully');
    process.exit(0);
  })
}

main()


function setRoutes(router) {
  router.post('/get-balance', async (req, res) => {
    const { addresses, network, combined = true, skipCacheRead = false, } = await req.json()

    if (!Array.isArray(addresses) || typeof network !== 'string' || typeof combined !== 'boolean' || typeof skipCacheRead !== 'boolean') {
      return res.status(400).send('Invalid input');
    }

    const response = await getBalances({ addresses, network, combined, skipCacheRead });
    res.json(response)
  });
}