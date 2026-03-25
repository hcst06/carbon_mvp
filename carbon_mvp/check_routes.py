import re

with open('backend/app.py', 'r', encoding='utf-8') as f:
    content = f.read()

routes = re.findall(r"@app\.route\(['\"]([^'\"]+)['\"]", content)
print('Routes:')
for route in routes:
    print(f'  {route}')
