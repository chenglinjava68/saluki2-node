const pkg = require('./../package.json')
const { resolve } = require('path')

module.exports = {
  root: resolve(__dirname, '../'),
  port: 3010,
  saluki2: {
    name: pkg.name,
    version: pkg.version,
    urls:
      'http://10.42.169.144:8761/eureka/apps,http://10.42.10.250:8761/eureka/apps,http://10.42.140.37:8761/eureka/apps',
    services: {
      UserService:
        'com.quancheng.zeus.service.UserService:zeus-service-fk:1.0.0',
      SmsService: {
        package:
          'com.quancheng.samoyed.sms.service.SmsService:samoyed-service:1.0.0',
        source: 'node_modules/@quancheng'
      },
      ConfigService:
        'com.quancheng.config.service.ConfigService:mercury-service-fk:1.0.0',
      BorrowService:
        'com.quancheng.ceres.service.BorrowService:persephone-service:1.0.0',
      AccountSearchService:
        'com.quancheng.zeus.service.AccountSearchService:sparta-search:1.0.0'
    }
  }
}
