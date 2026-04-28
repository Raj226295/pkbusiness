import api from './api.js'

export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export function resolveUploadUrl(filePath) {
  if (!filePath) {
    return ''
  }

  if (/^https?:\/\//i.test(filePath)) {
    return filePath
  }

  const configuredBaseUrl = api.defaults.baseURL
  const baseUrl =
    configuredBaseUrl && /^https?:\/\//i.test(configuredBaseUrl)
      ? configuredBaseUrl
      : window.location.origin

  return new URL(filePath, baseUrl).toString()
}
