# 测试前端API
import urllib.request
import json

url = 'http://127.0.0.1:5000/calculate'
data = {
    'distance': 10,
    'time': 30,
    'mode': 'bike'
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), 
                           headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        result = response.read().decode('utf-8')
        print("返回格式:")
        print(result)
except urllib.error.HTTPError as e:
    print(f"Error: {e.code} - {e.reason}")
