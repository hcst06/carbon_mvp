const app = getApp()
const { request, showToast, showLoading, hideLoading, getStorage, setStorage, removeStorage } = require('../../utils/request.js')

Page({
  data: {
    userInfo: null
  },

  onShow() {
    this.setData({
      userInfo: app.globalData.userInfo
    })
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
      content: '此功能暂未实现',
      showCancel: false
    })
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          removeStorage('userInfo')
          app.globalData.userInfo = null
          app.globalData.isLogin = false
          
          showToast('已退出登录', 'success')
          
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/login/login' })
          }, 1000)
        }
      }
    })
  },

  goToLogin() {
    wx.redirectTo({ url: '/pages/login/login' })
  }
})
