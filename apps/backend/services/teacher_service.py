import os
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json

class TeacherService:
    def __init__(self):
        db_path = os.getenv("DATABASE_PATH", "./database/tanqmates.db")
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        
        # テーブル作成（存在しない場合）
        self._create_tables()
        
    def _create_tables(self):
        """必要なテーブルを作成"""
        # 生徒テーブル
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS students (
                student_id TEXT PRIMARY KEY,
                student_name TEXT NOT NULL,
                student_number INTEGER,
                class_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 感情記録テーブル
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS emotion_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                emotion TEXT NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id)
            )
        ''')
        
        # クラステーブル
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS classes (
                class_id TEXT PRIMARY KEY,
                class_name TEXT NOT NULL,
                teacher_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        self.conn.commit()
    
    async def get_classroom_overview(self, class_id: str, teacher_id: str) -> dict:
        """クラス全体の概要を取得"""
        # クラス情報取得
        class_info = self.cursor.execute(
            "SELECT * FROM classes WHERE class_id = ? AND teacher_id = ?",
            (class_id, teacher_id)
        ).fetchone()
        
        if not class_info:
            # デモデータを作成
            return self._create_demo_classroom_overview(class_id)
        
        # 生徒一覧取得
        students = self.cursor.execute(
            "SELECT * FROM students WHERE class_id = ? ORDER BY student_number",
            (class_id,)
        ).fetchall()
        
        student_summaries = []
        active_today = 0
        today = datetime.now().date()
        
        for student in students:
            # 最新の日誌と感情を取得
            latest_diary = self.cursor.execute(
                """SELECT content, emotion, created_at FROM diaries 
                   WHERE student_id = ? ORDER BY created_at DESC LIMIT 1""",
                (student['student_id'],)
            ).fetchone()
            
            summary = {
                "student_id": student['student_id'],
                "student_name": student['student_name'],
                "student_number": student['student_number'],
                "latest_emotion": None,
                "latest_diary_preview": None,
                "last_updated": None,
                "total_entries": 0
            }
            
            if latest_diary:
                summary['latest_emotion'] = latest_diary['emotion']
                # 最初の100文字をプレビューとして使用
                content = latest_diary['content']
                summary['latest_diary_preview'] = content[:100] + "..." if len(content) > 100 else content
                summary['last_updated'] = latest_diary['created_at']
                
                # 今日更新されたかチェック
                diary_date = datetime.fromisoformat(latest_diary['created_at']).date()
                if diary_date == today:
                    active_today += 1
            
            student_summaries.append(summary)
        
        return {
            "class_id": class_id,
            "class_name": class_info['class_name'] if class_info else f"クラス{class_id}",
            "total_students": len(students),
            "active_today": active_today,
            "students": student_summaries
        }
    
    def _create_demo_classroom_overview(self, class_id: str) -> dict:
        """デモ用のクラス概要データを生成"""
        emotions = ["wakuwaku", "tanoshii", "omoshiroi", "sukkiri", "moyamoya", "fuan", "muzukashii", "ikizumari"]
        demo_previews = [
            "使う動機の構造が問題だという気づきを語っていました。探究が深まっています。",
            "フィールド調査のアポ取りに成功。本物の声が聞けたと喜んでいました。",
            "問いの言語化で詰まっています。言いたいことはあるのに言葉にならないと。",
            "テーマを食品ロスに絞ったが、問いの型がまだ告発型にとどまっています。",
            "eスポーツの定義調査を進めています。自分の問いとの接続がまだ弱い様子。",
            "今日ようやく問いの形が定まった様子。次のステップが見えてきています。",
            "図書館調査で意外な資料を発見。こんなデータあったんだと興奮気味。",
            "5日間ログが途絶えています。何を調べればいいかわからない状態が続いています。"
        ]
        
        students = []
        for i in range(32):
            students.append({
                "student_id": f"student_{i+1}",
                "student_name": f"生徒{i+1}",
                "student_number": i+1,
                "latest_emotion": emotions[i % len(emotions)],
                "latest_diary_preview": demo_previews[i % len(demo_previews)],
                "last_updated": (datetime.now() - timedelta(hours=i)).isoformat(),
                "total_entries": 10 + i % 5
            })
        
        return {
            "class_id": class_id,
            "class_name": "3年2組 総合探究",
            "total_students": 32,
            "active_today": 29,
            "students": students
        }
    
    async def get_student_detail(self, student_id: str, teacher_id: str, days: int = 30) -> dict:
        """生徒個人の詳細情報を取得"""
        # デモデータを返す
        emotions_history = []
        diary_entries = []
        
        for i in range(days):
            date = datetime.now() - timedelta(days=i)
            emotions_history.append({
                "date": date.isoformat(),
                "emotion": ["wakuwaku", "tanoshii", "moyamoya", "sukkiri"][i % 4],
                "intensity": 0.5 + (i % 5) * 0.1
            })
            
            if i % 3 == 0:  # 3日に1回日誌があると仮定
                diary_entries.append({
                    "date": date.isoformat(),
                    "content": f"探究活動{days-i}日目の記録です。新しい発見がありました。",
                    "emotion": emotions_history[-1]["emotion"]
                })
        
        return {
            "student_id": student_id,
            "student_name": f"生徒 {student_id[-1]}",
            "student_number": int(student_id.split('_')[-1]) if '_' in student_id else 1,
            "emotion_history": emotions_history,
            "diary_entries": diary_entries
        }
    
    async def get_emotions_summary(self, class_id: str, teacher_id: str) -> dict:
        """クラス全体の感情分布を取得"""
        emotion_counts = {
            "wakuwaku": 8,
            "tanoshii": 6,
            "omoshiroi": 4,
            "sukkiri": 3,
            "moyamoya": 5,
            "fuan": 3,
            "muzukashii": 2,
            "ikizumari": 1
        }
        
        return {
            "class_id": class_id,
            "total_responses": sum(emotion_counts.values()),
            "emotion_distribution": emotion_counts,
            "timestamp": datetime.now().isoformat()
        }
    
    def __del__(self):
        if hasattr(self, 'conn'):
            self.conn.close()