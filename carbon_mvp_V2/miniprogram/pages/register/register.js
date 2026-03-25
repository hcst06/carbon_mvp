const app = getApp()
const { request, showToast, showLoading, hideLoading, setStorage, switchTab } = require('../../utils/request.js')

Page({
  data: {
    username: '',
    email: '',
    password: ''
  },

  bindUsernameInput(e) {
    this.setData({
      username: e.detail.value
    })
  },

  bindEmailInput(e) {
    this.setData({
      email: e.detail.value
    })
  },

  bindPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  register() {
    if (!this.data.username || !this.data.email || !this.data.password) {
      showToast('请填写完整的注册信息')
      return
    }

    showLoading('注册中...')

    request('/register', 'POST', {
      username: this.data.username,
      email: this.data.email,
      password: this.data.password
    }).then(data => {
      hideLoading()
      if (data.error) {
        showToast(data.error)
      } else {
        showToast('注册成功，请登录', 'success')
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/login/login'
          })
        }, 1500)
      }
    }).catch(err => {
      hideLoading()
      showToast('注册失败，请稍后重试')
      console.error(err)
    })
  },

  wechatLogin(e) {
    wx.login({
      success: (res) => {
        if (res.code) {
          showLoading('微信登录中...')
          // 这里可以调用后端的微信登录接口
          // 为了测试，我们直接模拟登录成功
          const mockUser = {
            id: 1,
            username: e.detail.userInfo.nickName || '微信用户',
            total_points: 0
          }
          
          setStorage('userInfo', mockUser)
          app.globalData.userInfo = mockUser
          app.globalData.isLogin = true
          hideLoading()
          showToast('登录成功', 'success')
          
          setTimeout(() => {
            switchTab('/pages/index/index')
          }, 1500)
        } else {
          showToast('微信登录失败')
        }
      },
      fail: (err) => {
        showToast('微信登录失败')
        console.error(err)
      }
    })
  },

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  }
})
