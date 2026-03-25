App({
  onLaunch() {
    console.log('小程序启动')
    this.checkLogin()
  },

  onShow() {
    console.log('小程序显示')
  },

  onHide() {
    console.log('小程序隐藏')
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLogin = true
    } else {
      this.globalData.isLogin = false
    }
  },

  globalData: {
    userInfo: null,
    isLogin: false,
    baseUrl: 'http://127.0.0.1:5000'
  }
})
