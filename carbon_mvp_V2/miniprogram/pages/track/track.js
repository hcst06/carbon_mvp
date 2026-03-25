const app = getApp()
const { request, showToast, showLoading, hideLoading, getStorage, setStorage } = require('../../utils/request.js')

Page({
  data: {
    longitude: 116.397428,
    latitude: 39.90923,
    polyline: [],
    markers: [],
    isRecording: false,
    isPaused: false,
    distance: 0,
    time: 0,
    speed: 0,
    modeIndex: 0,
    modes: ['步行', '骑行', '公交', '地铁'],
    locationList: [],
    timer: null,
    startTime: 0
  },

  onLoad() {
    this.getLocation()
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          longitude: res.longitude,
          latitude: res.latitude
        })
      },
      fail: (err) => {
        showToast('请开启位置权限')
      }
    })
  },

  bindModeChange(e) {
    this.setData({
      modeIndex: e.detail.value
    })
  },

  startRecording() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }

    this.setData({
      isRecording: true,
      isPaused: false,
      distance: 0,
      time: 0,
      speed: 0,
      locationList: [],
      polyline: [],
      markers: []
    })

    this.startTime = Date.now()
    this.startLocationUpdate()
    this.startTimer()

    showToast('开始记录轨迹')
  },

  startLocationUpdate() {
    wx.startLocationUpdate({
      type: 'gcj02',
      success: () => {
        wx.onLocationChange((res) => {
          if (!this.data.isPaused) {
            this.addLocationPoint(res)
          }
        })
      },
      fail: (err) => {
        showToast('位置更新失败')
      }
    })
  },

  addLocationPoint(location) {
    const locationList = [...this.data.locationList, location]
    this.setData({ locationList })
    this.updatePolyline()
    this.calculateDistance()
    this.calculateSpeed()
  },

  updatePolyline() {
    const points = this.data.locationList.map(loc => ({
      longitude: loc.longitude,
      latitude: loc.latitude
    }))

    if (points.length > 1) {
      this.setData({
        polyline: [{
          points,
          color: '#3b82f6',
          width: 6,
          dottedLine: false
        }],
        markers: [
          {
            id: 0,
            longitude: points[0].longitude,
            latitude: points[0].latitude,
            iconPath: '/images/marker_start.png',
            width: 30,
            height: 30
          },
          {
            id: 1,
            longitude: points[points.length - 1].longitude,
            latitude: points[points.length - 1].latitude,
            iconPath: '/images/marker_end.png',
            width: 30,
            height: 30
          }
        ]
      })
    }
  },

  calculateDistance() {
    const locationList = this.data.locationList
    if (locationList.length < 2) return

    let totalDistance = 0
    for (let i = 1; i < locationList.length; i++) {
      totalDistance += this.getDistance(
        locationList[i-1].latitude,
        locationList[i-1].longitude,
        locationList[i].latitude,
        locationList[i].longitude
      )
    }

    this.setData({
      distance: (totalDistance / 1000).toFixed(2)
    })
  },

  calculateSpeed() {
    const locationList = this.data.locationList
    if (locationList.length < 2) return

    const lastTwo = locationList.slice(-2)
    const timeDiff = (lastTwo[1].time - lastTwo[0].time) / 1000
    const distanceDiff = this.getDistance(
      lastTwo[0].latitude,
      lastTwo[0].longitude,
      lastTwo[1].latitude,
      lastTwo[1].longitude
    )

    if (timeDiff > 0) {
      const speed = (distanceDiff / timeDiff) * 3.6
      this.setData({
        speed: speed.toFixed(1)
      })
    }
  },

  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  },

  startTimer() {
    this.timer = setInterval(() => {
      if (!this.data.isPaused) {
        const elapsed = Math.floor((Date.now() - this.startTime) / 60000)
        this.setData({
          time: elapsed
        })
      }
    }, 60000)
  },

  pauseRecording() {
    this.setData({
      isPaused: !this.data.isPaused
    })
  },

  stopRecording() {
    wx.stopLocationUpdate()
    clearInterval(this.timer)

    const distance = parseFloat(this.data.distance)
    const time = this.data.time
    const modeMap = ['walk', 'bike', 'bus', 'metro']
    const mode = modeMap[this.data.modeIndex]

    if (distance < 0.1) {
      showToast('距离过短，无法计算')
      this.setData({
        isRecording: false
      })
      return
    }

    showLoading('计算碳积分...')

    request('/calculate', 'POST', {
      user_id: getStorage('userInfo').id,
      distance: distance,
      time: time,
      mode: mode
    }).then(data => {
      hideLoading()
      if (data.error) {
        showToast(data.error)
      } else {
        showToast('轨迹记录成功，获得 ' + data.points + ' 积分', 'success')
        
        // 更新用户积分
        const userInfo = getStorage('userInfo')
        userInfo.total_points = (userInfo.total_points || 0) + data.points
        setStorage('userInfo', userInfo)
        app.globalData.userInfo = userInfo
      }
    }).catch(err => {
      hideLoading()
      showToast('计算失败，请稍后重试')
      console.error(err)
    })

    this.setData({
      isRecording: false
    })
  },

  onUnload() {
    wx.stopLocationUpdate()
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
})
