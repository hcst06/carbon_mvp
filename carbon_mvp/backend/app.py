from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os

from calculator import calculate_carbon
from anti_cheat import check_cheat
from blockchain import create_carbon_block, get_blockchain, validate_blockchain

# 设置前端目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)  # 允许跨域请求，支持微信小程序

# 初始化数据库
def init_db():
    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    # 创建用户表
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            total_points REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # 创建记录表
    c.execute('''
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            distance REAL,
            mode TEXT,
            time REAL,
            reduction REAL,
            points REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    # 创建产品表
    c.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price_points REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            image_url TEXT
        )
    ''')
    # 创建兑换记录表
    c.execute('''
        CREATE TABLE IF NOT EXISTS exchanges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER,
            points REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# 首页（直接打开HTML）
@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

# 用户注册
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password or not email:
        return jsonify({"error": "请填写完整的注册信息"})

    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    try:
        c.execute('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', (username, password, email))
        conn.commit()
        return jsonify({"message": "注册成功"})
    except sqlite3.IntegrityError:
        return jsonify({"error": "用户名或邮箱已存在"})
    finally:
        conn.close()

# 用户登录
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    c.execute('SELECT id, username, total_points FROM users WHERE username = ? AND password = ?', (username, password))
    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({
            "id": user[0],
            "username": user[1],
            "total_points": user[2]
        })
    else:
        return jsonify({"error": "用户名或密码错误"})

# 计算接口
@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json

    user_id = data.get('user_id')
    distance = data.get('distance')
    mode = data.get('mode')
    time_minutes = data.get('time')

    if not user_id:
        return jsonify({"error": "用户ID不能为空"})

    cheat, msg = check_cheat(distance, time_minutes, mode)
    if cheat:
        return jsonify({"error": msg})

    result = calculate_carbon(distance, mode)
    if result is None:
        return jsonify({"error": "出行方式错误"})

    reduction, points = result

    # 区块链存证
    block = create_carbon_block(user_id, distance, mode, time_minutes, reduction, points)

    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    try:
        # 插入记录
        c.execute('''
            INSERT INTO records (user_id, distance, mode, time, reduction, points)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, distance, mode, time_minutes, reduction, points))
        # 更新用户总积分
        c.execute('UPDATE users SET total_points = total_points + ? WHERE id = ?', (points, user_id))
        conn.commit()
    finally:
        conn.close()

    return jsonify({
        "reduction_g": reduction,
        "points": points,
        "block_hash": block["hash"]
    })

# 查询用户记录
@app.route('/records/<int:user_id>')
def user_records(user_id):
    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    c.execute('SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
    rows = c.fetchall()
    conn.close()

    return jsonify(rows)

# 获取用户信息
@app.route('/user/<int:user_id>')
def get_user(user_id):
    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    c.execute('SELECT id, username, email, total_points FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "total_points": user[3]
        })
    else:
        return jsonify({"error": "用户不存在"})

# 修改密码
@app.route('/change-password', methods=['POST'])
def change_password():
    data = request.json
    user_id = data.get('user_id')
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not user_id or not old_password or not new_password:
        return jsonify({"error": "请填写完整的密码修改信息"})

    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    try:
        # 验证旧密码
        c.execute('SELECT id FROM users WHERE id = ? AND password = ?', (user_id, old_password))
        user = c.fetchone()
        if not user:
            return jsonify({"error": "旧密码错误"})

        # 更新密码
        c.execute('UPDATE users SET password = ? WHERE id = ?', (new_password, user_id))
        conn.commit()
        return jsonify({"message": "密码修改成功"})
    finally:
        conn.close()

# 获取产品列表
@app.route('/products')
def get_products():
    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    c.execute('SELECT * FROM products')
    rows = c.fetchall()
    conn.close()

    products = []
    for row in rows:
        products.append({
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "price_points": row[3],
            "stock": row[4],
            "image_url": row[5]
        })

    return jsonify(products)

# 兑换产品
@app.route('/exchange', methods=['POST'])
def exchange():
    data = request.json
    user_id = data.get('user_id')
    product_id = data.get('product_id')

    if not user_id or not product_id:
        return jsonify({"error": "用户ID和产品ID不能为空"})

    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    try:
        # 获取产品信息
        c.execute('SELECT price_points, stock FROM products WHERE id = ?', (product_id,))
        product = c.fetchone()
        if not product:
            return jsonify({"error": "产品不存在"})
        price_points, stock = product

        if stock <= 0:
            return jsonify({"error": "产品库存不足"})

        # 获取用户积分
        c.execute('SELECT total_points FROM users WHERE id = ?', (user_id,))
        user = c.fetchone()
        if not user:
            return jsonify({"error": "用户不存在"})
        user_points = user[0]

        if user_points < price_points:
            return jsonify({"error": "积分不足"})

        # 执行兑换
        c.execute('UPDATE users SET total_points = total_points - ? WHERE id = ?', (price_points, user_id))
        c.execute('UPDATE products SET stock = stock - 1 WHERE id = ?', (product_id,))
        c.execute('INSERT INTO exchanges (user_id, product_id, points) VALUES (?, ?, ?)', (user_id, product_id, price_points))
        conn.commit()

        return jsonify({"message": "兑换成功"})
    finally:
        conn.close()

# 获取区块链数据
@app.route('/blockchain')
def get_blockchain_data():
    chain = get_blockchain()
    is_valid = validate_blockchain()
    return jsonify({
        "chain": chain,
        "is_valid": is_valid
    })

# 获取用户统计数据
@app.route('/stats/<int:user_id>')
def get_user_stats(user_id):
    conn = sqlite3.connect(os.path.join(BASE_DIR, '..', 'database.db'))
    c = conn.cursor()
    
    # 获取总减排量和总积分
    c.execute('SELECT SUM(reduction), SUM(points) FROM records WHERE user_id = ?', (user_id,))
    total_stats = c.fetchone()
    total_reduction = total_stats[0] or 0
    total_points = total_stats[1] or 0
    
    # 获取按出行方式统计的数据
    c.execute('''
        SELECT mode, SUM(reduction), SUM(points), COUNT(*) 
        FROM records 
        WHERE user_id = ? 
        GROUP BY mode
    ''', (user_id,))
    mode_stats = c.fetchall()
    
    # 获取最近7天的减排数据
    c.execute('''
        SELECT DATE(created_at) as date, SUM(reduction), SUM(points) 
        FROM records 
        WHERE user_id = ? AND created_at >= date('now', '-7 days') 
        GROUP BY date(created_at)
        ORDER BY date(created_at)
    ''', (user_id,))
    daily_stats = c.fetchall()
    
    conn.close()
    
    return jsonify({
        "total_reduction": total_reduction,
        "total_points": total_points,
        "mode_stats": mode_stats,
        "daily_stats": daily_stats
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
