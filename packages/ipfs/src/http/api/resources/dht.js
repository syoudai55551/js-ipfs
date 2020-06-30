'use strict'

const Joi = require('../../utils/joi')
const Boom = require('@hapi/boom')
const all = require('it-all')
const pipe = require('it-pipe')
const ndjson = require('iterable-ndjson')
const toStream = require('it-to-stream')
const { map } = require('streaming-iterables')

exports.findPeer = {
  options: {
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      },
      query: Joi.object().keys({
        peerId: Joi.peerId().required(),
        timeout: Joi.timeout()
      })
        .rename('arg', 'peerId', {
          override: true,
          ignoreUndefined: true
        })
    }
  },
  async handler (request, h) {
    const {
      app: {
        signal
      },
      server: {
        app: {
          ipfs
        }
      },
      query: {
        peerId,
        timeout
      }
    } = request

    let res

    try {
      res = await ipfs.dht.findPeer(peerId, {
        signal,
        timeout
      })
    } catch (err) {
      if (err.code === 'ERR_LOOKUP_FAILED') {
        throw Boom.notFound(err.toString())
      } else {
        throw Boom.boomify(err, { message: err.toString() })
      }
    }

    return h.response({
      Responses: [{
        ID: res.id.toString(),
        Addrs: res.addrs.map(a => a.toString())
      }],
      Type: 2
    })
  }
}

exports.findProvs = {
  options: {
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      },
      query: Joi.object().keys({
        cid: Joi.cid().required(),
        numProviders: Joi.number().integer().default(20),
        timeout: Joi.timeout()
      })
        .rename('arg', 'cid', {
          override: true,
          ignoreUndefined: true
        })
        .rename('num-providers', 'numProviders', {
          override: true,
          ignoreUndefined: true
        })
    }
  },
  async handler (request, h) {
    const {
      app: {
        signal
      },
      server: {
        app: {
          ipfs
        }
      },
      query: {
        cid,
        numProviders,
        timeout
      }
    } = request

    const res = await all(ipfs.dht.findProvs(cid, {
      numProviders,
      signal,
      timeout
    }))

    return h.response({
      Responses: res.map(({ id, addrs }) => ({
        ID: id.toString(),
        Addrs: addrs.map(a => a.toString())
      })),
      Type: 4
    })
  }
}

exports.get = {
  options: {
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      },
      query: Joi.object().keys({
        buffer: Joi.binary().required(),
        timeout: Joi.timeout()
      })
        .rename('arg', 'buffer', {
          override: true,
          ignoreUndefined: true
        })
    }
  },
  async handler (request, h) {
    const {
      app: {
        signal
      },
      server: {
        app: {
          ipfs
        }
      },
      query: {
        buffer,
        timeout
      }
    } = request

    const res = await ipfs.dht.get(buffer, {
      signal,
      timeout
    })

    return h.response({
      Extra: res.toString(),
      Type: 5
    })
  }
}

exports.provide = {
  options: {
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      },
      query: Joi.object().keys({
        cid: Joi.cid().required(),
        timeout: Joi.timeout()
      })
        .rename('arg', 'cid', {
          override: true,
          ignoreUndefined: true
        })
    }
  },
  async handler (request, h) {
    const {
      app: {
        signal
      },
      server: {
        app: {
          ipfs
        }
      },
      query: {
        cid,
        timeout
      }
    } = request

    await ipfs.dht.provide(cid, {
      signal,
      timeout
    })

    return h.response()
  }
}

exports.put = {
  options: {
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      },
      query: Joi.object().keys({
        arg: Joi.array().length(2).items(Joi.binary()).required(),
        timeout: Joi.timeout()
      })
    }
  },
  async handler (request, h) {
    const {
      app: {
        signal
      },
      server: {
        app: {
          ipfs
        }
      },
      query: {
        arg: [
          key,
          value
        ],
        timeout
      }
    } = request

    await ipfs.dht.put(key, value, {
      signal,
      timeout
    })

    return h.response()
  }
}

exports.query = {
  options: {
    validate: {
      options: {
        allowUnknown: true,
        stripUnknown: true
      },
      query: Joi.object().keys({
        peerId: Joi.peerId().required(),
        timeout: Joi.timeout()
      })
        .rename('arg', 'peerId', {
          override: true,
          ignoreUndefined: true
        })
    }
  },
  handler (request, h) {
    const {
      app: {
        signal
      },
      server: {
        app: {
          ipfs
        }
      },
      query: {
        peerId,
        timeout
      }
    } = request

    const response = toStream.readable(
      pipe(
        ipfs.dht.query(peerId, {
          signal,
          timeout
        }),
        map(({ id }) => ({ ID: id.toString() })),
        ndjson.stringify
      )
    )

    return h.response(response)
  }
}
