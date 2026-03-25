import sqlite3
import os

# 获取数据库路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database.db')

# 连接数据库
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# 插入初始产品数据
products = [
    ('有机苹果', '来自山东烟台的有机苹果，清脆甜美', 100, 100, ''),
    ('新鲜柠檬', '四川安岳柠檬，富含维生素C', 80, 100, ''),
    ('有机茶叶', '福建武夷山有机茶叶，清香醇厚', 150, 100, '')
]

# 清空产品表
c.execute('DELETE FROM products')

# 插入产品数据
c.executemany('''
    INSERT INTO products (name, description, price_points, stock, image_url)
    VALUES (?, ?, ?, ?, ?)
''', products)

# 提交事务
conn.commit()

# 关闭连接
conn.close()

print('初始数据插入成功')
