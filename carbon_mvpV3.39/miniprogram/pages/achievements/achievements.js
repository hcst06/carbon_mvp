const app = getApp()
const { showToast, showLoading, hideLoading, getStorage, setStorage } = require('../../utils/request.js')

Page({
  data: {
    activeTab: 'achievements',
    achievedAchievements: [],
    unachievedAchievements: [],
    activeTasks: [],
    completedTasks: []
  },

  onShow() {
    this.loadAchievements()
    this.loadTasks()
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({
      activeTab: tab
    })
  },

  loadAchievements() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) return

    const achievements = [
      {
        id: 1,
        name: '环保新人',
        description: '完成第一次绿色出行',
        reward: 10,
        iconText: 'NEW',
        achieved: true
      },
      {
        id: 2,
        name: '绿色先锋',
        description: '累计减排 1000g 碳排放',
        reward: 20,
        iconText: 'CO2',
        achieved: false
      },
      {
        id: 3,
        name: '出行达人',
        description: '完成 10 次绿色出行',
        reward: 30,
        iconText: 'TRIP',
        achieved: false
      },
      {
        id: 4,
        name: '环保卫士',
        description: '累计减排 5000g 碳排放',
        reward: 50,
        iconText: 'STAR',
        achieved: false
      },
      {
        id: 5,
        name: '低碳生活',
        description: '连续 7 天绿色出行',
        reward: 40,
        iconText: '7D',
        achieved: false
      }
    ]

    this.setData({
      achievedAchievements: achievements.filter((item) => item.achieved),
      unachievedAchievements: achievements.filter((item) => !item.achieved)
    })
  },

  loadTasks() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) return

    const tasks = [
      {
        id: 1,
        name: '每日出行',
        description: '完成一次绿色出行',
        reward: 5,
        iconText: 'DAY',
        current: 0,
        target: 1,
        progress: 0,
        active: true
      },
      {
        id: 2,
        name: '环保周计划',
        description: '一周内完成 5 次绿色出行',
        reward: 25,
        iconText: 'WEEK',
        current: 2,
        target: 5,
        progress: 40,
        active: true
      },
      {
        id: 3,
        name: '减排挑战',
        description: '单次减排超过 500g 碳排放',
        reward: 15,
        iconText: '500',
        current: 0,
        target: 1,
        progress: 0,
        active: true
      },
      {
        id: 4,
        name: '分享环保',
        description: '分享一次绿色出行记录',
        reward: 10,
        iconText: 'SHARE',
        current: 1,
        target: 1,
        progress: 100,
        active: true
      }
    ]

    this.setData({
      activeTasks: tasks.filter((item) => item.active),
      completedTasks: tasks.filter((item) => !item.active)
    })
  },

  claimTask(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.activeTasks.find((item) => item.id === taskId)

    if (!task || task.progress < 100) {
      return
    }

    showLoading('领取奖励...')

    setTimeout(() => {
      hideLoading()
      showToast('奖励领取成功', 'success')

      const userInfo = getStorage('userInfo')
      if (userInfo) {
        userInfo.total_points = (userInfo.total_points || 0) + task.reward
        setStorage('userInfo', userInfo)
        app.globalData.userInfo = userInfo
      }

      const updatedTasks = this.data.activeTasks.map((item) => {
        if (item.id === taskId) {
          return { ...item, active: false }
        }
        return item
      })

      this.setData({
        activeTasks: updatedTasks.filter((item) => item.active),
        completedTasks: [...this.data.completedTasks, { ...task, active: false }]
      })
    }, 1000)
  }
})
