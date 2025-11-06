"""
プロジェクト計画思考モジュール
AIエージェントが探究学習プロジェクトに対して最適な計画・方針を思考する
"""

import json
import logging
import sys
import os
from typing import List, Dict, Optional, Any
from datetime import datetime
from .schema import StateSnapshot, ProjectPlan, NextAction, Milestone

# prompt.pyへのパスを追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from prompt.prompt import PLAN_GENERATION_PROMPT

logger = logging.getLogger(__name__)

class ProjectPlanner:
    """プロジェクト計画思考エンジン（グラフベース拡張版）"""

    def __init__(self, llm_client=None, graph_enabled: bool = False):
        """
        ProjectPlannerクラスを初期化
        
        Args:
            llm_client: LLMクライアント（既存のmodule.llm_apiを使用）
            graph_enabled: グラフベースの計画生成機能を使用するか
        """
        self.llm_client = llm_client
        self.graph_enabled = graph_enabled
    
    # <summary>プロジェクト計画を生成します。</summary>
    # <arg name="state">学習者の状態。</arg>
    # <arg name="conversation_history">会話履歴。</arg>
    # <arg name="use_llm">LLMを使用するか。</arg>
    # <returns>生成されたプロジェクト計画。</returns>
    def generate_project_plan(
        self,
        state: StateSnapshot,
        conversation_history: List[Dict[str, str]],
        use_llm: bool = True
    ) -> ProjectPlan:
        
        if use_llm and self.llm_client:
            try:
                return self._generate_with_llm(state, conversation_history)
            except Exception as e:
                logger.warning(f"LLM計画生成エラー、ルールベース処理を使用: {e}")
                return self._generate_rule_based(state)
        else:
            return self._generate_rule_based(state)
    
    # <summary>LLMを使用して計画を生成します。</summary>
    # <arg name="state">学習者の状態。</arg>
    # <arg name="conversation_history">会話履歴。</arg>
    # <returns>生成されたプロジェクト計画。</returns>
    def _generate_with_llm(
        self,
        state: StateSnapshot,
        conversation_history: List[Dict[str, str]]
    ) -> ProjectPlan:
        
        # プロジェクト情報の抽出
        project_context = state.project_context or {}
        theme = project_context.get('theme', '未設定')
        question = project_context.get('question', '未設定')
        hypothesis = project_context.get('hypothesis', '未設定')
        
        # 会話履歴の要約生成
        conversation_summary = self._summarize_conversation(conversation_history)
        
        # プロンプト生成
        prompt = PLAN_GENERATION_PROMPT.format(
            goal=state.goal or theme,
            purpose=state.purpose or question,
            theme=theme,
            question=question,
            hypothesis=hypothesis,
            conversation_summary=conversation_summary
        )
        
        # LLM呼び出し
        messages = [
            {"role": "system", "content": "あなたは探究学習の専門家AIです。"},
            {"role": "user", "content": prompt}
        ]
        
        response = self.llm_client.generate_response(messages)
        
        # JSON解析と検証
        try:
            plan_dict = json.loads(response)
            return self._validate_and_create_plan(plan_dict)
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"LLM計画応答のJSON解析エラー: {e}")
            raise
    
    # <summary>ルールベースで計画を生成します（フォールバック用）。</summary>
    # <arg name="state">学習者の状態。</arg>
    # <returns>生成されたプロジェクト計画。</returns>
    def _generate_rule_based(self, state: StateSnapshot) -> ProjectPlan:
        
        project_context = state.project_context or {}
        theme = project_context.get('theme', '探究プロジェクト')
        question = project_context.get('question', '課題解決')
        goal = state.goal or theme
        
        # デフォルトの北極星
        north_star = f"{theme}の深い理解と実践的解決策の創出"
        
        # デフォルトマイルストーン
        milestones = [
            Milestone(
                title="問いの明確化",
                description="探究する問いを具体的で検証可能な形に洗練する",
                target_date="1-2週間以内",
                success_criteria=["明確な問いの設定", "仮説の立案"],
                order=1
            ),
            Milestone(
                title="調査・研究",
                description="既存研究や情報を収集し、理論的基盤を構築",
                target_date="3-4週間以内",
                success_criteria=["10件以上の信頼できる情報源", "研究レポート作成"],
                order=2
            ),
            Milestone(
                title="実験・検証",
                description="仮説を検証するための実験や調査を実施",
                target_date="5-8週間以内",
                success_criteria=["実験設計の完成", "データ収集の実施"],
                order=3
            ),
            Milestone(
                title="結果分析",
                description="収集データを分析し、結論を導出",
                target_date="9-10週間以内",
                success_criteria=["データ分析完了", "結論の明文化"],
                order=4
            ),
            Milestone(
                title="成果発表",
                description="研究成果をまとめ、他者に向けて発表",
                target_date="11-12週間以内",
                success_criteria=["発表資料完成", "効果的なプレゼンテーション"],
                order=5
            )
        ]
        
        # デフォルトの次の行動
        next_actions = [
            NextAction(
                action="探究する問いを1つの文章で明確に記述する",
                urgency=5,
                importance=5,
                reason="すべての探究活動の基盤となるため",
                expected_outcome="明確で検証可能な問いの設定"
            ),
            NextAction(
                action="関連する既存研究を3-5件調査する",
                urgency=4,
                importance=4,
                reason="先行研究を知ることで質の高い探究になるため",
                expected_outcome="研究の位置づけと独自性の明確化"
            ),
            NextAction(
                action="仮説を立て、検証方法を考える",
                urgency=3,
                importance=5,
                reason="探究の方向性と方法を決めるため",
                expected_outcome="具体的な仮説と検証計画"
            )
        ]
        
        # 緊急度×重要度でソート
        next_actions.sort(key=lambda x: x.urgency * x.importance, reverse=True)
        
        return ProjectPlan(
            north_star=north_star,
            north_star_metric="探究の深さと解決策の実用性を5段階で評価",
            milestones=milestones,
            next_actions=next_actions,
            strategic_approach="段階的で体系的な探究アプローチ",
            risk_factors=["時間不足", "情報不足", "検証方法の不適切さ"],
            created_at=datetime.now().isoformat(),
            confidence=0.6
        )
    
    # <summary>計画データを検証しProjectPlanオブジェクトを作成します。</summary>
    # <arg name="plan_dict">計画データの辞書。</arg>
    # <returns>検証済みのProjectPlanオブジェクト。</returns>
    def _validate_and_create_plan(self, plan_dict: Dict[str, Any]) -> ProjectPlan:
        
        # 必須フィールドの確認
        required_fields = ['north_star', 'north_star_metric', 'milestones', 'next_actions', 'strategic_approach']
        for field in required_fields:
            if field not in plan_dict:
                raise ValueError(f"必須フィールド '{field}' が不足しています")
        
        # マイルストーンの変換
        milestones = []
        for i, milestone_dict in enumerate(plan_dict['milestones']):
            milestone = Milestone(
                title=milestone_dict.get('title', f'マイルストーン{i+1}'),
                description=milestone_dict.get('description', ''),
                target_date=milestone_dict.get('target_date'),
                success_criteria=milestone_dict.get('success_criteria', []),
                order=milestone_dict.get('order', i+1)
            )
            milestones.append(milestone)
        
        # 次の行動の変換とソート
        next_actions = []
        for action_dict in plan_dict['next_actions']:
            action = NextAction(
                action=action_dict.get('action', ''),
                urgency=max(1, min(5, action_dict.get('urgency', 3))),
                importance=max(1, min(5, action_dict.get('importance', 3))),
                reason=action_dict.get('reason', ''),
                expected_outcome=action_dict.get('expected_outcome', '')
            )
            next_actions.append(action)
        
        # 緊急度×重要度でソート
        next_actions.sort(key=lambda x: x.urgency * x.importance, reverse=True)
        
        return ProjectPlan(
            north_star=plan_dict['north_star'],
            north_star_metric=plan_dict['north_star_metric'],
            milestones=milestones,
            next_actions=next_actions[:5],  # 最大5個に制限
            strategic_approach=plan_dict['strategic_approach'],
            risk_factors=plan_dict.get('risk_factors', []),
            created_at=datetime.now().isoformat(),
            confidence=0.8
        )
    
    # <summary>会話履歴を要約します。</summary>
    # <arg name="conversation_history">会話履歴のリスト。</arg>
    # <returns>要約された会話履歴の文字列。</returns>
    def _summarize_conversation(self, conversation_history: List[Dict[str, str]]) -> str:
        
        if not conversation_history:
            return "会話履歴なし"
        
        # 最新5件のメッセージから要約を作成
        recent_messages = conversation_history[-5:]
        summary_lines = []
        
        for msg in recent_messages:
            sender = "生徒" if msg.get('sender') == 'user' else "AI"
            message = msg.get('message', '')[:100]  # 100文字に制限
            summary_lines.append(f"{sender}: {message}")
        
        return "\n".join(summary_lines)
    
    # <summary>フィードバックに基づいて計画を更新します。</summary>
    # <arg name="original_plan">元のプロジェクト計画。</arg>
    # <arg name="feedback">フィードバック文字列。</arg>
    # <arg name="conversation_history">会話履歴。</arg>
    # <returns>更新されたプロジェクト計画。</returns>
    def update_plan_based_on_feedback(
        self,
        original_plan: ProjectPlan,
        feedback: str,
        conversation_history: List[Dict[str, str]]
    ) -> ProjectPlan:
        
        # TODO: Phase 2で実装 - フィードバックに基づく計画の動的更新
        logger.info(f"計画更新要求: {feedback}")
        
        # 現在は元の計画をそのまま返す
        return original_plan
    
    # <summary>計画の質を評価します。</summary>
    # <arg name="plan">評価するプロジェクト計画。</arg>
    # <arg name="state">学習者の状態。</arg>
    # <returns>計画の質スコア（0.0-1.0）。</returns>
    def calculate_plan_score(self, plan: ProjectPlan, state: StateSnapshot) -> float:
        
        score = 0.0
        
        # 北極星の具体性評価
        if plan.north_star and len(plan.north_star) > 10:
            score += 0.2
        
        # マイルストーン数の適切性
        if 3 <= len(plan.milestones) <= 5:
            score += 0.2
        
        # 次の行動の優先順位付け
        if plan.next_actions and all(action.urgency * action.importance >= 6 for action in plan.next_actions[:3]):
            score += 0.2
        
        # 戦略的アプローチの明確性
        if plan.strategic_approach and len(plan.strategic_approach) > 20:
            score += 0.2
        
        # プロジェクト情報との整合性
        if state.project_context:
            theme = state.project_context.get('theme', '')
            if theme and theme.lower() in plan.north_star.lower():
                score += 0.2
        
        return min(1.0, score)
    
    def generate_graph_based_plan(self, 
                                 node: 'Node', 
                                 state: StateSnapshot,
                                 inference_result: Optional[Dict[str, Any]] = None,
                                 predictions: Optional[List[Dict[str, Any]]] = None) -> ProjectPlan:
        """グラフベースのプロジェクト計画を生成"""
        
        if not self.graph_enabled:
            return self._generate_rule_based(state)
        
        # グラフの現在位置から計画を生成
        from ontology.ontology_graph import NodeType
        
        # 推論結果に基づく北極星の設定
        if inference_result and inference_result.get('inference_source'):
            source = inference_result['inference_source']
            if 'pattern:' in source:
                north_star = "学習パターンに基づく最適化された探究プロセス"
            elif 'adaptive_rule:' in source:
                north_star = "個人適応型の探究学習"
            elif 'structural_gap:' in source:
                north_star = "構造的学習の完成と統合"
            else:
                north_star = "グラフ駆動の探究プロセス"
        else:
            north_star = "深化と循環的な学び"
        
        # 予測に基づくマイルストーン生成
        milestones = []
        if predictions:
            for i, pred in enumerate(predictions[:5]):
                node_type = pred.get('node_type', NodeType.QUESTION)
                confidence = pred.get('confidence', 0.5)
                
                title = self._get_milestone_title(node_type)
                description = self._get_milestone_description(node_type, confidence)
                target_date = f"{(i+1)*2}-{(i+2)*2}週間後"
                criteria = self._get_success_criteria(node_type)
                
                milestones.append(Milestone(
                    title=title,
                    description=description,
                    target_date=target_date,
                    success_criteria=criteria,
                    order=i+1
                ))
        else:
            # デフォルトのグラフベースマイルストーン
            milestones = self._generate_default_graph_milestones(node)
        
        # 次のアクション生成
        next_actions = self._generate_graph_based_actions(node, inference_result)
        
        # 戦略的アプローチの決定
        strategic_approach = self._determine_strategic_approach(node, inference_result)
        
        # リスク要因の分析
        risk_factors = self._analyze_graph_risks(node, inference_result)
        
        return ProjectPlan(
            north_star=north_star,
            north_star_metric="グラフのサイクル完成数と学習深度",
            milestones=milestones,
            next_actions=next_actions,
            strategic_approach=strategic_approach,
            risk_factors=risk_factors,
            created_at=datetime.now().isoformat(),
            confidence=inference_result.get('confidence', 0.7) if inference_result else 0.7
        )
    
    def generate_adaptive_plan(self, 
                              node: 'Node', 
                              state: StateSnapshot, 
                              inference_result: Dict[str, Any]) -> ProjectPlan:
        """適応的プロジェクト計画生成（高度推論結果に基づく）"""
        
        # 推論結果から計画を生成
        predictions = inference_result.get('predictions', [])
        inference_source = inference_result.get('inference_source', '')
        
        # 北極星の設定（推論ソースに応じて調整）
        if 'pattern:' in inference_source:
            north_star = "学習パターンに基づく最適化された探究プロセス"
            north_star_metric = "パターン適合度と学習効率"
        elif 'adaptive_rule:' in inference_source:
            north_star = "個人適応型の探究学習"
            north_star_metric = "個人学習スタイル適合度"
        else:
            north_star = "統合的な探究学習"
            north_star_metric = "探究プロセス完成度"
        
        # 予測に基づく適応的マイルストーン
        milestones = []
        for i, pred in enumerate(predictions[:4]):
            milestone = self._create_adaptive_milestone(pred, i+1, inference_source)
            milestones.append(milestone)
        
        # 適応的次の行動
        next_actions = self._generate_adaptive_actions(inference_result, predictions)
        
        # 戦略的アプローチ（推論に基づく）
        strategic_approach = self._generate_adaptive_strategy(inference_source, predictions)
        
        # 適応的リスク分析
        risk_factors = self._analyze_adaptive_risks(inference_result)
        
        return ProjectPlan(
            north_star=north_star,
            north_star_metric=north_star_metric,
            milestones=milestones,
            next_actions=next_actions,
            strategic_approach=strategic_approach,
            risk_factors=risk_factors,
            created_at=datetime.now().isoformat(),
            confidence=inference_result.get('confidence', 0.8)
        )
    
    def _get_milestone_title(self, node_type: 'NodeType') -> str:
        """ノードタイプからマイルストーンタイトルを取得"""
        
        from ontology.ontology_graph import NodeType
        
        mapping = {
            NodeType.GOAL: "目標設定の完成",
            NodeType.QUESTION: "問いの明確化",
            NodeType.HYPOTHESIS: "仮説形成",
            NodeType.METHOD: "方法論の確立",
            NodeType.DATA: "データ収集",
            NodeType.INSIGHT: "洞察の獲得",
            NodeType.REFLECTION: "統合的振り返り",
            NodeType.TOPIC: "テーマの深化",
            NodeType.WILL: "学習意欲の強化",
            NodeType.NEED: "必要性の明確化",
            NodeType.CHALLENGE: "課題の克服"
        }
        
        return mapping.get(node_type, f"{node_type.value}の達成")
    
    def _get_milestone_description(self, node_type: 'NodeType', confidence: float) -> str:
        """ノードタイプと信頼度からマイルストーン説明を生成"""
        
        from ontology.ontology_graph import NodeType
        
        base_descriptions = {
            NodeType.GOAL: "探究の目標を具体的で測定可能な形で設定する",
            NodeType.QUESTION: "探究すべき問いを明確で検証可能な形に洗練する",
            NodeType.HYPOTHESIS: "検証可能な仮説を論理的に構築する",
            NodeType.METHOD: "仮説検証のための適切な方法論を選択・設計する",
            NodeType.DATA: "必要なデータを体系的に収集・整理する",
            NodeType.INSIGHT: "収集した情報から新たな洞察を導出する",
            NodeType.REFLECTION: "学習プロセス全体を振り返り統合する"
        }
        
        base_desc = base_descriptions.get(node_type, f"{node_type.value}を効果的に推進する")
        
        # 信頼度に基づく調整
        if confidence > 0.8:
            return f"{base_desc}（高い確信度での推進）"
        elif confidence > 0.6:
            return f"{base_desc}（段階的な推進）"
        else:
            return f"{base_desc}（探索的な推進）"
    
    def _get_success_criteria(self, node_type: 'NodeType') -> List[str]:
        """ノードタイプから成功基準を生成"""
        
        from ontology.ontology_graph import NodeType
        
        criteria_mapping = {
            NodeType.GOAL: ["SMART形式での目標記述", "測定可能な成果指標"],
            NodeType.QUESTION: ["明確で焦点の絞られた問い", "検証可能性の確認"],
            NodeType.HYPOTHESIS: ["論理的な仮説の構築", "検証方法の明確化"],
            NodeType.METHOD: ["適切な方法論の選択", "実行計画の作成"],
            NodeType.DATA: ["必要データの特定", "データ収集の完了"],
            NodeType.INSIGHT: ["新たな発見の記録", "理論との関連付け"],
            NodeType.REFLECTION: ["学習プロセスの振り返り", "次回への改善点整理"]
        }
        
        return criteria_mapping.get(node_type, [f"{node_type.value}の明確な進展"])
    
    def _generate_default_graph_milestones(self, node: 'Node') -> List[Milestone]:
        """デフォルトのグラフベースマイルストーンを生成"""
        
        from ontology.ontology_graph import NodeType
        
        # 現在のノードタイプに基づく次の段階を予測
        current_type = node.type
        
        # 学習サイクルに基づく次の段階
        next_types = self._get_next_node_types(current_type)
        
        milestones = []
        for i, next_type in enumerate(next_types[:4]):
            title = self._get_milestone_title(next_type)
            description = self._get_milestone_description(next_type, 0.7)
            target_date = f"{(i+1)*2}週間後"
            criteria = self._get_success_criteria(next_type)
            
            milestones.append(Milestone(
                title=title,
                description=description,
                target_date=target_date,
                success_criteria=criteria,
                order=i+1
            ))
        
        return milestones
    
    def _get_next_node_types(self, current_type: 'NodeType') -> List['NodeType']:
        """現在のノードタイプから次の段階を予測"""
        
        from ontology.ontology_graph import NodeType
        
        # 探究学習のサイクルに基づく次の段階
        cycle_mapping = {
            NodeType.TOPIC: [NodeType.QUESTION, NodeType.GOAL, NodeType.HYPOTHESIS],
            NodeType.GOAL: [NodeType.QUESTION, NodeType.METHOD, NodeType.HYPOTHESIS],
            NodeType.QUESTION: [NodeType.HYPOTHESIS, NodeType.METHOD, NodeType.DATA],
            NodeType.HYPOTHESIS: [NodeType.METHOD, NodeType.DATA, NodeType.INSIGHT],
            NodeType.METHOD: [NodeType.DATA, NodeType.INSIGHT, NodeType.REFLECTION],
            NodeType.DATA: [NodeType.INSIGHT, NodeType.REFLECTION, NodeType.HYPOTHESIS],
            NodeType.INSIGHT: [NodeType.REFLECTION, NodeType.HYPOTHESIS, NodeType.QUESTION],
            NodeType.REFLECTION: [NodeType.QUESTION, NodeType.HYPOTHESIS, NodeType.GOAL]
        }
        
        return cycle_mapping.get(current_type, [NodeType.QUESTION, NodeType.HYPOTHESIS, NodeType.METHOD])
    
    def _generate_graph_based_actions(self, node: 'Node', inference_result: Optional[Dict[str, Any]]) -> List[NextAction]:
        """グラフに基づく次のアクションを生成"""
        
        actions = []
        
        # 推論結果からアクションを導出
        if inference_result:
            support_type = inference_result.get('support_type')
            actions.extend(self._get_actions_for_support_type(support_type, node))
        
        # ノードタイプに基づくデフォルトアクション
        actions.extend(self._get_default_actions_for_node(node))
        
        # 優先度でソート
        actions.sort(key=lambda x: x.urgency * x.importance, reverse=True)
        
        return actions[:5]  # 最大5個
    
    def _get_actions_for_support_type(self, support_type: str, node: 'Node') -> List[NextAction]:
        """支援タイプに基づくアクションを生成"""
        
        actions = []
        
        if support_type == "UNDERSTANDING":
            actions.append(NextAction(
                action="現在の理解状況を整理し、不明点を明確にする",
                urgency=5,
                importance=5,
                reason="理解が曖昧な状態では効果的な学習が困難",
                expected_outcome="明確な理解と疑問点の特定"
            ))
        
        elif support_type == "PATHFINDING":
            actions.append(NextAction(
                action="次のステップの具体的な道筋を計画する",
                urgency=4,
                importance=4,
                reason="方向性が見えない状況を解決する必要",
                expected_outcome="明確な行動計画の作成"
            ))
        
        elif support_type == "REFRAMING":
            actions.append(NextAction(
                action="現在の問題を新しい視点から捉え直す",
                urgency=3,
                importance=5,
                reason="視点の転換により新たな解決策が見つかる可能性",
                expected_outcome="新しい視点と解決のヒント"
            ))
        
        return actions
    
    def _get_default_actions_for_node(self, node: 'Node') -> List[NextAction]:
        """ノードタイプに基づくデフォルトアクションを生成"""
        
        from ontology.ontology_graph import NodeType
        
        actions = []
        
        if node.type == NodeType.QUESTION:
            actions.append(NextAction(
                action="問いをより具体的で検証可能な形に洗練する",
                urgency=4,
                importance=5,
                reason="明確な問いが探究の方向性を決定",
                expected_outcome="焦点の絞られた研究問題"
            ))
        
        elif node.type == NodeType.HYPOTHESIS:
            actions.append(NextAction(
                action="仮説を検証するための方法を設計する",
                urgency=4,
                importance=4,
                reason="仮説は検証されてこそ価値がある",
                expected_outcome="具体的な検証計画"
            ))
        
        return actions
    
    def _determine_strategic_approach(self, node: 'Node', inference_result: Optional[Dict[str, Any]]) -> str:
        """戦略的アプローチを決定"""
        
        if inference_result and 'pattern:' in inference_result.get('inference_source', ''):
            return "学習パターンに基づく個別最適化アプローチ"
        elif inference_result and 'structural_gap:' in inference_result.get('inference_source', ''):
            return "構造的欠損の補完を重視したアプローチ"
        elif node.depth > 0.7:
            return "深掘り型の専門特化アプローチ"
        elif node.clarity < 0.5:
            return "明確化を重視した段階的アプローチ"
        else:
            return "バランス型の総合的アプローチ"
    
    def _analyze_graph_risks(self, node: 'Node', inference_result: Optional[Dict[str, Any]]) -> List[str]:
        """グラフベースのリスク分析"""
        
        risks = []
        
        # ノード属性に基づくリスク
        if node.clarity < 0.3:
            risks.append("目標や方向性の不明確さ")
        
        if node.depth < 0.2:
            risks.append("表面的な理解に留まるリスク")
        
        if node.alignment_goal < 0.5:
            risks.append("目標との不整合")
        
        # 推論結果に基づくリスク
        if inference_result:
            confidence = inference_result.get('confidence', 0.5)
            if confidence < 0.5:
                risks.append("推論の不確実性が高い")
        
        # デフォルトリスク
        if not risks:
            risks = ["学習の停滞", "モチベーションの低下"]
        
        return risks
    
    def _create_adaptive_milestone(self, prediction: Dict[str, Any], order: int, inference_source: str) -> Milestone:
        """適応的マイルストーンを作成"""
        
        node_type = prediction.get('node_type')
        confidence = prediction.get('confidence', 0.5)
        
        title = self._get_milestone_title(node_type)
        description = f"{self._get_milestone_description(node_type, confidence)}（{inference_source}に基づく）"
        target_date = f"{order*2}-{(order+1)*2}週間後"
        criteria = self._get_success_criteria(node_type)
        
        return Milestone(
            title=title,
            description=description,
            target_date=target_date,
            success_criteria=criteria,
            order=order
        )
    
    def _generate_adaptive_actions(self, inference_result: Dict[str, Any], predictions: List[Dict[str, Any]]) -> List[NextAction]:
        """適応的次のアクションを生成"""
        
        actions = []
        
        # 推論結果に基づく最優先アクション
        support_type = inference_result.get('support_type')
        if support_type:
            actions.extend(self._get_actions_for_support_type(support_type, None))
        
        # 予測に基づくアクション
        for pred in predictions[:2]:
            node_type = pred.get('node_type')
            if node_type:
                action_text = f"{self._get_milestone_title(node_type)}に向けた準備を開始する"
                actions.append(NextAction(
                    action=action_text,
                    urgency=3,
                    importance=4,
                    reason="予測される次の段階への準備",
                    expected_outcome=f"{node_type.value}への円滑な移行"
                ))
        
        return actions
    
    def _generate_adaptive_strategy(self, inference_source: str, predictions: List[Dict[str, Any]]) -> str:
        """適応的戦略を生成"""
        
        if 'pattern:' in inference_source:
            return f"学習パターン「{inference_source.split(':')[1]}」に最適化された個別学習戦略"
        elif 'adaptive_rule:' in inference_source:
            return "個人の学習スタイルに適応した柔軟な探究戦略"
        elif predictions:
            return f"予測される{len(predictions)}段階の学習サイクルに基づく計画的戦略"
        else:
            return "データ駆動型の適応学習戦略"
    
    def _analyze_adaptive_risks(self, inference_result: Dict[str, Any]) -> List[str]:
        """適応的リスク分析"""
        
        risks = []
        
        confidence = inference_result.get('confidence', 0.5)
        if confidence < 0.6:
            risks.append("推論の不確実性による計画の不安定性")
        
        inference_source = inference_result.get('inference_source', '')
        if 'pattern:' in inference_source:
            risks.append("パターンへの過度の依存")
        
        if not inference_result.get('predictions'):
            risks.append("将来予測の不足による短期視点")
        
        return risks or ["一般的な学習リスク"]