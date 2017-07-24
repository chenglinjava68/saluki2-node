
const ip = require('ip')
const md5 = require('md5')

module.exports = eurekaInstanceRegConfig = (config) => {
  config.saluki2 = config.saluki2 || {}

  const appName = config.saluki2.name ? config.saluki2.name.replace('/', '-') : 'unnamed-node-client'
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
      instanceId: `${md5(new Date().getTime())}:${instanceName}:${port}`,
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