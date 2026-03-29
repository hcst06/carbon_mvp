const app = getApp()
const { request, showToast, showLoading, hideLoading, getStorage, setStorage } = require('../../utils/request.js')

Page({
  data: {
    products: []
  },

  onShow() {
    this.loadProducts()
  },

  loadProducts() {
    showLoading('加载中...')

    request('/products', 'GET').then(data => {
      hideLoading()
      this.setData({
        products: data && Array.isArray(data) ? data : []
      })
    }).catch(err => {
      hideLoading()
      showToast('加载失败，请稍后重试')
      console.error(err)
    })
  },

  exchangeProduct(e) {
    const userInfo = getStorage('userInfo')
    if (!userInfo) {
      showToast('请先登录')
      wx.navigateTo({
        url: '/pages/login/login'
      })
      return
    }

    const productId = e.currentTarget.dataset.id
    const product = this.data.products.find(p => p.id === productId)
    
    if (!product) {
      showToast('产品不存在')
      return
    }
    
    if ((userInfo.total_points || 0) < product.price_points) {
      showToast('积分不足')
      return
    }

    wx.showModal({
      title: '确认兑换',
      content: `确定要用 ${product.price_points} 积分兑换 ${product.name} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doExchange(productId, userInfo)
        }
      }
    })
  },

  doExchange(productId, userInfo) {
    showLoading('兑换中...')

    request('/exchange', 'POST', {
      user_id: userInfo.id,
      product_id: productId
    }).then(data => {
      hideLoading()
      if (data.error) {
        showToast(data.error)
      } else {
        showToast('兑换成功', 'success')
        
        const product = this.data.products.find(p => p.id === productId)
        if (product) {
          userInfo.total_points = (userInfo.total_points || 0) - product.price_points
          setStorage('userInfo', userInfo)
          app.globalData.userInfo = userInfo
        }
        
        this.loadProducts()
      }
    }).catch(err => {
      hideLoading()
      showToast('兑换失败，请稍后重试')
      console.error(err)
    })
  }
})
