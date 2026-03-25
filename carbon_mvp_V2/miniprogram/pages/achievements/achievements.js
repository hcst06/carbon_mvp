const app = getApp()
const { request, showToast, showLoading, hideLoading, getStorage, setStorage } = require('../../utils/request.js')

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

  switchTab(tab) {
    this.setData({
      activeTab: tab
    })
  },

  loadAchievements() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) return

    // 模拟成就数据
    const achievements = [
      {
        id: 1,
        name: '环保新人',
        description: '完成第一次绿色出行',
        reward: 10,
        emoji: '🌱',
        achieved: true
      },
      {
        id: 2,
        name: '绿色先锋',
        description: '累计减排1000g碳',
        reward: 20,
        emoji: '🌿',
        achieved: false
      },
      {
        id: 3,
        name: '出行达人',
        description: '完成10次绿色出行',
        reward: 30,
        emoji: '🚶',
        achieved: false
      },
      {
        id: 4,
        name: '环保卫士',
        description: '累计减排5000g碳',
        reward: 50,
        emoji: '🛡️',
        achieved: false
      },
      {
        id: 5,
        name: '低碳生活',
        description: '连续7天绿色出行',
        reward: 40,
        emoji: '♻️',
        achieved: false
      }
    ]

    const achieved = achievements.filter(a => a.achieved)
    const unachieved = achievements.filter(a => !a.achieved)

    this.setData({
      achievedAchievements: achieved,
      unachievedAchievements: unachieved
    })
  },

  loadTasks() {
    const userInfo = getStorage('userInfo')
    if (!userInfo) return

    // 模拟任务数据
    const tasks = [
      {
        id: 1,
        name: '每日出行',
        description: '完成一次绿色出行',
        reward: 5,
        emoji: '📅',
        current: 0,
        target: 1,
        progress: 0,
        active: true
      },
      {
        id: 2,
        name: '环保周',
        description: '一周内完成5次绿色出行',
        reward: 25,
        emoji: '📆',
        current: 2,
        target: 5,
        progress: 40,
        active: true
      },
      {
        id: 3,
        name: '减排挑战',
        description: '单次减排超过500g碳',
        reward: 15,
        emoji: '🎯',
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
        emoji: '📤',
        current: 1,
        target: 1,
        progress: 100,
        active: true
      }
    ]

    const active = tasks.filter(t => t.active)
    const completed = tasks.filter(t => !t.active)

    this.setData({
      activeTasks: active,
      completedTasks: completed
    })
  },

  claimTask(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.activeTasks.find(t => t.id === taskId)

    if (!task) return

    if (task.progress >= 100) {
      showLoading('领取奖励...')
      
      // 模拟领取奖励
      setTimeout(() => {
        hideLoading()
        showToast('奖励领取成功', 'success')
        
        // 更新用户积分
        const userInfo = getStorage('userInfo')
        if (userInfo) {
          userInfo.total_points = (userInfo.total_points || 0) + task.reward
          setStorage('userInfo', userInfo)
          app.globalData.userInfo = userInfo
        }
        
        // 更新任务状态
        const updatedTasks = this.data.activeTasks.map(t => {
          if (t.id === taskId) {
            return { ...t, active: false }
          }
          return t
        })
        
        this.setData({
          activeTasks: updatedTasks.filter(t => t.active),
          completedTasks: [...this.data.completedTasks, { ...task, active: false }]
        })
      }, 1000)
    }
  }
})
