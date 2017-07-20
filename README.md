# Saluki2-Node-Client
node rpc client based on grpc and eureka

## Install
```bash
npm install saluki2-node -S
```

### Usage
```js
const Saluki2Client = require('saluki2-node')
// or if you use compiler
import Saluki2Client from 'saluki2-node'

const client = new Saluki2Client({
  // ... config here
})
```

### Config
```js
// your config.js
const pkg = require('./package.json') // import your package.json

module.exports = {
  root: __dirname, // your project root path
  port: 3000 // your node application port
  // saluki2 config
  saluki2: {
    appName: pkg.name, // node application name
    version: pkg.version, // node application version
    // eureka server urls
    urls: 'http://10.42.169.144:8761/eureka/apps,http://10.42.10.250:8761/eureka/apps,http://10.42.140.37:8761/eureka/apps',
    // service dictionary
    services: {
      UserService: 'com.quancheng.zeus.service.UserService:zeus-service:1.0.0'
    }
  }
}
```