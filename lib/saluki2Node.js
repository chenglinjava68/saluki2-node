const Eureka = require('eureka-js-client').Eureka
const fs = require('fs-extra')
const grpc = require('grpc')
const globby = require('globby')
const { join, resolve } = require('path')
const { defaultsDeep, random } = require('lodash')

const eurekaConfig = require('./eurekaConfig')

const grpcOptions = {
  'grpc.ssl_target_name_override': 'grpc',
  'grpc.default_authority': 'grpc'
}

const metadataUpdater = (service_url, callback) => {
  const metadata = new grpc.Metadata()
  metadata.set('plugin_key', 'plugin_value')
  callback(null, metadata)
}

class Saluki2Client {
  constructor (config) {
    this.eurekaClient = new Eureka(eurekaConfig(config))
    this.config = config
    this.serviceConfig = config.saluki2.services
    this.combined_creds = null
    this.protos = {}
    this.services = {}
  }

  async init () {
    await this.initGrpcClient()
    await this.initServices()
  }

  async initGrpcClient () {
    await this._loadPem()
    await this._loadProto()
  }

  async initServices () {
    try {
      await this._startEurekaClient()
      for (const serviceName of Object.keys(this.serviceConfig)) {
        const { packageName, applicationName } = this._parseService(this.serviceConfig[serviceName])
        const packageNameArr = packageName.split('.')
        let grpcConstructor = this.protos

        while (packageNameArr.length) {
          grpcConstructor = grpcConstructor[packageNameArr[0]]
          packageNameArr.splice(0, 1)
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

  _wrapService (service) {
    const result = {}
    for (const method of Object.keys(service.grpcConstructor.service)) {
      result[method] = this._callService(service, method)
    }
    return result
  }

  _callService (service, methodName) {
    const { applicationName, serviceName, grpcConstructor } = service

    return (req, callback) => {
      return new Promise((resolve, reject) => {
        const client = this._getClientInstance(applicationName, grpcConstructor)
        client[methodName](req, (err, resp) => {
          if (err) reject(err)
          resolve(resp)
        })
      })
    }
  }

  _startEurekaClient () {
    return new Promise((resolve, reject) => {
      this.eurekaClient.start(err => {
        if (err) reject(err)
        resolve()
      })
    })
  }

  _getClientInstance (appId, grpcConstructor) {
    const instances = this.eurekaClient.getInstancesByAppId(appId)
    const instance = instances[random(0, instances.length - 1)]
    const client = new grpcConstructor(
      `${instance.hostName}:${instance.port.$ + 1}`,
      this.combined_creds, grpcOptions
    )
    return client
  }

  _parseService (service) {
    const cache = service.split(':')
    return {
      packageName: cache[0],
      applicationName: `${cache[1]}:${cache[2]}`
    }
  }

  async _loadPem () {
    const pem = await fs.readFile(join(this.config.root, 'server.pem'))
    const ssl_creds = grpc.credentials.createSsl(pem)
    const call_creds = grpc.credentials.createFromMetadataGenerator(metadataUpdater)
    this.combined_creds = grpc.credentials.combineChannelCredentials(ssl_creds, call_creds)
  }

  async _loadProto () {
    const serviceAllFolder = join(this.config.root, 'service-all')
    const pbPaths = await globby.sync(join(serviceAllFolder, '*-service/interface/src/main/proto/**/*_service.proto'))
    for (const path of pbPaths) {
      const pbRoot = resolve(path, '../../')
      this.protos = defaultsDeep(this.protos, grpc.load({
        root: pbRoot,
        file: path.substring(pbRoot.length)
      }))
    }
  }
}

module.exports = Saluki2Client