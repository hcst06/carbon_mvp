const BASE_URL = 'https://xcx.hcmu.top'
const USER_INFO_KEY = 'userInfo'

const cache = {
  data: {},
  timestamp: {},
  expiry: 5 * 60 * 1000
}

function isCacheValid(key) {
  if (!cache.timestamp[key]) return false
  return Date.now() - cache.timestamp[key] < cache.expiry
}

function getAppSafe() {
  try {
    return getApp()
  } catch (error) {
    return null
  }
}

function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  })
}

function hideLoading() {
  wx.hideLoading()
}

function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration
  })
}

function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (error) {
    console.error('Storage set error:', error)
  }
}

function getStorage(key) {
  try {
    return wx.getStorageSync(key)
  } catch (error) {
    console.error('Storage get error:', error)
    return null
  }
}

function removeStorage(key) {
  try {
    wx.removeStorageSync(key)
  } catch (error) {
    console.error('Storage remove error:', error)
  }
}

function setUserSession(userInfo) {
  setStorage(USER_INFO_KEY, userInfo)
  const app = getAppSafe()
  if (app) {
    app.globalData.userInfo = userInfo
    app.globalData.isLogin = !!userInfo
  }
}

function getUserSession() {
  return getStorage(USER_INFO_KEY)
}

function clearUserSession() {
  removeStorage(USER_INFO_KEY)
  const app = getAppSafe()
  if (app) {
    app.globalData.userInfo = null
    app.globalData.isLogin = false
  }
}

function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const cacheKey = `${method}:${url}:${JSON.stringify(data)}`

    if (method === 'GET' && isCacheValid(cacheKey)) {
      resolve(cache.data[cacheKey])
      return
    }

    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (method === 'GET') {
            cache.data[cacheKey] = res.data
            cache.timestamp[cacheKey] = Date.now()
          }
          resolve(res.data)
          return
        }
        reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg || 'request failed'}`))
      },
      fail: (err) => {
        if (err.errType === 'request:fail') {
          showToast('网络连接失败，请检查网络')
        } else if (err.errType === 'request:timeout') {
          showToast('请求超时，请稍后重试')
        } else {
          showToast('请求失败，请稍后重试')
        }
        reject(err)
      }
    })
  })
}

function fetchUserProfile(userId) {
  return request(`/user/${userId}`, 'GET')
}

function refreshCurrentUser() {
  const userInfo = getUserSession()
  if (!userInfo || !userInfo.id) {
    return Promise.resolve(null)
  }

  return fetchUserProfile(userInfo.id).then((data) => {
    if (!data || data.error) {
      return null
    }
    setUserSession(data)
    return data
  })
}

function uploadFile(url, filePath, name = 'file', formData = {}) {
  return new Promise((resolve, reject) => {
    showLoading('上传中...')
    wx.uploadFile({
      url: BASE_URL + url,
      filePath,
      name,
      formData,
      success: (res) => {
        hideLoading()
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(res.data))
          } catch (error) {
            resolve(res.data)
          }
          return
        }
        reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg || 'upload failed'}`))
      },
      fail: (err) => {
        hideLoading()
        showToast('上传失败，请稍后重试')
        reject(err)
      }
    })
  })
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    showLoading('下载中...')
    wx.downloadFile({
      url,
      success: (res) => {
        hideLoading()
        if (res.statusCode === 200) {
          resolve(res.tempFilePath)
          return
        }
        reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg || 'download failed'}`))
      },
      fail: (err) => {
        hideLoading()
        showToast('下载失败，请稍后重试')
        reject(err)
      }
    })
  })
}

function clearCache() {
  cache.data = {}
  cache.timestamp = {}
}

module.exports = {
  request,
  uploadFile,
  downloadFile,
  showLoading,
  hideLoading,
  showToast,
  getStorage,
  setStorage,
  removeStorage,
  setUserSession,
  getUserSession,
  clearUserSession,
  fetchUserProfile,
  refreshCurrentUser,
  clearCache
}
