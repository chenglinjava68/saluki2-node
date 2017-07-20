
const ip = require('ip')

module.exports = eurekaInstanceRegConfig = (config) => {
  config.saluki2 = config.saluki2 || {}

  const appName = config.saluki2.name || 'unnamed-node-client'
  const appVersion = config.saluki2.version || '0.0.0'
  const port = config.port || 3000
  const instanceName = `${appName}:${appVersion}`
  const ipAddr = ip.address()
  const url = (pageName = '') => `http://${ipAddr}:${port}/${pageName}`

  return {
    eureka: {
      serviceUrls: {
        default: config.saluki2.urls.split(',')
      }
    },
    instance: {
      app: instanceName,
      hostName: ipAddr,
      instanceId: `${Math.random()}:${instanceName}:${port}`,
      ipAddr: ipAddr,
      homePageUrl: url(),
      statusPageUrl: url('info'),
      healthCheckUrl: url('health'),
      secureVipAddress: instanceName,
      vipAddress: instanceName,
      port: {
        '$': port,
        '@enabled': 'true'
      },
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      }
    }
  }
}