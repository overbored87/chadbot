import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client (inject via Vite env vars) ────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const TAGS = ["opener", "response", "recovery", "flirty", "banter", "profile", "general"];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        background: type === "error" ? "#ff4444" : "#c8a84b",
        color: "#0a0a0a",
        padding: "10px 18px",
        borderRadius: 6,
        fontFamily: "'DM Mono', monospace",
        fontSize: 13,
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        animation: "slideUp 0.25s ease",
      }}
    >
      {message}
    </div>
  );
}

// ── Prompt Editor ─────────────────────────────────────────────────────────────
function PromptEditor({ toast }) {
  const [prompt, setPrompt] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("config")
      .select("system_prompt")
      .eq("id", "main")
      .single()
      .then(({ data }) => {
        if (data) {
          setPrompt(data.system_prompt);
          setOriginal(data.system_prompt);
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("config")
      .update({ system_prompt: prompt, updated_at: new Date().toISOString() })
      .eq("id", "main");
    setSaving(false);
    if (error) toast("Failed to save prompt", "error");
    else {
      setOriginal(prompt);
      toast("Prompt saved — bot updated instantly ✓");
    }
  };

  const reset = () => setPrompt(original);
  const isDirty = prompt !== original;

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>SYSTEM PROMPT</span>
        <span style={isDirty ? { ...styles.badge, background: "#c8a84b22", color: "#c8a84b", border: "1px solid #c8a84b44" } : styles.badge}>
          {isDirty ? "● unsaved" : "● synced"}
        </span>
      </div>
      <p style={styles.cardSub}>
        This is Chadbot's brain. Changes take effect immediately on the next Telegram message.
      </p>
      {loading ? (
        <div style={styles.skeleton} />
      ) : (
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={styles.textarea}
          rows={18}
          placeholder="Enter system prompt..."
          spellCheck={false}
        />
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={save} disabled={!isDirty || saving} style={{ ...styles.btn, ...(isDirty ? styles.btnPrimary : styles.btnDisabled) }}>
          {saving ? "Saving..." : "Save Prompt"}
        </button>
        {isDirty && (
          <button onClick={reset} style={{ ...styles.btn, ...styles.btnGhost }}>
            Discard
          </button>
        )}
        <span style={{ marginLeft: "auto", ...styles.hint }}>
          {prompt.length.toLocaleString()} chars · ~{Math.round(prompt.split(/\s+/).length / 0.75)} tokens
        </span>
      </div>
    </section>
  );
}

// ── Example Card ──────────────────────────────────────────────────────────────
function ExampleCard({ ex, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        ...styles.exCard,
        opacity: ex.is_active ? 1 : 0.45,
        borderColor: ex.is_active ? "#2a2a2a" : "#1a1a1a",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...styles.typeBadge, background: ex.type === "conversation" ? "#1a2a3a" : "#1a2a1a" }}>
              {ex.type}
            </span>
            <span style={styles.exTitle}>{ex.title}</span>
          </div>
          {ex.annotation && (
            <p style={{ margin: "6px 0 0", color: "#888", fontSize: 13, lineHeight: 1.5 }}>
              {ex.annotation}
            </p>
          )}
          {ex.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {ex.tags.map((t) => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          )}
          <span style={{ ...styles.hint, display: "block", marginTop: 8 }}>{timeAgo(ex.created_at)}</span>
        </div>
        {ex.screenshot_url && (
          <div style={{ position: "relative" }}>
            <img
              src={ex.screenshot_url}
              alt="example"
              onClick={() => setExpanded(!expanded)}
              style={{
                width: expanded ? 260 : 64,
                height: expanded ? "auto" : 64,
                objectFit: "cover",
                borderRadius: 6,
                border: "1px solid #2a2a2a",
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            />
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid #1e1e1e", paddingTop: 10 }}>
        <button onClick={() => onToggle(ex)} style={{ ...styles.btn, ...styles.btnGhost, fontSize: 12 }}>
          {ex.is_active ? "Disable" : "Enable"}
        </button>
        <button onClick={() => onDelete(ex.id)} style={{ ...styles.btn, fontSize: 12, color: "#ff6b6b", background: "transparent", border: "1px solid #2a1a1a" }}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Add Example Form ──────────────────────────────────────────────────────────
function AddExampleForm({ onAdded, toast }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "conversation", annotation: "", tags: [] });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTag = (t) => set("tags", form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!form.title.trim()) { toast("Title required", "error"); return; }
    setSaving(true);

    let screenshot_url = null;
    let screenshot_base64 = null;

    if (file) {
      // Try Storage upload
      const path = `examples/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const { error: uploadErr } = await supabase.storage
        .from("chadbot-examples")
        .upload(path, file, { contentType: file.type });

      if (!uploadErr) {
        const { data } = supabase.storage.from("chadbot-examples").getPublicUrl(path);
        screenshot_url = data.publicUrl;
      } else {
        // Fallback: base64 (small images only)
        const buf = await file.arrayBuffer();
        screenshot_base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      }
    }

    const { error } = await supabase.from("examples").insert({
      ...form,
      screenshot_url,
      screenshot_base64,
      is_active: true,
    });

    setSaving(false);
    if (error) { toast("Failed to save example", "error"); return; }
    toast("Example added ✓");
    setForm({ title: "", type: "conversation", annotation: "", tags: [] });
    setFile(null);
    setPreview(null);
    setOpen(false);
    onAdded();
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ ...styles.btn, ...styles.btnPrimary }}>
          + Add Example
        </button>
      ) : (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>NEW EXAMPLE</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          <label style={styles.label}>Title *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} style={styles.input} placeholder="e.g. Great recovery after slow reply" />

          <label style={styles.label}>Type</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["conversation", "profile", "general"].map((t) => (
              <button key={t} onClick={() => set("type", t)} style={{ ...styles.btn, ...(form.type === t ? styles.btnPrimary : styles.btnGhost), fontSize: 12 }}>
                {t}
              </button>
            ))}
          </div>

          <label style={styles.label}>Annotation</label>
          <textarea value={form.annotation} onChange={(e) => set("annotation", e.target.value)} style={{ ...styles.textarea, height: 80 }} placeholder="What makes this example good? What should the bot learn from it?" />

          <label style={styles.label}>Tags</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {TAGS.map((t) => (
              <button key={t} onClick={() => toggleTag(t)} style={{ ...styles.btn, ...(form.tags.includes(t) ? styles.btnPrimary : styles.btnGhost), fontSize: 12 }}>
                {t}
              </button>
            ))}
          </div>

          <label style={styles.label}>Screenshot (optional)</label>
          <div
            onClick={() => fileRef.current.click()}
            style={{ ...styles.dropZone, backgroundImage: preview ? `url(${preview})` : "none", backgroundSize: "cover", backgroundPosition: "center" }}
          >
            {!preview && <span style={{ color: "#555" }}>Click to upload image</span>}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={submit} disabled={saving} style={{ ...styles.btn, ...styles.btnPrimary }}>
              {saving ? "Saving..." : "Add to Knowledge Base"}
            </button>
            <button onClick={() => setOpen(false)} style={{ ...styles.btn, ...styles.btnGhost }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Knowledge Base ────────────────────────────────────────────────────────────
function KnowledgeBase({ toast }) {
  const [examples, setExamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data } = await supabase.from("examples").select("*").order("created_at", { ascending: false });
    setExamples(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (ex) => {
    await supabase.from("examples").update({ is_active: !ex.is_active }).eq("id", ex.id);
    toast(ex.is_active ? "Example disabled" : "Example enabled ✓");
    load();
  };

  const del = async (id) => {
    if (!confirm("Delete this example?")) return;
    await supabase.from("examples").delete().eq("id", id);
    toast("Deleted");
    load();
  };

  const filtered = filter === "all" ? examples : examples.filter((e) => e.type === filter || e.tags?.includes(filter));
  const active = examples.filter((e) => e.is_active).length;

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>KNOWLEDGE BASE</span>
        <span style={styles.badge}>{active} active · {examples.length} total</span>
      </div>
      <p style={styles.cardSub}>
        Reference examples injected into every prompt. The bot learns your style from these.
      </p>

      <AddExampleForm onAdded={load} toast={toast} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {["all", "conversation", "profile", "general", ...TAGS].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...styles.btn, ...(filter === f ? styles.btnPrimary : styles.btnGhost), fontSize: 11, padding: "4px 10px" }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.skeleton} />
      ) : filtered.length === 0 ? (
        <div style={{ ...styles.hint, textAlign: "center", padding: "32px 0" }}>
          No examples yet. Add some reference conversations to train Chadbot's style.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((ex) => (
            <ExampleCard key={ex.id} ex={ex} onToggle={toggle} onDelete={del} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("prompt");
  const [toastMsg, setToastMsg] = useState(null);

  const toast = (msg, type = "success") => setToastMsg({ msg, type });

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0d0d0d; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        textarea:focus, input:focus { outline: none !important; border-color: #c8a84b !important; }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={styles.logo}>🎯</div>
            <div>
              <div style={styles.logoText}>CHADBOT</div>
              <div style={styles.logoSub}>ADMIN CONSOLE</div>
            </div>
          </div>
          <div style={styles.statusDot}>
            <span style={styles.dot} />
            LIVE
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <div style={styles.tabInner}>
          {[["prompt", "System Prompt"], ["kb", "Knowledge Base"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ ...styles.tab, ...(tab === id ? styles.tabActive : {}) }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={styles.main}>
        <div style={styles.content}>
          {tab === "prompt" && <PromptEditor toast={toast} />}
          {tab === "kb" && <KnowledgeBase toast={toast} />}
        </div>
      </main>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onDone={() => setToastMsg(null)} />}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: { minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "'DM Mono', monospace" },
  header: { background: "#0d0d0d", borderBottom: "1px solid #1e1e1e", padding: "0 24px" },
  headerInner: { maxWidth: 860, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { fontSize: 28 },
  logoText: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 3, color: "#e8e8e8" },
  logoSub: { fontSize: 10, letterSpacing: 2, color: "#555", marginTop: 1 },
  statusDot: { display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#555", letterSpacing: 1.5 },
  dot: { display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#4caf50", boxShadow: "0 0 6px #4caf50" },
  tabBar: { background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "0 24px" },
  tabInner: { maxWidth: 860, margin: "0 auto", display: "flex", gap: 0 },
  tab: { background: "none", border: "none", borderBottom: "2px solid transparent", color: "#555", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 1.5, padding: "14px 18px", transition: "all 0.15s" },
  tabActive: { color: "#c8a84b", borderBottomColor: "#c8a84b" },
  main: { padding: "32px 24px" },
  content: { maxWidth: 860, margin: "0 auto" },
  card: { background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 24, marginBottom: 24 },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, color: "#888" },
  cardSub: { color: "#555", fontSize: 13, marginBottom: 18, lineHeight: 1.6 },
  badge: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#666" },
  textarea: { width: "100%", background: "#0d0d0d", border: "1px solid #252525", borderRadius: 6, color: "#d0d0d0", fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 1.7, padding: "14px 16px", resize: "vertical", transition: "border-color 0.15s" },
  input: { width: "100%", background: "#0d0d0d", border: "1px solid #252525", borderRadius: 6, color: "#d0d0d0", fontFamily: "'DM Mono', monospace", fontSize: 13, padding: "10px 14px", marginBottom: 14, transition: "border-color 0.15s" },
  label: { display: "block", fontSize: 11, letterSpacing: 1.5, color: "#555", marginBottom: 7, marginTop: 2 },
  btn: { border: "1px solid #2a2a2a", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 13, padding: "8px 16px", transition: "all 0.15s" },
  btnPrimary: { background: "#c8a84b", border: "1px solid #c8a84b", color: "#0a0a0a", fontWeight: 600 },
  btnGhost: { background: "transparent", border: "1px solid #2a2a2a", color: "#888" },
  btnDisabled: { background: "#1a1a1a", border: "1px solid #1e1e1e", color: "#444", cursor: "not-allowed" },
  hint: { fontSize: 11, color: "#444", letterSpacing: 0.5 },
  skeleton: { height: 280, background: "linear-gradient(90deg, #141414 25%, #1a1a1a 50%, #141414 75%)", borderRadius: 6, animation: "shimmer 1.5s infinite" },
  exCard: { background: "#0e0e0e", border: "1px solid #2a2a2a", borderRadius: 8, padding: 16, transition: "opacity 0.2s" },
  exTitle: { fontWeight: 500, fontSize: 14, color: "#ccc" },
  typeBadge: { borderRadius: 4, fontSize: 10, letterSpacing: 1, padding: "2px 7px", color: "#6ab0f5", fontWeight: 600 },
  tag: { background: "#1a1a1a", border: "1px solid #252525", borderRadius: 12, fontSize: 10, padding: "2px 8px", color: "#666", letterSpacing: 0.5 },
  dropZone: { border: "1px dashed #2a2a2a", borderRadius: 6, height: 120, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#0d0d0d", marginBottom: 4 },
};
