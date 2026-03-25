// 网络请求封装
const BASE_URL = 'http://localhost:5000'

// 缓存管理
const cache = {
  data: {},
  timestamp: {},
  expiry: 5 * 60 * 1000 // 5分钟缓存
}

// 检查缓存是否有效
function isCacheValid(key) {
  if (!cache.timestamp[key]) return false
  return Date.now() - cache.timestamp[key] < cache.expiry
}

// 显示加载提示
function showLoading(title = '加载中...') {
  wx.showLoading({
    title: title,
    mask: true
  })
}

// 隐藏加载提示
function hideLoading() {
  wx.hideLoading()
}

// 显示提示信息
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title: title,
    icon: icon,
    duration: duration
  })
}

// 本地存储 - 设置
function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    console.error('Storage set error:', e)
  }
}

// 本地存储 - 获取
function getStorage(key) {
  try {
    return wx.getStorageSync(key)
  } catch (e) {
    console.error('Storage get error:', e)
    return null
  }
}

// 网络请求
function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    // 检查缓存
    const cacheKey = `${method}:${url}:${JSON.stringify(data)}`
    if (method === 'GET' && isCacheValid(cacheKey)) {
      resolve(cache.data[cacheKey])
      return
    }

    wx.request({
      url: BASE_URL + url,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存GET请求结果
          if (method === 'GET') {
            cache.data[cacheKey] = res.data
            cache.timestamp[cacheKey] = Date.now()
          }
          resolve(res.data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg}`))
        }
      },
      fail: (err) => {
        // 网络错误处理
        if (err.errType === 'request:fail') {
          showToast('网络连接失败，请检查网络')
        } else if (err.errType === 'request:timeout') {
          showToast('请求超时，请稍后重试')
        } else {
          showToast('请求失败，请稍后重试')
        }
        reject(err)
      },
      complete: () => {
        // 可以在这里添加通用的完成逻辑
      }
    })
  })
}

// 上传文件
function uploadFile(url, filePath, name = 'file', formData = {}) {
  return new Promise((resolve, reject) => {
    showLoading('上传中...')
    wx.uploadFile({
      url: BASE_URL + url,
      filePath: filePath,
      name: name,
      formData: formData,
      success: (res) => {
        hideLoading()
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data)
            resolve(data)
          } catch (e) {
            resolve(res.data)
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg}`))
        }
      },
      fail: (err) => {
        hideLoading()
        showToast('上传失败，请稍后重试')
        reject(err)
      }
    })
  })
}

// 下载文件
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    showLoading('下载中...')
    wx.downloadFile({
      url: url,
      success: (res) => {
        hideLoading()
        if (res.statusCode === 200) {
          resolve(res.tempFilePath)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg}`))
        }
      },
      fail: (err) => {
        hideLoading()
        showToast('下载失败，请稍后重试')
        reject(err)
      }
    })
  })
}

// 清除缓存
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
  clearCache
}
