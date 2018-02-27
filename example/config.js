const pkg = require('./../package.json')
const { resolve } = require('path')

module.exports = {
  root: resolve(__dirname, '../'),
  port: 3010,
  saluki2: {
    name: pkg.name,
    version: pkg.version,
    urls: 'http://10.42.169.144:8761/eureka/apps,http://10.42.10.250:8761/eureka/apps,http://10.42.140.37:8761/eureka/apps',
    services: {
      UserService: 'com.quancheng.zeus.service.UserService:zeus-service-fk:1.0.0'
    }
  }
}
