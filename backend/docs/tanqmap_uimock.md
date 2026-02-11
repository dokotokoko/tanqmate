import { useState, useRef, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const CATS = {
  search: { label: "調べる", icon: "🔍", bg: "#E8F6F5", color: "#0D7377" },
  think:  { label: "考える", icon: "💭", bg: "#FFF9E6", color: "#8B6914" },
  listen: { label: "聞く",   icon: "🎤", bg: "#F3EEFF", color: "#5B21B6" },
  create: { label: "作る",   icon: "📝", bg: "#FDF2F8", color: "#9D174D" },
  data:   { label: "データ", icon: "📊", bg: "#ECFDF5", color: "#047857" },
};

const NS = {
  current: { w: 130, h: 88 },
  goal:    { w: 125, h: 125 },
  action:  { w: 215, h: 90 },
  future:  { w: 185, h: 64 },
};

let _uid = 100;
const uid = () => `n${_uid++}`;

/* ═══════════════════════════════════════════════════════════════
   EDGE GEOMETRY
   ═══════════════════════════════════════════════════════════════ */

function nRight(n) { const s = NS[n.type]; return [n.x + s.w, n.y + s.h / 2]; }
function nLeft(n)  { const s = NS[n.type]; return [n.x, n.y + s.h / 2]; }

function bezierPath(fN, tN) {
  const [sx, sy] = nRight(fN);
  const [ex, ey] = nLeft(tN);
  const dx = ex - sx;
  const cp = Math.max(55, Math.abs(dx) * 0.42);
  return `M${sx},${sy} C${sx + cp},${sy} ${ex - cp},${ey} ${ex},${ey}`;
}

/* ═══════════════════════════════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════════════════════════════ */

function initData(goalText, curText) {
  return {
    nodes: [
      { id: "cur", type: "current", title: "現在地", desc: curText, x: 55, y: 240 },
      { id: "goal", type: "goal", title: "ゴール", desc: goalText, x: 870, y: 222 },
      { id: "a1", type: "action", title: "先行研究を調べる", desc: "テーマに関連する論文やレポートを探して読んでみよう", category: "search", status: "default", x: 290, y: 45 },
      { id: "a2", type: "action", title: "詳しい人に話を聞く", desc: "先生や地域の専門家にインタビューしてみよう", category: "listen", status: "default", x: 290, y: 210 },
      { id: "a3", type: "action", title: "データを集めて分析する", desc: "アンケートや統計データを集めて傾向を探ろう", category: "search", status: "recommended", x: 290, y: 375 },
      { id: "f1", type: "future", title: "先行研究の要点を整理する", x: 610, y: 55 },
      { id: "f2", type: "future", title: "インタビュー結果をまとめる", x: 610, y: 225 },
      { id: "f3", type: "future", title: "分析結果を図表にする", x: 610, y: 385 },
    ],
    edges: [
      { id: "e1", from: "cur", to: "a1", type: "solid" },
      { id: "e2", from: "cur", to: "a2", type: "solid" },
      { id: "e3", from: "cur", to: "a3", type: "solid" },
      { id: "e4", from: "a1", to: "f1", type: "dashed" },
      { id: "e5", from: "a2", to: "f2", type: "dashed" },
      { id: "e6", from: "a3", to: "f3", type: "dashed" },
      { id: "e7", from: "f1", to: "goal", type: "dashed" },
      { id: "e8", from: "f2", to: "goal", type: "dashed" },
      { id: "e9", from: "f3", to: "goal", type: "dashed" },
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════
   INPUT SCREEN
   ═══════════════════════════════════════════════════════════════ */

function InputScreen({ goal, setGoal, cur, setCur, onGenerate }) {
  const ok = goal.trim() && cur.trim();
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "100vw", height: "100vh",
      background: "linear-gradient(155deg, #F0F7F4 0%, #EDF2F7 40%, #FDF6EE 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -120, right: -80, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,140,90,0.08) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)" }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12 }}>
        <defs><pattern id="idots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="0.7" fill="#8BA4A8" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#idots)" />
      </svg>

      <div style={{
        position: "relative", width: 460, padding: "44px 40px",
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
        borderRadius: 24, border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1A1A2E", fontFamily: "var(--font-jp)", letterSpacing: "0.02em" }}>
            クエストを設定
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#8A8A9A" }}>
            ゴールと現状を入力して、探究マップを生成しよう
          </p>
        </div>

        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 6 }}>
          🏆 ゴール（何を達成したい？）
        </label>
        <textarea value={goal} onChange={e => setGoal(e.target.value)}
          placeholder="例: 地元の環境問題について提案書を作成する"
          style={{
            width: "100%", height: 72, padding: "12px 14px", borderRadius: 12,
            border: "1.5px solid #E4E4E8", background: "#FAFAFA", fontSize: 14,
            fontFamily: "var(--font-jp)", resize: "none", outline: "none",
            transition: "border-color 0.2s", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = "#FF8C5A"}
          onBlur={e => e.target.style.borderColor = "#E4E4E8"}
        />

        <div style={{ height: 16 }} />

        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 6 }}>
          📍 現状（今どんな状況？）
        </label>
        <textarea value={cur} onChange={e => setCur(e.target.value)}
          placeholder="例: テーマに興味はあるが、何から始めたらいいかわからない"
          style={{
            width: "100%", height: 72, padding: "12px 14px", borderRadius: 12,
            border: "1.5px solid #E4E4E8", background: "#FAFAFA", fontSize: 14,
            fontFamily: "var(--font-jp)", resize: "none", outline: "none",
            transition: "border-color 0.2s", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = "#34D399"}
          onBlur={e => e.target.style.borderColor = "#E4E4E8"}
        />

        <button disabled={!ok} onClick={onGenerate} style={{
          width: "100%", marginTop: 24, padding: "14px 0", borderRadius: 14, border: "none",
          background: ok ? "linear-gradient(135deg, #FF8C5A, #F97316)" : "#E0E0E0",
          color: ok ? "#FFF" : "#999", fontSize: 15, fontWeight: 700, cursor: ok ? "pointer" : "default",
          fontFamily: "var(--font-jp)",
          boxShadow: ok ? "0 4px 16px rgba(249,115,22,0.3)" : "none",
          transition: "all 0.3s",
        }}>
          選択肢を生成する ✨
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOADING SCREEN
   ═══════════════════════════════════════════════════════════════ */

function LoadingScreen() {
  const [dots, setDots] = useState(0);
  useEffect(() => { const t = setInterval(() => setDots(d => (d + 1) % 4), 500); return () => clearInterval(t); }, []);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      width: "100vw", height: "100vh",
      background: "linear-gradient(155deg, #F0F7F4 0%, #EDF2F7 40%, #FDF6EE 100%)",
    }}>
      <div style={{ position: "relative", width: 80, height: 80, marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          border: "3px solid #F0F0F0", borderTopColor: "#FF8C5A",
          animation: "qm-spin 1s linear infinite",
        }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🗺️</div>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A2E", fontFamily: "var(--font-jp)" }}>
        マップを生成中{".".repeat(dots)}
      </div>
      <div style={{ fontSize: 13, color: "#8A8A9A", marginTop: 8, fontFamily: "var(--font-jp)" }}>
        AIが最適な選択肢を考えています
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUBMENU OVERLAY
   ═══════════════════════════════════════════════════════════════ */

function SubMenu({ node, onAction }) {
  const s = NS[node.type];
  const items = [
    { key: "ai",        icon: "💬", label: "AIに相談・質問" },
    { key: "breakdown", icon: "🔍", label: "細分化" },
    { key: "expand",    icon: "🌐", label: "拡散" },
    { key: "complete",  icon: "✅", label: "完了する" },
  ];
  return (
    <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
      style={{
        position: "absolute",
        left: node.x + s.w + 12,
        top: node.y + s.h / 2 - 76,
        width: 192, background: "#FFF", borderRadius: 14,
        boxShadow: "0 6px 28px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.06)",
        padding: "6px 0", zIndex: 200, border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {items.map((it, i) => (
        <button key={it.key} className="qm-menu-item"
          onClick={() => onAction(it.key)}
          onMouseDown={e => e.stopPropagation()}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "11px 16px", background: "none", border: "none",
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            color: it.key === "complete" ? "#059669" : "#444",
            fontFamily: "var(--font-jp)", textAlign: "left",
            borderTop: i > 0 ? "1px solid #F5F5F5" : "none",
          }}
        >
          <span style={{ fontSize: 15, width: 22, textAlign: "center" }}>{it.icon}</span>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPLETE MODAL
   ═══════════════════════════════════════════════════════════════ */

function CompleteModal({ node, onComplete, onClose }) {
  const [fb, setFb] = useState("");
  const [aiMsg, setAiMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const doReflect = () => {
    setLoading(true);
    setTimeout(() => {
      setAiMsg("すごい！一歩前に進めたね 🎉 この経験をもとに、次のアクションでさらに深掘りしていこう！");
      setLoading(false);
    }, 1200);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 440, background: "#FFF", borderRadius: 22, padding: "36px 32px",
        boxShadow: "0 16px 60px rgba(0,0,0,0.12)", animation: "qm-fadeUp 0.25s ease-out",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1A1A2E", fontFamily: "var(--font-jp)" }}>
            やってみてどうだった？
          </h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#8A8A9A" }}>
            「{node.title}」を完了します
          </p>
        </div>

        <textarea value={fb} onChange={e => setFb(e.target.value)}
          placeholder="感想や気づき、新しい発見を書いてみよう..."
          style={{
            width: "100%", height: 90, padding: "12px 14px", borderRadius: 12,
            border: "1.5px solid #E4E4E8", background: "#FAFAFA", fontSize: 14,
            fontFamily: "var(--font-jp)", resize: "none", outline: "none", boxSizing: "border-box",
          }}
        />

        {aiMsg && (
          <div style={{
            marginTop: 14, padding: "12px 16px", borderRadius: 12,
            background: "linear-gradient(135deg, #FFF7ED, #FEF3E2)",
            border: "1px solid #FDDCB0", fontSize: 13, color: "#92400E",
            lineHeight: 1.6, fontFamily: "var(--font-jp)",
          }}>
            <span style={{ fontWeight: 700 }}>🤖 AIより：</span><br />{aiMsg}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "1.5px solid #E4E4E8",
            background: "#FFF", color: "#666", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font-jp)",
          }}>キャンセル</button>
          <button onClick={aiMsg ? () => onComplete(fb) : doReflect} disabled={loading} style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
            background: loading ? "#CCC" : "linear-gradient(135deg, #34D399, #059669)",
            color: "#FFF", fontSize: 14, fontWeight: 700,
            cursor: loading ? "default" : "pointer", fontFamily: "var(--font-jp)",
            boxShadow: loading ? "none" : "0 3px 12px rgba(5,150,105,0.25)",
          }}>
            {loading ? "処理中..." : aiMsg ? "完了する 🎉" : "振り返りを送信"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AI CHAT PANEL
   ═══════════════════════════════════════════════════════════════ */

function AIChatPanel({ node, onClose }) {
  const [msgs, setMsgs] = useState([
    { role: "ai", text: `「${node.title}」について質問があれば聞いてね！どんなことでも相談に乗るよ 😊` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = () => {
    if (!input.trim() || loading) return;
    setMsgs(prev => [...prev, { role: "user", text: input.trim() }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const cat = CATS[node.category];
      const replies = [
        `いい質問だね！「${node.title}」を進めるには、まず小さく始めることがポイントだよ。具体的にどこが気になっている？`,
        `なるほど。${cat?.label || "その"}方法はいくつかあるよ。一番取り組みやすいのは、まず身近な情報から集めてみること。`,
        `その視点はとても面白い！探究学習では「自分ならでは」の切り口が大事。もう少し掘り下げてみよう 💡`,
      ];
      setMsgs(prev => [...prev, { role: "ai", text: replies[Math.floor(Math.random() * replies.length)] }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(3px)",
      display: "flex", justifyContent: "flex-end", zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 380, height: "100%", background: "#FFF",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column",
        animation: "qm-slideLeft 0.3s ease-out",
      }}>
        <div style={{
          padding: "20px 22px", borderBottom: "1px solid #F0F0F0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E", fontFamily: "var(--font-jp)" }}>💬 AIに相談</div>
            <div style={{ fontSize: 11, color: "#8A8A9A", marginTop: 2 }}>{node.title}</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none", background: "#F5F5F5",
            fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: "16px 18px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%", padding: "10px 14px", borderRadius: 14,
              background: m.role === "user" ? "linear-gradient(135deg, #FF8C5A, #F97316)" : "#F5F5F5",
              color: m.role === "user" ? "#FFF" : "#333",
              fontSize: 13, lineHeight: 1.6, fontFamily: "var(--font-jp)",
              borderBottomRightRadius: m.role === "user" ? 4 : 14,
              borderBottomLeftRadius: m.role === "ai" ? 4 : 14,
            }}>{m.text}</div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: 14, background: "#F5F5F5", fontSize: 13, color: "#999" }}>
              考え中...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "14px 18px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="質問を入力..."
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 12,
              border: "1.5px solid #E4E4E8", fontSize: 13,
              fontFamily: "var(--font-jp)", outline: "none",
            }}
          />
          <button onClick={send} style={{
            padding: "10px 18px", borderRadius: 12, border: "none",
            background: "#FF8C5A", color: "#FFF", fontWeight: 700,
            fontSize: 13, cursor: "pointer",
          }}>送信</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN QUEST MAP COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function QuestMap() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Outfit:wght@300;500;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch(e) {} };
  }, []);

  const [screen, setScreen] = useState("input");
  const [goal, setGoal] = useState("地元の商店街を活性化するアイデアを提案する");
  const [cur, setCur] = useState("商店街に興味はあるが、何から始めたらいいかわからない");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [sel, setSel] = useState(null);
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const [panning, setPanning] = useState(false);
  const [hovered, setHovered] = useState(null);

  const containerRef = useRef(null);
  const dragOff = useRef({ x: 0, y: 0 });
  const panSt = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  /* ── Generate map ── */
  const handleGenerate = () => {
    setScreen("loading");
    setTimeout(() => {
      const d = initData(goal, cur);
      setNodes(d.nodes); setEdges(d.edges); setScreen("map");
    }, 2500);
  };

  const closeAll = () => { setSel(null); setMenu(false); setModal(null); };

  /* ── Node selection ── */
  const handleSelect = (id) => {
    const n = nodes.find(nd => nd.id === id);
    if (n?.type === "action" && n.status !== "completed") {
      setSel(id); setMenu(true);
    }
  };

  /* ── SubMenu dispatch ── */
  const handleAction = (action) => {
    setMenu(false);
    if (action === "complete") setModal("complete");
    else if (action === "ai") setModal("ai");
    else if (action === "breakdown") doBreakdown();
    else if (action === "expand") doExpand();
  };

  /* ── Complete ── */
  const handleComplete = () => {
    setNodes(prev => prev.map(n => n.id === sel ? { ...n, status: "completed" } : n));
    setModal(null); setSel(null);
  };

  /* ── Breakdown: sub-steps BEFORE the node ── */
  const doBreakdown = () => {
    const t = nodes.find(n => n.id === sel);
    if (!t) return;
    const cat = t.category || "search";
    const bdMap = {
      search: [["調べる範囲を絞る","search"], ["キーワードで情報収集","search"]],
      listen: [["質問リストを作る","create"], ["インタビュー先を探す","search"]],
      think:  [["仮説を書き出す","think"], ["根拠を整理する","think"]],
      create: [["アウトラインを作る","create"], ["素材を集める","search"]],
      data:   [["データソースを特定","search"], ["収集方法を決める","think"]],
    };
    const titles = bdMap[cat] || bdMap.search;
    const s1 = uid(), s2 = uid();
    setNodes(prev => [...prev,
      { id: s1, type: "action", title: titles[0][0], desc: "細分化されたステップ", category: titles[0][1], status: "default", x: t.x - 195, y: t.y - 25 },
      { id: s2, type: "action", title: titles[1][0], desc: "細分化されたステップ", category: titles[1][1], status: "default", x: t.x - 195, y: t.y + 65 },
    ]);
    setEdges(prev => {
      const kept = prev.filter(e => !(e.from === "cur" && e.to === sel));
      return [...kept,
        { id: uid(), from: "cur", to: s1, type: "solid" },
        { id: uid(), from: s1, to: s2, type: "solid" },
        { id: uid(), from: s2, to: sel, type: "solid" },
      ];
    });
    setSel(null);
  };

  /* ── Expand: add alternative at same layer ── */
  const doExpand = () => {
    const t = nodes.find(n => n.id === sel);
    if (!t) return;
    const maxAY = Math.max(...nodes.filter(n => n.type === "action").map(n => n.y));
    const maxFY = Math.max(...nodes.filter(n => n.type === "future").map(n => n.y));
    const opts = [
      { t: "SNSの口コミを分析する", c: "data", f: "口コミのトレンドを可視化" },
      { t: "アンケートを実施する", c: "create", f: "アンケート結果を集計する" },
      { t: "現地でフィールドワーク", c: "search", f: "観察記録をまとめる" },
      { t: "統計オープンデータを探す", c: "data", f: "データの傾向をグラフ化" },
    ];
    const opt = opts[Math.floor(Math.random() * opts.length)];
    const nid = uid(), fid = uid();
    setNodes(prev => [...prev,
      { id: nid, type: "action", title: opt.t, desc: "拡散で追加された選択肢", category: opt.c, status: "default", x: t.x, y: maxAY + 130 },
      { id: fid, type: "future", title: opt.f, x: 610, y: maxFY + 130 },
    ]);
    setEdges(prev => [...prev,
      { id: uid(), from: "cur", to: nid, type: "solid" },
      { id: uid(), from: nid, to: fid, type: "dashed" },
      { id: uid(), from: fid, to: "goal", type: "dashed" },
    ]);
    setSel(null);
  };

  /* ── Drag & Drop ── */
  const startDrag = useCallback((id, e) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const mapX = (e.clientX - rect.left - pan.x) / zoom;
    const mapY = (e.clientY - rect.top - pan.y) / zoom;
    const n = nodes.find(nd => nd.id === id);
    dragOff.current = { x: mapX - n.x, y: mapY - n.y };
    setDrag(id); setMenu(false);
  }, [nodes, zoom, pan]);

  const onMM = useCallback((e) => {
    if (drag) {
      const rect = containerRef.current.getBoundingClientRect();
      const mx = (e.clientX - rect.left - pan.x) / zoom;
      const my = (e.clientY - rect.top - pan.y) / zoom;
      setNodes(prev => prev.map(n => n.id === drag ? { ...n, x: mx - dragOff.current.x, y: my - dragOff.current.y } : n));
    } else if (panning) {
      setPan({ x: panSt.current.px + (e.clientX - panSt.current.mx), y: panSt.current.py + (e.clientY - panSt.current.my) });
    }
  }, [drag, panning, zoom, pan]);

  const onMU = useCallback(() => { setDrag(null); setPanning(false); }, []);

  const onBgDown = useCallback((e) => {
    const t = e.target;
    const isBg = t.tagName === "svg" || t.tagName === "rect" || t.tagName === "circle" ||
      (typeof t.className === "string" && t.className.includes("map-bg"));
    if (isBg) {
      closeAll();
      setPanning(true);
      panSt.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  }, [pan]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.35, Math.min(2.2, z + (e.deltaY > 0 ? -0.07 : 0.07))));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el && screen === "map") el.addEventListener("wheel", onWheel, { passive: false });
    return () => { if (el) el.removeEventListener("wheel", onWheel); };
  }, [onWheel, screen]);

  const selNode = nodes.find(n => n.id === sel);

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */

  if (screen === "input") return (
    <div className="qm-root"><style>{CSS}</style>
      <InputScreen goal={goal} setGoal={setGoal} cur={cur} setCur={setCur} onGenerate={handleGenerate} />
    </div>
  );

  if (screen === "loading") return (
    <div className="qm-root"><style>{CSS}</style><LoadingScreen /></div>
  );

  /* ── MAP SCREEN ── */
  const actions = nodes.filter(n => n.type === "action");
  const done = actions.filter(n => n.status === "completed").length;

  return (
    <div className="qm-root"><style>{CSS}</style>

      <div ref={containerRef} className="map-bg"
        style={{
          position: "relative", width: "100vw", height: "100vh", overflow: "hidden",
          background: "linear-gradient(155deg, #F2F5F0 0%, #EEF1F5 40%, #F8F4EE 100%)",
          cursor: panning ? "grabbing" : "default",
        }}
        onMouseDown={onBgDown} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
      >
        {/* Dot grid */}
        <svg className="map-bg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.12 }}>
          <defs><pattern id="md" x="0" y="0" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="0.8" fill="#8BA4A8" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#md)" />
        </svg>

        {/* ═══ TRANSFORM LAYER ═══ */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}>
          {/* SVG Edges */}
          <svg width="4000" height="3000" style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
            <defs>
              <marker id="as" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
                <path d="M0,1.5 L10,5 L0,8.5" fill="#FF8C5A" opacity="0.85" />
              </marker>
              <marker id="ad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M0,2 L10,5 L0,8" fill="#9A928A" opacity="0.6" />
              </marker>
            </defs>
            {edges.map(e => {
              const fN = nodes.find(n => n.id === e.from);
              const tN = nodes.find(n => n.id === e.to);
              if (!fN || !tN) return null;
              const solid = e.type === "solid";
              return (
                <path key={e.id} d={bezierPath(fN, tN)} fill="none"
                  stroke={solid ? "#FF8C5A" : "#9A928A"}
                  strokeWidth={solid ? 2.5 : 2}
                  strokeDasharray={solid ? "none" : "6 4"}
                  strokeLinecap="round"
                  markerEnd={solid ? "url(#as)" : "url(#ad)"}
                  opacity={solid ? 0.85 : 0.5}
                />
              );
            })}
          </svg>

          {/* ═══ NODES ═══ */}
          {nodes.map(n => {
            /* ── Current ── */
            if (n.type === "current") return (
              <div key={n.id} onMouseDown={e => startDrag(n.id, e)} style={{
                position: "absolute", left: n.x, top: n.y,
                width: NS.current.w, height: NS.current.h, borderRadius: 16,
                background: "linear-gradient(140deg, #34D399 0%, #059669 100%)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "grab", color: "#FFF", zIndex: 10, userSelect: "none",
                boxShadow: "0 4px 16px rgba(5,150,105,0.3), 0 1px 3px rgba(0,0,0,0.1)",
              }}>
                <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 2 }}>👤</div>
                <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-jp)" }}>現在地</div>
              </div>
            );

            /* ── Goal ── */
            if (n.type === "goal") return (
              <div key={n.id} onMouseDown={e => startDrag(n.id, e)} style={{
                position: "absolute", left: n.x, top: n.y,
                width: NS.goal.w, height: NS.goal.h, borderRadius: "50%",
                background: "linear-gradient(140deg, #FFB088 0%, #F97316 60%, #EA580C 100%)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "grab", color: "#FFF", zIndex: 10, userSelect: "none",
                boxShadow: "0 6px 24px rgba(249,115,22,0.35), 0 2px 6px rgba(0,0,0,0.08)",
              }}>
                <div style={{ fontSize: 30, lineHeight: 1 }}>🏆</div>
                <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-jp)", marginTop: 2 }}>ゴール</div>
              </div>
            );

            /* ── Action ── */
            if (n.type === "action") {
              const cat = CATS[n.category] || CATS.search;
              const isRec = n.status === "recommended";
              const isDone = n.status === "completed";
              const isHov = hovered === n.id && !isDone;
              const isSel = sel === n.id;
              return (
                <div key={n.id}
                  onMouseDown={e => startDrag(n.id, e)}
                  onClick={e => { e.stopPropagation(); handleSelect(n.id); }}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: "absolute", left: n.x, top: n.y,
                    width: NS.action.w, padding: "12px 14px", borderRadius: 12,
                    background: isDone ? "#F7F7F7" : "#FFF",
                    border: isRec ? "2.5px solid #FF8C5A" : isSel ? "2px solid #4A90D9" : "1px solid #E8E8E8",
                    boxShadow: isHov ? "0 6px 20px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.08)",
                    cursor: isDone ? "default" : "pointer",
                    transform: isHov ? "translateY(-2px)" : "none",
                    transition: "box-shadow 0.2s, transform 0.2s",
                    zIndex: isSel ? 50 : 5, userSelect: "none",
                    opacity: isDone ? 0.6 : 1,
                  }}
                >
                  {isRec && (
                    <div style={{
                      position: "absolute", top: -11, right: 12,
                      padding: "2px 10px", borderRadius: 8,
                      background: "linear-gradient(135deg, #FF8C5A, #F97316)",
                      color: "#FFF", fontSize: 10, fontWeight: 700,
                      boxShadow: "0 2px 6px rgba(249,115,22,0.3)", fontFamily: "var(--font-jp)",
                    }}>おすすめ</div>
                  )}
                  {isDone && (
                    <div style={{
                      position: "absolute", top: -11, right: 12,
                      padding: "2px 10px", borderRadius: 8,
                      background: "#9CA3AF", color: "#FFF", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-jp)",
                    }}>✓ 完了</div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: isDone ? "#ECECEC" : cat.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, marginTop: 1,
                    }}>{cat.icon}</div>
                    <div style={{
                      fontSize: 13.5, fontWeight: 700, lineHeight: 1.4,
                      color: isDone ? "#999" : "#1A1A2E", fontFamily: "var(--font-jp)",
                    }}>{n.title}</div>
                  </div>
                  <div style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 7,
                    background: isDone ? "#ECECEC" : cat.bg,
                    color: isDone ? "#999" : cat.color,
                    fontSize: 10.5, fontWeight: 600, fontFamily: "var(--font-jp)",
                  }}>{cat.label}</div>
                </div>
              );
            }

            /* ── Future ── */
            if (n.type === "future") return (
              <div key={n.id} onMouseDown={e => startDrag(n.id, e)} style={{
                position: "absolute", left: n.x, top: n.y,
                width: NS.future.w, padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.55)", border: "1.5px dashed #C8C8C8",
                opacity: 0.55, cursor: "grab", userSelect: "none",
              }}>
                <div style={{ fontSize: 10, color: "#AAA", fontWeight: 600, marginBottom: 3, fontFamily: "var(--font-en)", letterSpacing: "0.04em" }}>Future</div>
                <div style={{ fontSize: 12, color: "#777", fontWeight: 600, lineHeight: 1.35, fontFamily: "var(--font-jp)" }}>{n.title}</div>
              </div>
            );
            return null;
          })}

          {/* SubMenu */}
          {menu && selNode && (
            <SubMenu node={selNode} onAction={handleAction} />
          )}
        </div>

        {/* ═══ HEADER OVERLAY ═══ */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
          padding: "18px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(242,245,240,0.95) 0%, rgba(242,245,240,0) 100%)",
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, pointerEvents: "auto" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(140deg, #FF8C5A, #F97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 10px rgba(249,115,22,0.3)", fontSize: 20,
            }}>🗺️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1A1A2E", fontFamily: "var(--font-en)", letterSpacing: "-0.02em" }}>Quest Map</h1>
              <p style={{ margin: 0, fontSize: 11, color: "#8A8A9A", fontFamily: "var(--font-jp)", maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{goal}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, pointerEvents: "auto" }}>
            <div style={{
              padding: "8px 16px", borderRadius: 20,
              background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <span style={{ fontSize: 11, color: "#8A8A9A", fontWeight: 500, fontFamily: "var(--font-jp)" }}>進捗</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#FF8C5A", fontFamily: "var(--font-en)" }}>{done}/{actions.length}</span>
              <div style={{ width: 50, height: 5, borderRadius: 3, background: "#EAEAEA", overflow: "hidden" }}>
                <div style={{ width: actions.length ? `${(done / actions.length) * 100}%` : "0%", height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #FF8C5A, #34D399)", transition: "width 0.5s ease" }} />
              </div>
            </div>
            <button onClick={() => setScreen("input")} style={{
              padding: "8px 16px", borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)",
              fontSize: 12, fontWeight: 600, color: "#666", cursor: "pointer", fontFamily: "var(--font-jp)",
            }}>← 設定に戻る</button>
          </div>
        </div>

        {/* ═══ LEGEND ═══ */}
        <div style={{
          position: "absolute", bottom: 22, left: 22, zIndex: 100,
          padding: "12px 18px", borderRadius: 14,
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 20, alignItems: "center",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        }}>
          {[{ c: "#FF8C5A", l: "次のアクション", d: false }, { c: "#9A928A", l: "その先のステップ", d: true }].map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="28" height="6"><line x1="0" y1="3" x2="28" y2="3" stroke={it.c} strokeWidth={it.d ? 2 : 2.5} strokeDasharray={it.d ? "5 3" : "none"} strokeLinecap="round" /></svg>
              <span style={{ fontSize: 11, color: "#777", fontWeight: 500, fontFamily: "var(--font-jp)" }}>{it.l}</span>
            </div>
          ))}
          <div style={{ width: 1, height: 16, background: "#E8E8E8" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ padding: "1px 7px", borderRadius: 5, background: "#FFF", border: "2px solid #FF8C5A", fontSize: 9, fontWeight: 700, color: "#FF8C5A" }}>おすすめ</div>
            <span style={{ fontSize: 11, color: "#777", fontWeight: 500, fontFamily: "var(--font-jp)" }}>推奨</span>
          </div>
        </div>

        {/* ═══ ZOOM CONTROLS ═══ */}
        <div style={{ position: "absolute", bottom: 22, right: 22, zIndex: 100, display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            { l: "+", fn: () => setZoom(z => Math.min(2.2, z + 0.15)), r: "12px 12px 3px 3px" },
            { l: `${Math.round(zoom * 100)}%`, fn: () => { setZoom(1); setPan({ x: 0, y: 0 }); }, r: "3px" },
            { l: "−", fn: () => setZoom(z => Math.max(0.35, z - 0.15)), r: "3px 3px 12px 12px" },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} style={{
              width: 42, height: i === 1 ? 30 : 36, borderRadius: b.r,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: i === 1 ? 10 : 20, fontWeight: i === 1 ? 700 : 300,
              color: "#555", fontFamily: i === 1 ? "var(--font-en)" : "inherit",
            }}>{b.l}</button>
          ))}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {modal === "complete" && selNode && <CompleteModal node={selNode} onComplete={handleComplete} onClose={() => setModal(null)} />}
      {modal === "ai" && selNode && <AIChatPanel node={selNode} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════════════════ */

const CSS = `
  :root {
    --font-jp: 'Zen Kaku Gothic New', 'Noto Sans JP', 'Hiragino Sans', sans-serif;
    --font-en: 'Outfit', 'Zen Kaku Gothic New', sans-serif;
  }
  .qm-root { font-family: var(--font-jp); -webkit-font-smoothing: antialiased; margin: 0; padding: 0; }
  .qm-root * { box-sizing: border-box; }
  .qm-menu-item:hover { background: #F5F5F5 !important; }
  @keyframes qm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes qm-fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes qm-slideLeft { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
`;