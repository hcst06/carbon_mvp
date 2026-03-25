# 碳行益农微信小程序项目结构

## 项目概述

碳行益农微信小程序是基于绿色出行的碳积分助农平台，将用户的绿色出行行为量化为碳减排数据，并转化为积分，用于兑换农产品，实现环保与助农的结合。

## 项目结构

```
carbon_mvp/
├── backend/                      # Flask后端服务
│   ├── app.py                   # 主应用文件（已更新支持CORS）
│   ├── calculator.py            # 碳积分计算引擎
│   ├── anti_cheat.py            # 反作弊系统
│   ├── blockchain.py            # 区块链存证模块
│   └── __pycache__/             # Python缓存文件
├── miniprogram/                 # 微信小程序前端（新增）
│   ├── pages/                   # 页面目录
│   │   ├── index/               # 首页
│   │   │   ├── index.js         # 首页逻辑
│   │   │   ├── index.wxml       # 首页结构
│   │   │   └── index.wxss       # 首页样式
│   │   ├── calculate/           # 碳积分计算页面
│   │   │   ├── calculate.js     # 计算逻辑
│   │   │   ├── calculate.wxml   # 计算结构
│   │   │   └── calculate.wxss   # 计算样式
│   │   ├── exchange/            # 积分兑换页面
│   │   │   ├── exchange.js      # 兑换逻辑
│   │   │   ├── exchange.wxml    # 兑换结构
│   │   │   └── exchange.wxss    # 兑换样式
│   │   ├── records/             # 历史记录页面
│   │   │   ├── records.js       # 记录逻辑
│   │   │   ├── records.wxml     # 记录结构
│   │   │   └── records.wxss     # 记录样式
│   │   ├── stats/               # 数据统计页面
│   │   │   ├── stats.js         # 统计逻辑
│   │   │   ├── stats.wxml       # 统计结构
│   │   │   └── stats.wxss       # 统计样式
│   │   ├── login/               # 登录页面
│   │   │   ├── login.js         # 登录逻辑
│   │   │   ├── login.wxml       # 登录结构
│   │   │   └── login.wxss       # 登录样式
│   │   ├── register/            # 注册页面
│   │   │   ├── register.js      # 注册逻辑
│   │   │   ├── register.wxml    # 注册结构
│   │   │   └── register.wxss    # 注册样式
│   │   └── profile/             # 个人中心页面
│   │       ├── profile.js       # 个人中心逻辑
│   │       ├── profile.wxml     # 个人中心结构
│   │       └── profile.wxss     # 个人中心样式
│   ├── utils/                   # 工具函数目录
│   │   └── request.js           # 网络请求封装
│   ├── images/                  # 图片资源目录（需要添加）
│   ├── app.js                   # 小程序入口文件
│   ├── app.json                 # 小程序配置文件
│   ├── app.wxss                 # 全局样式文件
│   └── sitemap.json             # 站点地图配置
├── frontend/                    # Web前端（保留）
│   └── index.html               # Web页面
├── database.db                  # SQLite数据库文件
├── init_data.py                 # 初始化数据脚本
├── test_api.py                  # API测试脚本
├── README_MINIPROGRAM.md        # 微信小程序部署指南
└── PROJECT_STRUCTURE.md         # 本文件
```

## 核心功能模块

### 1. 用户认证模块
- **登录页面**：用户名密码登录
- **注册页面**：新用户注册
- **个人中心**：用户信息管理

### 2. 碳积分计算模块
- **计算页面**：输入距离、时间、出行方式计算碳积分
- **反作弊检测**：速度检测、时间异常检测
- **区块链存证**：每笔交易上链，确保数据可信

### 3. 积分兑换模块
- **产品列表**：展示可兑换的农产品
- **兑换功能**：使用积分兑换产品
- **库存管理**：实时更新产品库存

### 4. 数据统计模块
- **统计卡片**：总减排量、总积分、出行次数、平均减排
- **饼图**：按出行方式统计
- **折线图**：最近7天减排趋势

### 5. 历史记录模块
- **记录列表**：展示用户的出行记录
- **详细信息**：距离、时间、减排量、积分等

## 技术栈

### 前端（微信小程序）
- **框架**：微信小程序原生框架
- **样式**：WXSS
- **组件**：微信小程序原生组件
- **API**：wx.request、wx.storage等

### 后端
- **框架**：Flask
- **数据库**：SQLite
- **跨域支持**：flask-cors
- **功能模块**：
  - 碳积分计算
  - 反作弊系统
  - 区块链存证

## API接口

### 用户相关
- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `GET /user/<user_id>` - 获取用户信息
- `POST /change-password` - 修改密码

### 碳积分相关
- `POST /calculate` - 计算碳积分
- `GET /records/<user_id>` - 获取用户记录
- `GET /stats/<user_id>` - 获取统计数据

### 产品相关
- `GET /products` - 获取产品列表
- `POST /exchange` - 兑换产品

### 区块链相关
- `GET /blockchain` - 获取区块链数据

## 数据库表结构

### users（用户表）
- id：用户ID
- username：用户名
- password：密码
- email：邮箱
- total_points：总积分
- created_at：创建时间

### records（记录表）
- id：记录ID
- user_id：用户ID
- distance：距离
- mode：出行方式
- time：时间
- reduction：减排量
- points：积分
- created_at：创建时间

### products（产品表）
- id：产品ID
- name：产品名称
- description：产品描述
- price_points：积分价格
- stock：库存
- image_url：图片URL

### exchanges（兑换记录表）
- id：兑换ID
- user_id：用户ID
- product_id：产品ID
- points：积分
- created_at：创建时间

## 部署说明

### 后端部署
1. 安装依赖：`pip install flask flask-cors`
2. 配置服务器地址：`app.run(host='0.0.0.0', port=5000)`
3. 启动服务：`python backend/app.py`

### 小程序部署
1. 使用微信开发者工具导入项目
2. 配置服务器域名（需要HTTPS）
3. 修改API地址：`miniprogram/app.js` 中的 `baseUrl`
4. 编译和预览

## 注意事项

1. **HTTPS要求**：微信小程序要求使用HTTPS协议
2. **域名备案**：国内服务器需要域名备案
3. **图片资源**：需要添加小程序所需的图片资源
4. **AppID配置**：需要配置小程序AppID
5. **服务器配置**：生产环境建议使用云服务器

## 开发建议

1. **图片资源**：添加小程序所需的图标和图片
2. **错误处理**：完善错误处理和用户提示
3. **性能优化**：优化网络请求和页面渲染
4. **用户体验**：添加加载动画和交互反馈
5. **测试覆盖**：完善测试用例

## 后续优化

1. **微信登录**：集成微信登录功能
2. **位置服务**：使用GPS自动计算距离
3. **推送通知**：添加积分变动通知
4. **社交功能**：添加排行榜和分享功能
5. **数据分析**：完善数据分析和可视化

## 许可证

本项目仅供学习和研究使用。
