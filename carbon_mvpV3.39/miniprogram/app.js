App({
  onLaunch() {
    this.checkLogin()
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    this.globalData.userInfo = userInfo || null
    this.globalData.isLogin = !!userInfo
  },

  setUserSession(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isLogin = !!userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  clearUserSession() {
    this.globalData.userInfo = null
    this.globalData.isLogin = false
    wx.removeStorageSync('userInfo')
  },

  globalData: {
    userInfo: null,
    isLogin: false,
    baseUrl: 'https://xcx.hcmu.top'
  }
})
