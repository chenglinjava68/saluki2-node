const Eureka = require('eureka-js-client').Eureka
const fs = require('fs-extra')
const grpc = require('grpc')
const globby = require('globby')
const { join, resolve } = require('path')
const { defaultsDeep, random } = require('lodash')
const debug = require('debug')('saluki2-node')

const eurekaConfig = require('./eurekaConfig')

const grpcOptions = {
  'grpc.ssl_target_name_override': 'grpc',
  'grpc.default_authority': 'grpc',
  'grpc.max_send_message_length': 8 * 1024 * 1024,
  'grpc.max_receive_message_length': 8 * 1024 * 1024
}

const metadataUpdater = (service_url, callback) => {
  const metadata = new grpc.Metadata()
  metadata.set('plugin_key', 'plugin_value')
  callback(null, metadata)
}
// 缓存service链接信息
const serviceCache = {}

class BizError extends Error {
  constructor() {
    super()
  }
}

class Saluki2Client {
  constructor(config) {
    this.eurekaClient = new Eureka(eurekaConfig(config))
    this.config = config
    this.serviceConfig = config.saluki2.services
    this.combined_creds = null
    this.protos = {}
    this.services = {}
  }

  async init() {
    await this.initGrpcClient()
    await this.initServices()
  }

  async initGrpcClient() {
    await this._loadPem()
    await this._loadProto()
  }

  async initServices() {
    const notInstalledProto = new Map()
    try {
      await this._startEurekaClient()
      for (const serviceName of Object.keys(this.serviceConfig)) {
        const {
          packageName,
          applicationName,
          npmPackageName
        } = this._parseService(this.serviceConfig[serviceName])
        const packageNameArr = packageName.split('.')
        let grpcConstructor = this.protos[npmPackageName]

        while (grpcConstructor && packageNameArr.length) {
          grpcConstructor = grpcConstructor[packageNameArr[0]]
          packageNameArr.splice(0, 1)
        }

        if (!grpcConstructor) {
          if (!notInstalledProto.get(applicationName)) {
            notInstalledProto.set(applicationName, npmPackageName)
            console.warn(
              `${applicationName}: proto is not found. You may install it by: cnpm install @quancheng/${npmPackageName} --save`
            )
          }
          continue
        }
        this.services[serviceName] = this._wrapService({
          applicationName,
          serviceName,
          grpcConstructor
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  _wrapService(service) {
    const result = {}
    for (const method of Object.keys(service.grpcConstructor.service)) {
      result[method] = this._callService(service, method)
    }
    return result
  }

  _callService(service, methodName) {
    const { applicationName, serviceName, grpcConstructor } = service

    return (req, callback) => {
      return new Promise((resolve, reject) => {
        debug('called service app:', applicationName)
        debug('called service name:', serviceName)
        debug('called service method:', methodName)
        const client = this._getClientInstance(
          applicationName,
          serviceName,
          grpcConstructor
        )
        client.client[methodName](req, (err, resp) => {
          if (err) {
            console.error(
              'request the service: ' +
                serviceName +
                '.' +
                methodName +
                ' to ' +
                client.instanceInfo,
              err
            )
            if (err.code === 14) {
              //code 14是网络错误，可能是ip不通，或者服务器已经下线了
              delete serviceCache[client.instanceInfo]
            }
            reject(err)
            return
          }

          // if (resp && resp.base && !resp.base.success) {
          //   const error = new BizError()
          //   error.status = resp.base.errorCode
          //   error.message = resp.base.message
          //   console.error(error)
          //   reject(error)
          //   return
          // }

          resolve(resp)
        })
      })
    }
  }

  _startEurekaClient() {
    return new Promise((resolve, reject) => {
      this.eurekaClient.start(err => {
        if (err) reject(err)
        resolve()
      })
    })
  }

  _getClientInstance(appId, serviceName, grpcConstructor) {
    const instances = this.eurekaClient.getInstancesByAppId(appId)
    const instance = instances[random(0, instances.length - 1)]

    const cacheName = `${instance.hostName}:${instance.port.$ +
      1}:${serviceName}`

    let client = serviceCache[cacheName]

    debug('service instance ip:', instance.hostName)
    debug('service instance port:', instance.port.$)

    if (client) {
      debug('cached client detected')
      return { client, instanceInfo: cacheName }
    }

    client = new grpcConstructor(
      `${instance.hostName}:${instance.port.$ + 1}`,
      this.combined_creds,
      grpcOptions
    )

    serviceCache[cacheName] = client
    return { client, instanceInfo: cacheName }
  }

  _parseService(service) {
    const cache = service.split(':')
    return {
      packageName: cache[0],
      applicationName: `${cache[1]}:${cache[2]}`,
      npmPackageName: cache[1]
    }
  }

  async _loadPem() {
    const pem = await fs.readFile(
      this.config.saluki2.pem || join(__dirname, './../resource/server.pem')
    )
    const ssl_creds = grpc.credentials.createSsl(pem)
    const call_creds = grpc.credentials.createFromMetadataGenerator(
      metadataUpdater
    )
    this.combined_creds = grpc.credentials.combineChannelCredentials(
      ssl_creds,
      call_creds
    )
  }

  async _loadProto() {
    const serviceAllFolder = join(this.config.root, 'node_modules/@quancheng')
    const pbPaths = await globby.sync(
      join(serviceAllFolder, '**/src/main/proto/**/*_service.proto')
    )
    for (const path of pbPaths) {
      const pbRoot = resolve(path, '../../')
      try {
        const serviceProto = grpc.load({
          root: pbRoot,
          file: path.substring(pbRoot.length)
        })
        const npmPkgName = /\@quancheng\/(\S*)\/src/.exec(path)[1]
        if (!this.protos[npmPkgName]) this.protos[npmPkgName] = serviceProto
        this.protos[npmPkgName] = defaultsDeep(
          this.protos[npmPkgName],
          serviceProto
        )
      } catch (e) {
        console.error(e)
      }
    }
  }
}

module.exports = Saluki2Client
