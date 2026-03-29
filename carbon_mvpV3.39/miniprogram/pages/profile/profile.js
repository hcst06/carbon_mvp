const app = getApp()
const {
  request,
  showToast,
  getUserSession,
  setUserSession,
  clearUserSession,
  refreshCurrentUser
} = require('../../utils/request.js')

function formatTime(value) {
  if (!value) return '未同步'
  return String(value).replace('T', ' ').slice(0, 16)
}

Page({
  data: {
    userInfo: null,
    syncLoading: false
  },

  async onShow() {
    const localUser = getUserSession()
    this.setData({
      userInfo: localUser
    })

    const freshUser = await refreshCurrentUser()
    if (freshUser) {
      this.setData({
        userInfo: {
          ...freshUser,
          step_updated_at: formatTime(freshUser.step_updated_at)
        }
      })
    }
  },

  goToRecords() {
    wx.navigateTo({ url: '/pages/records/records' })
  },

  goToStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  },

  goToChangePassword() {
    wx.showModal({
      title: '修改密码',
      content: '当前版本暂未开放微信用户修改密码，如需支持我可以继续帮你补上。',
      showCancel: false
    })
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
                app.globalData.userInfo = data.user
                this.setData({
                  userInfo: {
                    ...data.user,
                    step_updated_at: formatTime(data.user.step_updated_at)
                  }
                })
              }
              showToast('步数已同步', 'success')
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

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前登录状态吗？',
      success: (res) => {
        if (res.confirm) {
          clearUserSession()
          app.globalData.userInfo = null
          app.globalData.isLogin = false

          showToast('已退出登录', 'success')

          setTimeout(() => {
            wx.redirectTo({ url: '/pages/login/login' })
          }, 700)
        }
      }
    })
  },

  goToLogin() {
    wx.redirectTo({ url: '/pages/login/login' })
  }
})
