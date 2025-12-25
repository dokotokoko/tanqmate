"""
オントロジーグラフシステム テスト実行スクリプト
簡単にテストAPIサーバーを起動するためのスクリプト
"""

import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path
import threading

def check_port_available(port):
    """ポートが利用可能かチェック"""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result != 0

def start_server(script_name, port, name):
    """サーバーを起動"""
    print(f"🚀 {name}を起動中... (ポート: {port})")
    
    if not check_port_available(port):
        print(f"⚠️ ポート {port} は既に使用されています")
        return None
    
    # Pythonパスを設定
    env = os.environ.copy()
    env['PYTHONPATH'] = str(Path(__file__).parent)
    
    try:
        process = subprocess.Popen([
            sys.executable, 
            f"backend/{script_name}",
            "--host", "0.0.0.0",
            "--port", str(port)
        ], env=env)
        
        # サーバー起動を待機
        time.sleep(3)
        
        if process.poll() is None:
            print(f"✅ {name}が起動しました (PID: {process.pid})")
            return process
        else:
            print(f"❌ {name}の起動に失敗しました")
            return None
            
    except Exception as e:
        print(f"❌ {name}起動エラー: {e}")
        return None

def open_dashboard():
    """ダッシュボードをブラウザで開く"""
    time.sleep(2)  # サーバー起動を待機
    dashboard_path = Path(__file__).parent / "ontology_test_dashboard.html"
    
    if dashboard_path.exists():
        print("🌐 ダッシュボードをブラウザで開いています...")
        webbrowser.open(f"file://{dashboard_path.absolute()}")
    else:
        print("⚠️ ダッシュボードファイルが見つかりません")

def main():
    """メイン実行関数"""
    print("="*60)
    print("🌟 オントロジーグラフシステム テスト環境")
    print("="*60)
    
    # 必要なファイルの確認
    required_files = [
        "ontology.yaml",
        "constraints.yaml",
        "backend/ontology_test_api.py",
        "backend/graph_management_api.py",
        "ontology_test_dashboard.html"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ 必要なファイルが見つかりません:")
        for file in missing_files:
            print(f"   - {file}")
        print("\n実行前に必要なファイルを配置してください。")
        return
    
    print("✅ 必要なファイルが確認されました")
    
    # プロセス管理用リスト
    processes = []
    
    try:
        # 1. テストAPIサーバー起動
        test_api = start_server(
            "ontology_test_api.py", 
            8080, 
            "テストAPIサーバー"
        )
        if test_api:
            processes.append(test_api)
        
        # 2. グラフ管理APIサーバー起動
        graph_api = start_server(
            "graph_management_api.py", 
            8081, 
            "グラフ管理APIサーバー"
        )
        if graph_api:
            processes.append(graph_api)
        
        if not processes:
            print("❌ サーバーの起動に失敗しました")
            return
        
        # 3. ダッシュボードを別スレッドで開く
        dashboard_thread = threading.Thread(target=open_dashboard)
        dashboard_thread.daemon = True
        dashboard_thread.start()
        
        print("\n" + "="*60)
        print("🎉 テスト環境が正常に起動しました！")
        print("="*60)
        print(f"📊 テストAPI: http://localhost:8080")
        print(f"🔧 グラフ管理API: http://localhost:8081")
        print(f"📱 ダッシュボード: ontology_test_dashboard.html")
        print("\n利用可能なエンドポイント:")
        print("  📬 POST /test/chat - チャット機能テスト")
        print("  📊 GET /test/stats - システム統計")
        print("  👤 GET /test/graph/{user_id} - ユーザーグラフ状態")
        print("  🔄 POST /test/mode/switch - モード切り替え")
        print("  ➕ POST /graph/nodes - ノード作成")
        print("  📈 GET /graph/stats - グラフ統計")
        print("\n" + "="*60)
        print("Ctrl+C でサーバーを停止")
        print("="*60)
        
        # メインループ（キーボード割り込みまで待機）
        while True:
            time.sleep(1)
            
            # プロセスの生存確認
            for i, process in enumerate(processes):
                if process.poll() is not None:
                    print(f"⚠️ プロセス {i+1} が予期せず終了しました")
                    processes.remove(process)
            
            if not processes:
                print("❌ すべてのサーバーが停止しました")
                break
    
    except KeyboardInterrupt:
        print("\n\n🛑 シャットダウン中...")
        
        # プロセスを順次終了
        for i, process in enumerate(processes):
            print(f"📴 プロセス {i+1} を停止中...")
            process.terminate()
            
            # 強制終了が必要な場合
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print(f"⚡ プロセス {i+1} を強制終了中...")
                process.kill()
                process.wait()
        
        print("✅ すべてのプロセスが停止しました")
    
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")
        
        # クリーンアップ
        for process in processes:
            try:
                process.terminate()
            except:
                pass
    
    print("\n👋 テスト環境を終了しました")

if __name__ == "__main__":
    main()