import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const tokenUrl = 'https://oauth2.googleapis.com/token'
const apiBaseUrl = 'https://chromewebstore.googleapis.com'
const requiredChromeKeys = [
  'clientId',
  'clientSecret',
  'refreshToken',
  'publisherId',
  'extId'
]

const requireString = (value, name) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`SUBMIT_KEYS chrome.${name} must be a non-empty string`)
  }

  return value
}

const requireAccessToken = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      'Chrome Web Store access token response was missing a token'
    )
  }

  return value
}

const readJsonResponse = async (response) => {
  const text = await response.text()

  if (text.trim() === '') {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

const requestJson = async (fetchImpl, url, options, description) => {
  const response = await fetchImpl(url, options)
  const body = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(
      `${description} failed with HTTP ${response.status}: ${JSON.stringify(body)}`
    )
  }

  return body
}

const sleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

export const parseChromeKeys = (rawKeys) => {
  if (typeof rawKeys !== 'string' || rawKeys.trim() === '') {
    throw new Error(
      'SUBMIT_KEYS must contain Chrome Web Store credentials JSON'
    )
  }

  let parsed
  try {
    parsed = JSON.parse(rawKeys)
  } catch (error) {
    throw new Error(`SUBMIT_KEYS is not valid JSON: ${error.message}`, {
      cause: error
    })
  }

  const chrome = parsed?.chrome
  if (typeof chrome !== 'object' || chrome === null) {
    throw new Error('SUBMIT_KEYS must include a chrome object')
  }

  return Object.fromEntries(
    requiredChromeKeys.map((key) => [key, requireString(chrome[key], key)])
  )
}

const getAccessToken = async (keys, fetchImpl) => {
  const body = new URLSearchParams({
    client_id: keys.clientId,
    client_secret: keys.clientSecret,
    refresh_token: keys.refreshToken,
    grant_type: 'refresh_token'
  })

  const response = await requestJson(
    fetchImpl,
    tokenUrl,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body
    },
    'Chrome Web Store access token request'
  )

  return requireAccessToken(response.access_token)
}

export const publishChromeWebStore = async ({
  keys,
  zipPath,
  fetchImpl = fetch,
  readFileImpl = readFile,
  sleepImpl = sleep,
  uploadStatusCheckIntervalMs = 10_000,
  maxUploadStatusChecks = 30,
  log = () => {}
}) => {
  const accessToken = await getAccessToken(keys, fetchImpl)
  const zip = await readFileImpl(zipPath)
  const itemName = `publishers/${keys.publisherId}/items/${keys.extId}`
  const authorization = `Bearer ${accessToken}`

  log(`Uploading ${zipPath} to Chrome Web Store item ${keys.extId}`)
  const upload = await requestJson(
    fetchImpl,
    `${apiBaseUrl}/upload/v2/${itemName}:upload`,
    {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/zip'
      },
      body: zip
    },
    'Chrome Web Store upload'
  )

  let uploadState = upload.uploadState

  for (let attempt = 0; uploadState === 'IN_PROGRESS'; attempt += 1) {
    if (attempt >= maxUploadStatusChecks) {
      throw new Error('Chrome Web Store upload is still in progress')
    }

    await sleepImpl(uploadStatusCheckIntervalMs)
    const status = await requestJson(
      fetchImpl,
      `${apiBaseUrl}/v2/${itemName}:fetchStatus`,
      {
        method: 'GET',
        headers: {
          authorization
        }
      },
      'Chrome Web Store upload status check'
    )
    uploadState = status.lastAsyncUploadState
  }

  if (uploadState !== 'SUCCEEDED') {
    throw new Error(
      `Chrome Web Store upload did not succeed: ${JSON.stringify(upload)}`
    )
  }

  log(`Publishing Chrome Web Store item ${keys.extId}`)
  await requestJson(
    fetchImpl,
    `${apiBaseUrl}/v2/${itemName}:publish`,
    {
      method: 'POST',
      headers: {
        authorization
      }
    },
    'Chrome Web Store publish'
  )
}

export const main = async ({
  env = process.env,
  argv = process.argv,
  fetchImpl = fetch,
  readFileImpl = readFile,
  log = console.log
} = {}) => {
  const zipFlagIndex = argv.indexOf('--zip')
  const zipPath =
    zipFlagIndex === -1 ? 'simplewords.zip' : argv[zipFlagIndex + 1]

  if (!zipPath) {
    throw new Error('Missing value for --zip')
  }

  const keys = parseChromeKeys(env.SUBMIT_KEYS)
  await publishChromeWebStore({ keys, zipPath, fetchImpl, readFileImpl, log })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
