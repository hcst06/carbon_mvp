const app = getApp()
const { request, showToast, showLoading, hideLoading, setStorage, getStorage } = require('../../utils/request.js')

Page({
  data: {
    distance: '',
    time: '',
    modeIndex: 0,
    modes: ['步行', '骑行', '公交', '地铁'],
    result: null
  },

  bindDistanceInput(e) {
    this.setData({
      distance: e.detail.value
    })
  },

  bindTimeInput(e) {
    this.setData({
      time: e.detail.value
    })
  },

  bindModeChange(e) {
    this.setData({
      modeIndex: e.detail.value
    })
  },

  calculate() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }

    if (!this.data.distance || !this.data.time) {
      showToast('请填写完整的距离和时间信息')
      return
    }

    const modeMap = ['walk', 'bike', 'bus', 'metro']
    const mode = modeMap[this.data.modeIndex]

    showLoading('计算中...')

    request('/calculate', 'POST', {
      user_id: userInfo.id,
      distance: parseFloat(this.data.distance),
      time: parseFloat(this.data.time),
      mode: mode
    }).then(data => {
      hideLoading()
      if (data.error) {
        showToast(data.error)
      } else {
        this.setData({
          result: data
        })
        
        userInfo.total_points = (userInfo.total_points || 0) + data.points
        setStorage('userInfo', userInfo)
        app.globalData.userInfo = userInfo
        
        showToast('计算成功', 'success')
      }
    }).catch(err => {
      hideLoading()
      showToast('计算失败，请稍后重试')
      console.error(err)
    })
  }
})
