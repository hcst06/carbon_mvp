const app = getApp()
const { request, showToast, showLoading, hideLoading, getStorage, setStorage, removeStorage, navigateTo, redirectTo } = require('../../utils/request.js')

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
    navigateTo('/pages/records/records')
  },

  goToStats() {
    navigateTo('/pages/stats/stats')
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
            redirectTo('/pages/login/login')
          }, 1000)
        }
      }
    })
  },

  goToLogin() {
    redirectTo('/pages/login/login')
  }
})
