# 碳行益农微信小程序部署指南

## 项目概述

碳行益农是一个基于绿色出行的碳积分助农平台，将用户的绿色出行行为量化为碳减排数据，并转化为积分，用于兑换农产品，实现环保与助农的结合。

## 项目结构

```
carbon_mvp/
├── backend/              # Flask后端服务
│   ├── app.py           # 主应用文件
│   ├── calculator.py    # 碳积分计算
│   ├── anti_cheat.py    # 反作弊系统
│   └── blockchain.py    # 区块链存证
├── miniprogram/         # 微信小程序前端
│   ├── pages/           # 页面目录
│   ├── utils/           # 工具函数
│   ├── app.js           # 小程序入口
│   ├── app.json         # 配置文件
│   └── app.wxss         # 全局样式
├── frontend/            # Web前端（保留）
└── database.db          # SQLite数据库
```

## 部署步骤

### 1. 后端部署

#### 1.1 安装依赖

```bash
cd backend
pip install flask flask-cors
```

#### 1.2 配置后端服务

编辑 `backend/app.py` 文件，修改以下配置：

```python
# 修改服务器地址，允许外部访问
app.run(debug=True, host='0.0.0.0', port=5000)
```

#### 1.3 启动后端服务

```bash
cd backend
python app.py
```

后端服务将在 `http://0.0.0.0:5000` 启动。

### 2. 微信小程序部署

#### 2.1 准备工作

1. 注册微信小程序账号
2. 下载微信开发者工具
3. 获取小程序AppID

#### 2.2 导入项目

1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择 `miniprogram` 目录
4. 填写项目名称和AppID

#### 2.3 配置服务器域名

1. 登录微信公众平台
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 在"服务器域名"中添加：
   - request合法域名：`https://your-domain.com`（需要HTTPS）
   - uploadFile合法域名：`https://your-domain.com`
   - downloadFile合法域名：`https://your-domain.com`

#### 2.4 修改API地址

编辑 `miniprogram/app.js` 文件，修改 `baseUrl`：

```javascript
globalData: {
  userInfo: null,
  isLogin: false,
  baseUrl: 'https://your-domain.com'  // 修改为实际的服务器地址
}
```

#### 2.5 编译和预览

1. 点击"编译"按钮
2. 在模拟器中测试功能
3. 点击"预览"生成二维码，在手机上测试

### 3. 云服务器部署（推荐）

#### 3.1 购买云服务器

推荐使用：
- 阿里云ECS
- 腾讯云CVM
- 华为云ECS

#### 3.2 安装环境

```bash
# 更新系统
sudo apt update

# 安装Python
sudo apt install python3 python3-pip

# 安装依赖
pip3 install flask flask-cors
```

#### 3.3 上传项目

```bash
# 使用scp上传项目
scp -r carbon_mvp user@your-server:/home/user/
```

#### 3.4 配置Nginx（可选）

```bash
# 安装Nginx
sudo apt install nginx

# 配置反向代理
sudo nano /etc/nginx/sites-available/carbon_mvp
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 3.5 配置SSL证书（HTTPS）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com
```

#### 3.6 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动后端服务
cd /home/user/carbon_mvp/backend
pm2 start app.py --name carbon_mvp

# 设置开机自启
pm2 startup
pm2 save
```

## 功能说明

### 小程序页面

1. **首页**：展示项目介绍和快捷操作
2. **计算页面**：计算碳积分
3. **兑换页面**：使用积分兑换农产品
4. **我的页面**：个人信息和设置
5. **登录/注册页面**：用户认证
6. **历史记录页面**：查看出行记录
7. **数据统计页面**：查看碳减排统计

### 后端API

- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `POST /calculate` - 计算碳积分
- `GET /records/<user_id>` - 获取用户记录
- `GET /products` - 获取产品列表
- `POST /exchange` - 兑换产品
- `GET /stats/<user_id>` - 获取统计数据

## 数据库说明

项目使用SQLite数据库，包含以下表：

- `users` - 用户表
- `records` - 出行记录表
- `products` - 产品表
- `exchanges` - 兑换记录表

## 注意事项

1. **HTTPS要求**：微信小程序要求使用HTTPS协议，需要配置SSL证书
2. **域名备案**：如果使用国内服务器，需要进行域名备案
3. **数据安全**：生产环境应使用更安全的数据库（如MySQL、PostgreSQL）
4. **性能优化**：考虑使用缓存、CDN等优化措施
5. **日志监控**：配置日志记录和监控系统

## 常见问题

### 1. 跨域问题

后端已配置CORS，如果仍有问题，检查 `flask-cors` 是否正确安装。

### 2. 网络请求失败

- 检查服务器是否正常运行
- 检查防火墙设置
- 检查域名配置是否正确

### 3. 数据库连接失败

- 检查数据库文件权限
- 检查数据库路径是否正确

## 技术支持

如有问题，请联系开发团队。

## 许可证

本项目仅供学习和研究使用。
