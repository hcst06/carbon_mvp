const app = getApp()
const { request, showToast, showLoading, hideLoading, getStorage, setStorage } = require('../../utils/request.js')

Page({
  data: {
    userInfo: null,
    stats: {
      total_reduction: 0,
      total_trips: 0
    }
  },

  onShow() {
    this.loadUserInfo()
    this.loadStats()
  },

  loadUserInfo() {
    const userInfo = getStorage('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
      app.globalData.userInfo = userInfo
    }
  },

  loadStats() {
    const userInfo = getStorage('userInfo')
    if (userInfo) {
      request('/stats', 'GET', { user_id: userInfo.id })
        .then(data => {
          if (!data.error) {
            this.setData({ stats: data })
          }
        })
        .catch(err => {
          console.error(err)
        })
    }
  },

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  goToCalculate() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/calculate/calculate'
    })
  },

  goToTrack() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/track/track'
    })
  },

  goToExchange() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/exchange/exchange'
    })
  },

  goToStats() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/stats/stats'
    })
  },

  // 分享到朋友圈
  shareToMoment() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 分享给好友
  shareToFriend() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
  },

  // 页面分享配置
  onShareAppMessage() {
    return {
      title: '碳行益农 - 绿色出行，助力乡村振兴',
      path: '/pages/index/index',
      imageUrl: '/images/share.png',
      success: function(res) {
        showToast('分享成功', 'success')
      },
      fail: function(res) {
        showToast('分享失败')
      }
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '碳行益农 - 绿色出行，助力乡村振兴',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    }
  }
})
