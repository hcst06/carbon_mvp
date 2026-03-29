const { request, showToast, showLoading, hideLoading } = require('../../utils/request.js')

Page({
  data: {
    username: '',
    email: '',
    password: ''
  },

  bindUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  bindEmailInput(e) {
    this.setData({ email: e.detail.value })
  },

  bindPasswordInput(e) {
    this.setData({ password: e.detail.value })
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
    }).then((data) => {
      hideLoading()
      if (data.error) {
        showToast(data.error)
        return
      }

      showToast('注册成功，请登录', 'success')
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        })
      }, 700)
    }).catch((err) => {
      hideLoading()
      showToast('注册失败，请稍后重试')
      console.error(err)
    })
  },

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  }
})
