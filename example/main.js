const Koa = require('koa')
const app = new Koa()
const Saluki2Client = require('./../index')
const config = require('./config.js')

app.use(async ctx => {
  if (ctx.path.startsWith('/info')) {
    ctx.body = {}
    return
  }

  ctx.body = await client.services.UserService.get({ accountId: '103170405113016002' })
})

const client = new Saluki2Client(config)

client.init()

app.listen(config.port)
