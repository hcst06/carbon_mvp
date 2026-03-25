const app = getApp()
const { request, showToast, showLoading, hideLoading, getStorage } = require('../../utils/request.js')

Page({
  data: {
    stats: {
      total_reduction: 0,
      total_points: 0,
      total_trips: 0,
      average_reduction: 0
    }
  },

  onShow() {
    this.loadStats()
  },

  loadStats() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }

    showLoading('加载中...')

    request(`/stats/${userInfo.id}`, 'GET').then(data => {
      hideLoading()
      
      let totalTrips = 0
      if (data.mode_stats && Array.isArray(data.mode_stats)) {
        data.mode_stats.forEach(stat => {
          totalTrips += stat[3] || 0
        })
      }

      const totalReduction = data.total_reduction || 0
      const totalPoints = data.total_points || 0
      const averageReduction = totalTrips > 0 ? (totalReduction / totalTrips).toFixed(2) : 0

      this.setData({
        stats: {
          total_reduction: totalReduction.toFixed(2),
          total_points: totalPoints.toFixed(2),
          total_trips: totalTrips,
          average_reduction: averageReduction
        }
      })

      this.drawCharts(data)
    }).catch(err => {
      hideLoading()
      showToast('加载失败，请稍后重试')
      console.error(err)
    })
  },

  drawCharts(data) {
    const modeMap = {
      'walk': '步行',
      'bike': '骑行',
      'bus': '公交',
      'metro': '地铁'
    }

    if (data.mode_stats && Array.isArray(data.mode_stats) && data.mode_stats.length > 0) {
      const labels = data.mode_stats.map(stat => modeMap[stat[0]] || stat[0])
      const modeData = data.mode_stats.map(stat => stat[1] || 0)
      this.drawPieChart(labels, modeData)
    }

    if (data.daily_stats && Array.isArray(data.daily_stats) && data.daily_stats.length > 0) {
      const dailyLabels = data.daily_stats.map(stat => (stat[0] ? stat[0].substring(5) : ''))
      const reductionData = data.daily_stats.map(stat => stat[1] || 0)
      const pointsData = data.daily_stats.map(stat => stat[2] || 0)
      this.drawLineChart(dailyLabels, reductionData, pointsData)
    }
  },

  drawPieChart(labels, data) {
    const ctx = wx.createCanvasContext('modeChart')
    const centerX = 150
    const centerY = 150
    const radius = 100
    const colors = ['#4ade80', '#3b82f6', '#f59e0b', '#a855f7']
    
    let startAngle = 0
    const total = data.reduce((sum, value) => sum + value, 0)

    data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI
      const endAngle = startAngle + sliceAngle

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.setFillStyle(colors[index % colors.length])
      ctx.fill()

      startAngle = endAngle
    })

    ctx.draw()
  },

  drawLineChart(labels, reductionData, pointsData) {
    const ctx = wx.createCanvasContext('dailyChart')
    const width = 300
    const height = 200
    const padding = 30
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const maxReduction = Math.max(...reductionData)
    const maxPoints = Math.max(...pointsData)

    ctx.setStrokeStyle('#4ade80')
    ctx.setLineWidth(2)

    reductionData.forEach((value, index) => {
      const x = padding + (index / (labels.length - 1)) * chartWidth
      const y = padding + chartHeight - (value / maxReduction) * chartHeight
      
      if (index === 0) {
        ctx.beginPath()
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    ctx.setStrokeStyle('#3b82f6')
    ctx.beginPath()

    pointsData.forEach((value, index) => {
      const x = padding + (index / (labels.length - 1)) * chartWidth
      const y = padding + chartHeight - (value / maxPoints) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    ctx.draw()
  }
})
