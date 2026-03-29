const app = getApp()
const { request, showToast, showLoading, hideLoading, getStorage } = require('../../utils/request.js')

Page({
  data: {
    records: []
  },

  onShow() {
    this.loadRecords()
  },

  loadRecords() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }

    showLoading('加载中...')

    request(`/records/${userInfo.id}`, 'GET').then(data => {
      hideLoading()
      
      const modeMap = {
        'walk': '步行',
        'bike': '骑行',
        'bus': '公交',
        'metro': '地铁'
      }

      let records = []
      if (data && Array.isArray(data)) {
        records = data.map(record => ({
          ...record,
          mode_name: modeMap[record.mode] || record.mode,
          created_at: record.created_at ? record.created_at.substring(0, 16) : ''
        }))
      }

      this.setData({
        records: records
      })
    }).catch(err => {
      hideLoading()
      showToast('加载失败，请稍后重试')
      console.error(err)
    })
  }
})
