import json
import urllib.request

# 测试登录功能
data = {
    "username": "testuser",
    "password": "123456"
}

url = 'http://127.0.0.1:5000/login'

req = urllib.request.Request(
    url,
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        print('Status:', response.status)
        print('Response:', response.read().decode('utf-8'))
except Exception as e:
    print('Error:', e)
