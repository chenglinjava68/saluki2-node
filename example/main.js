const Koa = require('koa')
const app = new Koa()
const Saluki2Client = require('./../index')
const config = require('./config.js')

app.use(async ctx => {
  if (ctx.path.startsWith('/info')) {
    ctx.body = {}
    return
  }

  ctx.body = {
    user: await client.services.UserService.get({
      accountId: '103170405113016002'
    }),
    sendSms: await client.services.SmsService.sendSms({
      mobile: '18616348411'
    }),
    accountSearch: await client.services.AccountSearchService.accountSearch({
      accountId: '103170405113016002'
    }),
    borrow: await client.services.BorrowService.getBorrowAccounts({
      formId: '1111122323'
    })
  }
})

const client = new Saluki2Client(config)

client.init()

app.listen(config.port)
