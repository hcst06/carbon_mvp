import hashlib
import json
from datetime import datetime

class Blockchain:
    def __init__(self):
        self.chain = []
        # 创建创世区块
        self.create_block(data={"message": "碳行益农平台创世区块"})
    
    def create_block(self, data):
        block = {
            "index": len(self.chain) + 1,
            "timestamp": str(datetime.now()),
            "data": data,
            "previous_hash": self.get_previous_hash() if self.chain else "0"
        }
        block["hash"] = self.calculate_hash(block)
        self.chain.append(block)
        return block
    
    def get_previous_hash(self):
        return self.chain[-1]["hash"]
    
    def calculate_hash(self, block):
        block_string = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()
    
    def is_chain_valid(self):
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i-1]
            
            # 检查当前区块的哈希值是否正确
            if current_block["hash"] != self.calculate_hash(current_block):
                return False
            
            # 检查当前区块的前一个哈希值是否与前一个区块的哈希值匹配
            if current_block["previous_hash"] != previous_block["hash"]:
                return False
        return True

# 创建全局区块链实例
blockchain = Blockchain()

# 为碳积分记录创建区块
def create_carbon_block(user_id, distance, mode, time, reduction, points):
    data = {
        "user_id": user_id,
        "distance": distance,
        "mode": mode,
        "time": time,
        "reduction": reduction,
        "points": points
    }
    block = blockchain.create_block(data)
    return block

# 获取区块链状态
def get_blockchain():
    return blockchain.chain

# 验证区块链
def validate_blockchain():
    return blockchain.is_chain_valid()
