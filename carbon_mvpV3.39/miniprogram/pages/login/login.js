const app = getApp()
const {
  request,
  showToast,
  showLoading,
  hideLoading,
  setUserSession
} = require('../../utils/request.js')

Page({
  data: {
    username: '',
    password: '',
    wechatNickname: '',
    avatarUrl: '',
    syncingWeRun: false
  },

  bindUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  bindPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  bindWechatNicknameInput(e) {
    this.setData({ wechatNickname: e.detail.value })
  },

  onChooseAvatar(e) {
    this.setData({
      avatarUrl: e.detail.avatarUrl
    })
  },

  saveSession(userInfo) {
    setUserSession(userInfo)
    app.globalData.userInfo = userInfo
    app.globalData.isLogin = true
  },

  navigateHome() {
    wx.switchTab({
      url: '/pages/index/index'
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
    }).then((data) => {
      hideLoading()
      if (data.error) {
        showToast(data.error)
        return
      }

      this.saveSession(data)
      showToast('登录成功', 'success')
      setTimeout(() => {
        this.navigateHome()
      }, 600)
    }).catch((err) => {
      hideLoading()
      showToast('登录失败，请稍后重试')
      console.error(err)
    })
  },

  startWechatAuth() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            reject(new Error('未拿到微信登录 code'))
            return
          }

          request('/wechat/login', 'POST', {
            code: loginRes.code,
            nickname: this.data.wechatNickname || '微信用户',
            avatar_url: this.data.avatarUrl
          }).then((data) => {
            if (data.error) {
              reject(new Error(data.error))
              return
            }
            resolve(data)
          }).catch(reject)
        },
        fail: reject
      })
    })
  },

  syncWeRun(userInfo) {
    this.setData({ syncingWeRun: true })

    return new Promise((resolve) => {
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
                if (!data.error && data.user) {
                  this.saveSession(data.user)
                }
                resolve(data)
              }).catch((error) => {
                console.error(error)
                resolve(null)
              })
            },
            fail: () => resolve(null)
          })
        },
        fail: (error) => {
          console.warn('getWeRunData failed', error)
          resolve(null)
        }
      })
    }).finally(() => {
      this.setData({ syncingWeRun: false })
    })
  },

  async wechatLogin() {
    if (!this.data.avatarUrl) {
      showToast('请先选择微信头像')
      return
    }

    showLoading('微信登录中...')

    try {
      const userInfo = await this.startWechatAuth()
      this.saveSession(userInfo)
      hideLoading()
      showToast('微信登录成功', 'success')

      const syncResult = await this.syncWeRun(userInfo)
      if (syncResult && !syncResult.error && syncResult.step_count >= 0) {
        showToast(`已同步步数 ${syncResult.step_count}`, 'success')
      }

      setTimeout(() => {
        this.navigateHome()
      }, 800)
    } catch (error) {
      hideLoading()
      showToast(error.message || '微信登录失败')
      console.error(error)
    }
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  }
})
