from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import base64
import json
import os
import secrets
import sqlite3
import time
import urllib.parse
import urllib.request
from datetime import datetime

from calculator import calculate_carbon
from anti_cheat import check_cheat
from blockchain import create_carbon_block, get_blockchain, validate_blockchain

try:
    from Crypto.Cipher import AES
except ImportError:  # pragma: no cover
    AES = None


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')
DB_PATH = os.path.join(BASE_DIR, 'database.db')

WECHAT_APP_ID = os.getenv('WECHAT_APP_ID', '').strip()
WECHAT_APP_SECRET = os.getenv('WECHAT_APP_SECRET', '').strip()

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def column_exists(conn, table_name, column_name):
    columns = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(column['name'] == column_name for column in columns)


def ensure_column(conn, table_name, column_name, ddl):
    if not column_exists(conn, table_name, column_name):
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}")


def ensure_schema():
    conn = get_db_connection()
    try:
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                total_points REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            '''
        )
        conn.execute(
            '''
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
            '''
        )
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price_points REAL NOT NULL,
                stock INTEGER DEFAULT 0,
                image_url TEXT
            )
            '''
        )
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS exchanges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                product_id INTEGER,
                points REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
            '''
        )

        ensure_column(conn, 'users', 'openid', 'TEXT')
        ensure_column(conn, 'users', 'unionid', 'TEXT')
        ensure_column(conn, 'users', 'nickname', 'TEXT')
        ensure_column(conn, 'users', 'avatar_url', 'TEXT')
        ensure_column(conn, 'users', 'login_type', "TEXT DEFAULT 'password'")
        ensure_column(conn, 'users', 'session_key', 'TEXT')
        ensure_column(conn, 'users', 'step_count', 'INTEGER DEFAULT 0')
        ensure_column(conn, 'users', 'step_updated_at', 'TIMESTAMP')
        ensure_column(conn, 'users', 'last_login_at', 'TIMESTAMP')

        conn.execute(
            '''
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_openid
            ON users (openid)
            WHERE openid IS NOT NULL
            '''
        )
        conn.execute(
            '''
            CREATE INDEX IF NOT EXISTS idx_records_user_created_at
            ON records (user_id, created_at DESC)
            '''
        )
        conn.commit()
    finally:
        conn.close()


ensure_schema()


def now_text():
    return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')


def safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def user_to_payload(user_row):
    return {
        "id": user_row["id"],
        "username": user_row["username"],
        "nickname": user_row["nickname"] or user_row["username"],
        "email": user_row["email"],
        "total_points": user_row["total_points"] or 0,
        "avatar_url": user_row["avatar_url"] or '',
        "login_type": user_row["login_type"] or 'password',
        "step_count": user_row["step_count"] or 0,
        "step_updated_at": user_row["step_updated_at"],
        "is_wechat_user": bool(user_row["openid"])
    }


def random_username(prefix='wx_user'):
    return f"{prefix}_{secrets.token_hex(4)}"


def ensure_unique_username(conn, preferred_name):
    candidate = preferred_name or random_username()
    candidate = candidate.strip()[:24] if candidate else random_username()
    if not candidate:
        candidate = random_username()

    existing = conn.execute(
        'SELECT id FROM users WHERE username = ?',
        (candidate,)
    ).fetchone()
    if not existing:
        return candidate

    for _ in range(20):
        next_candidate = f"{candidate[:16]}_{secrets.token_hex(2)}"
        if not conn.execute(
            'SELECT id FROM users WHERE username = ?',
            (next_candidate,)
        ).fetchone():
            return next_candidate
    return random_username()


def ensure_wechat_credentials():
    if not WECHAT_APP_ID or not WECHAT_APP_SECRET:
        raise ValueError('WECHAT_APP_ID 或 WECHAT_APP_SECRET 未配置')


def exchange_wechat_code(code):
    ensure_wechat_credentials()
    params = urllib.parse.urlencode({
        'appid': WECHAT_APP_ID,
        'secret': WECHAT_APP_SECRET,
        'js_code': code,
        'grant_type': 'authorization_code'
    })
    url = f'https://api.weixin.qq.com/sns/jscode2session?{params}'
    with urllib.request.urlopen(url, timeout=10) as response:
        payload = json.loads(response.read().decode('utf-8'))

    if payload.get('errcode'):
        raise ValueError(payload.get('errmsg') or '微信 code 换取 session 失败')
    return payload


def decrypt_wechat_data(session_key, encrypted_data, iv):
    if AES is None:
        raise RuntimeError('服务端缺少 pycryptodome，无法解密微信运动数据')

    session_key_bytes = base64.b64decode(session_key)
    encrypted_bytes = base64.b64decode(encrypted_data)
    iv_bytes = base64.b64decode(iv)

    cipher = AES.new(session_key_bytes, AES.MODE_CBC, iv_bytes)
    decrypted = cipher.decrypt(encrypted_bytes)
    pad = decrypted[-1]
    if isinstance(pad, str):
        pad = ord(pad)
    decrypted = decrypted[:-pad]
    data = json.loads(decrypted.decode('utf-8'))

    watermark = data.get('watermark', {})
    appid = watermark.get('appid')
    if WECHAT_APP_ID and appid and appid != WECHAT_APP_ID:
        raise ValueError('微信运动数据 watermark 校验失败')
    return data


def latest_step_count(step_info_list):
    if not step_info_list:
        return 0
    latest_item = max(step_info_list, key=lambda item: item.get('timestamp', 0))
    return latest_item.get('step', 0)


@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/register', methods=['POST'])
def register():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    email = (data.get('email') or '').strip()

    if not username or not password or not email:
        return jsonify({"error": "请填写完整的注册信息"})

    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO users (username, password, email, nickname, login_type) VALUES (?, ?, ?, ?, ?)',
            (username, password, email, username, 'password')
        )
        conn.commit()
        return jsonify({"message": "注册成功"})
    except sqlite3.IntegrityError:
        return jsonify({"error": "用户名或邮箱已存在"})
    finally:
        conn.close()


@app.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()

    conn = get_db_connection()
    try:
        user = conn.execute(
            '''
            SELECT id, username, nickname, email, total_points, avatar_url,
                   login_type, step_count, step_updated_at, openid
            FROM users
            WHERE username = ? AND password = ?
            ''',
            (username, password)
        ).fetchone()

        if not user:
            return jsonify({"error": "用户名或密码错误"})

        conn.execute(
            'UPDATE users SET last_login_at = ?, login_type = ? WHERE id = ?',
            (now_text(), 'password', user['id'])
        )
        conn.commit()

        refreshed = conn.execute('SELECT * FROM users WHERE id = ?', (user['id'],)).fetchone()
        return jsonify(user_to_payload(refreshed))
    finally:
        conn.close()


@app.route('/wechat/login', methods=['POST'])
def wechat_login():
    data = request.json or {}
    code = (data.get('code') or '').strip()
    avatar_url = (data.get('avatar_url') or '').strip()
    nickname = (data.get('nickname') or '').strip() or '微信用户'

    if not code:
        return jsonify({"error": "缺少微信登录 code"})

    try:
        session_data = exchange_wechat_code(code)
    except ValueError as exc:
        return jsonify({"error": str(exc)})
    except Exception:
        return jsonify({"error": "微信登录服务暂时不可用"})

    openid = session_data.get('openid')
    unionid = session_data.get('unionid')
    session_key = session_data.get('session_key')

    if not openid or not session_key:
        return jsonify({"error": "微信登录失败，未获取到 openid"})

    conn = get_db_connection()
    try:
        user = conn.execute('SELECT * FROM users WHERE openid = ?', (openid,)).fetchone()
        timestamp = now_text()

        if user:
            username = user['username']
            if nickname and username.startswith('wx_user_'):
                username = ensure_unique_username(conn, nickname)

            conn.execute(
                '''
                UPDATE users
                SET username = ?, nickname = ?, avatar_url = ?, unionid = COALESCE(?, unionid),
                    session_key = ?, login_type = 'wechat', last_login_at = ?
                WHERE id = ?
                ''',
                (username, nickname, avatar_url, unionid, session_key, timestamp, user['id'])
            )
        else:
            username = ensure_unique_username(conn, nickname)
            email = f'wx_{openid[:12]}@wechat.local'
            conn.execute(
                '''
                INSERT INTO users (
                    username, password, email, total_points, openid, unionid,
                    nickname, avatar_url, login_type, session_key, last_login_at
                ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, 'wechat', ?, ?)
                ''',
                (
                    username,
                    secrets.token_hex(16),
                    email,
                    openid,
                    unionid,
                    nickname,
                    avatar_url,
                    session_key,
                    timestamp
                )
            )

        conn.commit()
        saved_user = conn.execute('SELECT * FROM users WHERE openid = ?', (openid,)).fetchone()
        return jsonify(user_to_payload(saved_user))
    except sqlite3.IntegrityError:
        return jsonify({"error": "微信账号绑定失败，请稍后重试"})
    finally:
        conn.close()


@app.route('/wechat/we-run', methods=['POST'])
def sync_we_run():
    data = request.json or {}
    user_id = data.get('user_id')
    encrypted_data = data.get('encrypted_data')
    iv = data.get('iv')
    code = (data.get('code') or '').strip()

    if not user_id or not encrypted_data or not iv:
        return jsonify({"error": "缺少微信运动同步参数"})

    conn = get_db_connection()
    try:
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            return jsonify({"error": "用户不存在"})

        session_key = user['session_key']
        if code:
            try:
                session_data = exchange_wechat_code(code)
                session_key = session_data.get('session_key') or session_key
                conn.execute(
                    'UPDATE users SET session_key = ?, last_login_at = ? WHERE id = ?',
                    (session_key, now_text(), user_id)
                )
                conn.commit()
            except Exception:
                pass

        if not session_key:
            return jsonify({"error": "缺少 session_key，请重新微信登录后再同步"})

        try:
            we_run_data = decrypt_wechat_data(session_key, encrypted_data, iv)
        except RuntimeError as exc:
            return jsonify({"error": str(exc)})
        except Exception:
            return jsonify({"error": "微信运动数据解密失败，请重新授权"})

        steps = latest_step_count(we_run_data.get('stepInfoList', []))
        updated_at = now_text()

        conn.execute(
            'UPDATE users SET step_count = ?, step_updated_at = ? WHERE id = ?',
            (steps, updated_at, user_id)
        )
        conn.commit()

        updated_user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        return jsonify({
            "step_count": steps,
            "step_updated_at": updated_at,
            "step_info_list": we_run_data.get('stepInfoList', []),
            "user": user_to_payload(updated_user)
        })
    finally:
        conn.close()


@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json or {}
    user_id = data.get('user_id')
    distance = safe_float(data.get('distance'))
    mode = data.get('mode')
    time_minutes = safe_float(data.get('time'))

    if not user_id:
        return jsonify({"error": "用户ID不能为空"})
    if distance is None or time_minutes is None:
        return jsonify({"error": "距离和时间格式不正确"})

    cheat, msg = check_cheat(distance, time_minutes, mode)
    if cheat:
        return jsonify({"error": msg})

    result = calculate_carbon(distance, mode)
    if result is None:
        return jsonify({"error": "出行方式错误"})

    reduction, points = result
    block = create_carbon_block(user_id, distance, mode, time_minutes, reduction, points)

    conn = get_db_connection()
    try:
        conn.execute(
            '''
            INSERT INTO records (user_id, distance, mode, time, reduction, points)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (user_id, distance, mode, time_minutes, reduction, points)
        )
        conn.execute(
            'UPDATE users SET total_points = total_points + ? WHERE id = ?',
            (points, user_id)
        )
        conn.commit()
    finally:
        conn.close()

    return jsonify({
        "reduction_g": reduction,
        "points": points,
        "block_hash": block["hash"]
    })


@app.route('/records/<int:user_id>')
def user_records(user_id):
    conn = get_db_connection()
    try:
        rows = conn.execute(
            '''
            SELECT id, user_id, distance, mode, time, reduction, points, created_at
            FROM records
            WHERE user_id = ?
            ORDER BY created_at DESC
            ''',
            (user_id,)
        ).fetchall()

        records = []
        for row in rows:
            records.append({
                "id": row["id"],
                "user_id": row["user_id"],
                "distance": row["distance"],
                "mode": row["mode"],
                "time": row["time"],
                "reduction": row["reduction"],
                "points": row["points"],
                "created_at": row["created_at"]
            })
        return jsonify(records)
    finally:
        conn.close()


@app.route('/user/<int:user_id>')
def get_user(user_id):
    conn = get_db_connection()
    try:
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            return jsonify({"error": "用户不存在"})
        return jsonify(user_to_payload(user))
    finally:
        conn.close()


@app.route('/change-password', methods=['POST'])
def change_password():
    data = request.json or {}
    user_id = data.get('user_id')
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not user_id or not old_password or not new_password:
        return jsonify({"error": "请填写完整的密码修改信息"})

    conn = get_db_connection()
    try:
        user = conn.execute(
            'SELECT id FROM users WHERE id = ? AND password = ?',
            (user_id, old_password)
        ).fetchone()
        if not user:
            return jsonify({"error": "旧密码错误"})

        conn.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            (new_password, user_id)
        )
        conn.commit()
        return jsonify({"message": "密码修改成功"})
    finally:
        conn.close()


@app.route('/products')
def get_products():
    conn = get_db_connection()
    try:
        rows = conn.execute('SELECT * FROM products').fetchall()
        return jsonify([
            {
                "id": row["id"],
                "name": row["name"],
                "description": row["description"],
                "price_points": row["price_points"],
                "stock": row["stock"],
                "image_url": row["image_url"]
            }
            for row in rows
        ])
    finally:
        conn.close()


@app.route('/exchange', methods=['POST'])
def exchange():
    data = request.json or {}
    user_id = data.get('user_id')
    product_id = data.get('product_id')

    if not user_id or not product_id:
        return jsonify({"error": "用户ID和产品ID不能为空"})

    conn = get_db_connection()
    try:
        product = conn.execute(
            'SELECT price_points, stock FROM products WHERE id = ?',
            (product_id,)
        ).fetchone()
        if not product:
            return jsonify({"error": "产品不存在"})

        if product["stock"] <= 0:
            return jsonify({"error": "产品库存不足"})

        user = conn.execute(
            'SELECT total_points FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        if not user:
            return jsonify({"error": "用户不存在"})

        user_points = user["total_points"] or 0
        price_points = product["price_points"]

        if user_points < price_points:
            return jsonify({"error": "积分不足"})

        conn.execute(
            'UPDATE users SET total_points = total_points - ? WHERE id = ?',
            (price_points, user_id)
        )
        conn.execute(
            'UPDATE products SET stock = stock - 1 WHERE id = ?',
            (product_id,)
        )
        conn.execute(
            'INSERT INTO exchanges (user_id, product_id, points) VALUES (?, ?, ?)',
            (user_id, product_id, price_points)
        )
        conn.commit()
        return jsonify({"message": "兑换成功"})
    finally:
        conn.close()


@app.route('/blockchain')
def get_blockchain_data():
    return jsonify({
        "chain": get_blockchain(),
        "is_valid": validate_blockchain()
    })


@app.route('/stats/<int:user_id>')
def get_user_stats(user_id):
    conn = get_db_connection()
    try:
        total_stats = conn.execute(
            'SELECT SUM(reduction) AS total_reduction, SUM(points) AS total_points FROM records WHERE user_id = ?',
            (user_id,)
        ).fetchone()
        total_reduction = total_stats["total_reduction"] or 0
        total_points = total_stats["total_points"] or 0

        mode_stats = conn.execute(
            '''
            SELECT mode, SUM(reduction) AS reduction_sum, SUM(points) AS points_sum, COUNT(*) AS trip_count
            FROM records
            WHERE user_id = ?
            GROUP BY mode
            ''',
            (user_id,)
        ).fetchall()

        daily_stats = conn.execute(
            '''
            SELECT DATE(created_at) AS date, SUM(reduction) AS reduction_sum, SUM(points) AS points_sum
            FROM records
            WHERE user_id = ? AND created_at >= date('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
            ''',
            (user_id,)
        ).fetchall()

        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()

        return jsonify({
            "total_reduction": total_reduction,
            "total_points": total_points,
            "mode_stats": [
                [row["mode"], row["reduction_sum"], row["points_sum"], row["trip_count"]]
                for row in mode_stats
            ],
            "daily_stats": [
                [row["date"], row["reduction_sum"], row["points_sum"]]
                for row in daily_stats
            ],
            "step_count": (user["step_count"] if user else 0) or 0,
            "step_updated_at": user["step_updated_at"] if user else None
        })
    finally:
        conn.close()


@app.route('/healthz')
def healthz():
    return jsonify({
        "ok": True,
        "time": int(time.time()),
        "wechat_configured": bool(WECHAT_APP_ID and WECHAT_APP_SECRET),
        "we_run_available": AES is not None
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
