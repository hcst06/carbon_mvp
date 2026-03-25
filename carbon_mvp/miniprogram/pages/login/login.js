const app = getApp()
const { request, showToast, showLoading, hideLoading, setStorage, switchTab } = require('../../utils/request.js')

Page({
  data: {
    username: '',
    password: ''
  },

  bindUsernameInput(e) {
    this.setData({
      username: e.detail.value
    })
  },

  bindPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  login() {
    if (!this.data.username || !this.data.password) {
      showToast('请填写完整的登录信息')
      return
    }

    showLoading('登录中...')

    request('/login', 'POST', {
      username: this.data.username,
      password: this.data.password
    }).then(data => {
      hideLoading()
      if (data.error) {
        showToast(data.error)
      } else {
        setStorage('userInfo', data)
        app.globalData.userInfo = data
        app.globalData.isLogin = true
        showToast('登录成功', 'success')
        setTimeout(() => {
          switchTab('/pages/index/index')
        }, 1500)
      }
    }).catch(err => {
      hideLoading()
      showToast('登录失败，请稍后重试')
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

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  }
})
