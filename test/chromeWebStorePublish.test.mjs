// @vitest-environment node

import { describe, expect, test } from 'vitest'

import {
  parseChromeKeys,
  publishChromeWebStore
} from '../scripts/chrome-web-store-publish.mjs'

const createResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  json: async () => body
})

describe('Chrome Web Store publishing', () => {
  test('parses chrome credentials from SUBMIT_KEYS json', () => {
    const keys = parseChromeKeys(
      JSON.stringify({
        chrome: {
          clientId: 'client-id',
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          publisherId: 'publisher-id',
          extId: 'kmlhfcjpmhcoclpcghckibfkgpfbjfbb'
        }
      })
    )

    expect(keys).toEqual({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      publisherId: 'publisher-id',
      extId: 'kmlhfcjpmhcoclpcghckibfkgpfbjfbb'
    })
  })

  test('uploads the zip and publishes it to the default target', async () => {
    const calls = []
    const fetchImpl = async (url, options) => {
      calls.push({ url, options })

      if (url === 'https://oauth2.googleapis.com/token') {
        return createResponse(200, { access_token: 'access-token' })
      }

      if (
        url ===
        'https://chromewebstore.googleapis.com/upload/v2/publishers/publisher-id/items/kmlhfcjpmhcoclpcghckibfkgpfbjfbb:upload'
      ) {
        return createResponse(200, { uploadState: 'SUCCEEDED' })
      }

      if (
        url ===
        'https://chromewebstore.googleapis.com/v2/publishers/publisher-id/items/kmlhfcjpmhcoclpcghckibfkgpfbjfbb:publish'
      ) {
        return createResponse(200, { status: ['OK'] })
      }

      throw new Error(`unexpected request: ${url}`)
    }

    await publishChromeWebStore({
      keys: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        publisherId: 'publisher-id',
        extId: 'kmlhfcjpmhcoclpcghckibfkgpfbjfbb'
      },
      zipPath: 'simplewords.zip',
      fetchImpl,
      readFileImpl: async () => Buffer.from('zip-bytes')
    })

    expect(calls).toHaveLength(3)
    expect(calls[0].options.body.toString()).toContain(
      'grant_type=refresh_token'
    )
    expect(calls[1].options.method).toBe('POST')
    expect(calls[1].options.headers.authorization).toBe('Bearer access-token')
    expect(calls[1].options.body).toEqual(Buffer.from('zip-bytes'))
    expect(calls[2].options.method).toBe('POST')
    expect(calls[2].options.headers.authorization).toBe('Bearer access-token')
    expect(calls[2].options.body).toBeUndefined()
  })

  test('waits for async uploads before publishing', async () => {
    const calls = []
    const fetchImpl = async (url, options) => {
      calls.push({ url, options })

      if (url === 'https://oauth2.googleapis.com/token') {
        return createResponse(200, { access_token: 'access-token' })
      }

      if (url.endsWith(':upload')) {
        return createResponse(200, { uploadState: 'IN_PROGRESS' })
      }

      if (url.endsWith(':fetchStatus')) {
        return createResponse(200, { lastAsyncUploadState: 'SUCCEEDED' })
      }

      if (url.endsWith(':publish')) {
        return createResponse(200, { status: ['OK'] })
      }

      throw new Error(`unexpected request: ${url}`)
    }

    await publishChromeWebStore({
      keys: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        publisherId: 'publisher-id',
        extId: 'kmlhfcjpmhcoclpcghckibfkgpfbjfbb'
      },
      zipPath: 'simplewords.zip',
      fetchImpl,
      readFileImpl: async () => Buffer.from('zip-bytes'),
      sleepImpl: async () => {}
    })

    expect(calls.map((call) => call.url)).toEqual([
      'https://oauth2.googleapis.com/token',
      'https://chromewebstore.googleapis.com/upload/v2/publishers/publisher-id/items/kmlhfcjpmhcoclpcghckibfkgpfbjfbb:upload',
      'https://chromewebstore.googleapis.com/v2/publishers/publisher-id/items/kmlhfcjpmhcoclpcghckibfkgpfbjfbb:fetchStatus',
      'https://chromewebstore.googleapis.com/v2/publishers/publisher-id/items/kmlhfcjpmhcoclpcghckibfkgpfbjfbb:publish'
    ])
  })
})
