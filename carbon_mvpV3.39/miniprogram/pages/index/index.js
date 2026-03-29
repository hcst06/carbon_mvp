const app = getApp()
const {
  request,
  showToast,
  getUserSession,
  setUserSession,
  refreshCurrentUser
} = require('../../utils/request.js')

function formatTime(value) {
  if (!value) return '未同步'
  return String(value).replace('T', ' ').slice(0, 16)
}

Page({
  data: {
    userInfo: null,
    syncLoading: false,
    stats: {
      total_reduction: 0,
      total_points: 0,
      total_trips: 0,
      step_count: 0,
      step_updated_at: ''
    }
  },

  onShow() {
    this.loadUserInfo()
    this.loadStats()
  },

  loadUserInfo() {
    const userInfo = getUserSession()
    if (userInfo) {
      this.setData({ userInfo })
      app.globalData.userInfo = userInfo
    } else {
      this.setData({ userInfo: null })
    }
  },

  async loadStats() {
    const userInfo = getUserSession()
    if (!userInfo) return

    try {
      const [stats, freshUser] = await Promise.all([
        request(`/stats/${userInfo.id}`, 'GET'),
        refreshCurrentUser()
      ])

      if (freshUser) {
        this.setData({ userInfo: freshUser })
      }

      if (!stats.error) {
        let totalTrips = 0
        if (Array.isArray(stats.mode_stats)) {
          stats.mode_stats.forEach((stat) => {
            totalTrips += stat[3] || 0
          })
        }

        this.setData({
          stats: {
            total_reduction: Number(stats.total_reduction || 0).toFixed(2),
            total_points: Number(stats.total_points || 0).toFixed(2),
            total_trips: totalTrips,
            step_count: stats.step_count || (freshUser ? freshUser.step_count : 0) || 0,
            step_updated_at: formatTime(stats.step_updated_at || (freshUser && freshUser.step_updated_at))
          }
        })
      }
    } catch (error) {
      console.error(error)
    }
  },

  requireLogin(targetUrl, isTabPage = false) {
    const userInfo = getUserSession()
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return false
    }

    if (targetUrl) {
      if (isTabPage) {
        wx.switchTab({ url: targetUrl })
      } else {
        wx.navigateTo({ url: targetUrl })
      }
    }
    return true
  },

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  goToCalculate() {
    this.requireLogin('/pages/calculate/calculate', true)
  },

  goToTrack() {
    this.requireLogin('/pages/track/track', true)
  },

  goToExchange() {
    this.requireLogin('/pages/exchange/exchange')
  },

  goToStats() {
    this.requireLogin('/pages/stats/stats')
  },

  syncWeRunData() {
    const userInfo = getUserSession()
    if (!userInfo) {
      showToast('请先登录')
      return
    }

    this.setData({ syncLoading: true })

    wx.getWeRunData({
      success: (weRunRes) => {
        wx.login({
          success: (loginRes) => {
            request('/wechat/we-run', 'POST', {
              user_id: userInfo.id,
              encrypted_data: weRunRes.encryptedData,
              iv: weRunRes.iv,
              code: loginRes.code
            }).then((data) => {
              this.setData({ syncLoading: false })
              if (data.error) {
                showToast(data.error)
                return
              }

              if (data.user) {
                setUserSession(data.user)
                this.setData({
                  userInfo: data.user,
                  stats: {
                    ...this.data.stats,
                    step_count: data.step_count || 0,
                    step_updated_at: formatTime(data.step_updated_at)
                  }
                })
              }
              showToast('微信步数已同步', 'success')
            }).catch((error) => {
              this.setData({ syncLoading: false })
              showToast('步数同步失败')
              console.error(error)
            })
          },
          fail: (error) => {
            this.setData({ syncLoading: false })
            showToast('微信登录状态失效')
            console.error(error)
          }
        })
      },
      fail: (error) => {
        this.setData({ syncLoading: false })
        showToast('未授权微信运动')
        console.error(error)
      }
    })
  },

  shareToMoment() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  shareToFriend() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
  },

  onShareAppMessage() {
    return {
      title: '碳行益农 - 绿色出行，助力乡村振兴',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '碳行益农 - 绿色出行，助力乡村振兴',
      path: '/pages/index/index'
    }
  }
})
