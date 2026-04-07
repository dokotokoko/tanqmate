#!/usr/bin/env python3
"""
すべてのルーターファイルのServiceManager初期化を遅延初期化パターンに修正するスクリプト
"""

import os
import re

# 修正対象のルーターファイル
router_files = [
    "routers/vibes_tanq_router.py",
    "routers/theme_router.py",
    "routers/conversation_agent_router.py",
    "routers/quest_router.py",
    "routers/project_router.py",
    "routers/metrics_router.py",
    "routers/admin_router.py",
    "routers/memo_router.py",
    "routers/conversation_router.py"
]

# 置換パターン
old_pattern = r"# サービスマネージャー\nservice_manager = ServiceManager\(get_supabase_client\(\)\)"
new_pattern = """# サービスマネージャー（遅延初期化）
_service_manager = None

def get_service_manager() -> ServiceManager:
    global _service_manager
    if _service_manager is None:
        client = get_supabase_client()
        if client:
            _service_manager = ServiceManager(client)
        else:
            raise ValueError("Supabase client could not be initialized")
    return _service_manager"""

# service_manager.get_service を get_service_manager().get_service に置換
service_pattern = r"service_manager\.get_service"
service_replacement = "get_service_manager().get_service"

for router_file in router_files:
    file_path = os.path.join(os.path.dirname(__file__), router_file)
    if not os.path.exists(file_path):
        print(f"ファイルが見つかりません: {file_path}")
        continue
    
    print(f"処理中: {router_file}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # ServiceManager初期化パターンを修正
    if "service_manager = ServiceManager(get_supabase_client())" in content:
        content = content.replace(
            "service_manager = ServiceManager(get_supabase_client())",
            """_service_manager = None

def get_service_manager() -> ServiceManager:
    global _service_manager
    if _service_manager is None:
        client = get_supabase_client()
        if client:
            _service_manager = ServiceManager(client)
        else:
            raise ValueError("Supabase client could not be initialized")
    return _service_manager"""
        )
        
        # service_manager.get_service を get_service_manager().get_service に置換
        content = re.sub(service_pattern, service_replacement, content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  [OK] 修正完了")
    else:
        print(f"  [SKIP] 既に修正済みまたは対象パターンが見つかりません")

print("\n全ルーターファイルの処理が完了しました。")