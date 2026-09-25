"use client";
import { useEffect, useRef, useState } from "react";
import { tests, part1 } from "@/lib/tests";

const DB_NAME = "a2-speaking-recordings";
const STORE = "recordings";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("sectionKey", "sectionKey", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveRecording(record) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadLatestRecordings() {
  const db = await openDB();
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();

  rows.sort((a,b) => b.createdAt - a.createdAt);
  const latest = {};
  for (const r of rows) {
    if (!latest[r.sectionKey]) latest[r.sectionKey] = r;
  }
  return latest;
}

export default function ReviewApp() {
  const [current, setCurrent] = useState(0);
  const [hidden, setHidden] = useState({});
  const [recordings, setRecordings] = useState({});
  const [recordingKey, setRecordingKey] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const t = tests[current];

  useEffect(() => {
    let mounted = true;
    loadLatestRecordings().then(rows => {
      if (!mounted) return;
      const withUrls = {};
      for (const [k,r] of Object.entries(rows)) {
        withUrls[k] = { ...r, url: URL.createObjectURL(r.blob) };
      }
      setRecordings(withUrls);
    }).catch(() => {});

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  function speak(txt) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    u.rate = .88;
    speechSynthesis.speak(u);
  }

  async function startRecording(sectionKey) {
    if (recordingKey) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert("Trình duyệt này chưa hỗ trợ ghi âm. Hãy dùng Chrome hoặc Edge và cho phép microphone.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const createdAt = Date.now();
        const record = {
          id: `${sectionKey}-${createdAt}`,
          sectionKey,
          createdAt,
          type,
          blob
        };

        try { await saveRecording(record); } catch {}

        const old = recordings[sectionKey];
        if (old?.url) URL.revokeObjectURL(old.url);

        const url = URL.createObjectURL(blob);
        setRecordings(prev => ({ ...prev, [sectionKey]: { ...record, url } }));
        setRecordingKey("");
        setRecordingSeconds(0);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.start();
      setRecordingKey(sectionKey);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      alert("Không mở được microphone. Hãy cho phép quyền microphone rồi thử lại.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function recorder(sectionKey, fileName) {
    const saved = recordings[sectionKey];
    const active = recordingKey === sectionKey;

    return <div>
      <div className="controls">
        {!active && !recordingKey &&
          <button className="btn green" onClick={() => startRecording(sectionKey)}>🎙️ Bắt đầu ghi âm</button>
        }
        {active &&
          <button className="btn danger" onClick={stopRecording}>⏹ Dừng & lưu ({formatTime(recordingSeconds)})</button>
        }
        {recordingKey && !active &&
          <button className="btn" disabled>Đang ghi âm phần khác...</button>
        }
      </div>

      {saved && <div className="result">
        <b>🎧 Bản ghi gần nhất</b>
        <div style={{marginTop:8}}>
          <audio controls src={saved.url} style={{width:"100%"}} />
        </div>
        <div className="controls">
          <a className="btn" href={saved.url} download={`${fileName}.webm`}>⬇ Tải bản ghi âm</a>
        </div>
        <small>Bản ghi được lưu trên trình duyệt/thiết bị này và có thể nghe lại sau.</small>
      </div>}
    </div>;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

  return <div className="shell">
    <div className="hero">
      <h1>A2 SPEAKING REVIEW</h1>
      <div className="brand">A2 SPEAKING PRACTICE • Designed by MR. NGUYỄN BÉ LÂM</div>
      <p className="sub">5 đề riêng biệt • Mỗi đề đầy đủ Part 1 → Part 4 • Ghi âm và lưu bài nói</p>
    </div>

    <div className="topbar">
      <div><b>Chọn một đề và luyện trọn vẹn 4 phần.</b></div>
      <div style={{display:"flex",gap:8}}>
        <a className="btn" href="/admin">⚙ Quản trị</a>
        <button className="btn danger" onClick={logout}>Đăng xuất</button>
      </div>
    </div>

    <div className="note">
      <b>Ghi âm:</b> Web không chấm điểm. Học sinh chỉ ghi âm, nghe lại và lưu bản ghi trên thiết bị.
    </div>

    <div className="test-tabs">
      {tests.map((x,i) =>
        <button key={x.n} className={"test-tab "+(i===current?"active":"")} onClick={()=>setCurrent(i)}>
          ĐỀ {x.n}<small>{x.title}</small>
        </button>
      )}
    </div>

    <section className="test-page active">
      <div className="title-card">
        <div><span className="badge">A2 SPEAKING</span><h2>ĐỀ {t.n} – {t.title}</h2></div>
        <span className="badge">Đủ 4 phần</span>
      </div>

      <div className="card">
        <h3>PART 1 – INTRODUCTION</h3>
        <div className="practice">{part1}</div>
        <div className="controls">
          <button className="btn primary" onClick={()=>speak(part1)}>🔊 Nghe mẫu</button>
        </div>
        {recorder(`test${t.n}-part1`, `De_${t.n}_Part_1`)}
      </div>

      <div className="card">
        <h3>PART 2 – READ ALOUD</h3>
        <div className="practice">{t.part2}</div>
        <div className="controls">
          <button className="btn primary" onClick={()=>speak(t.part2)}>🔊 Nghe mẫu</button>
        </div>
        {recorder(`test${t.n}-part2`, `De_${t.n}_Part_2`)}
      </div>

      <div className="card">
        <h3>PART 3 – DESCRIBE THE PICTURE</h3>
        <img className="picture" src={`/test${t.n}.png`} alt={`Speaking test ${t.n}`} />
        <div className="controls">
          <button className="btn primary" onClick={()=>speak(t.part3.join(" "))}>🔊 Nghe toàn bài</button>
          <button className="btn" onClick={()=>setHidden({...hidden,[t.n]:!hidden[t.n]})}>👁 Hiện/ẩn bài mẫu</button>
        </div>

        {!hidden[t.n] && <div>
          {t.part3.map((s,i) =>
            <div className="sentence" key={i}>
              <b>{i+1}.</b> {s}
              <button className="btn" style={{padding:"3px 7px",float:"right"}} onClick={()=>speak(s)}>🔊</button>
            </div>
          )}
        </div>}
        {recorder(`test${t.n}-part3`, `De_${t.n}_Part_3`)}
      </div>

      <div className="card">
        <h3>PART 4 – ANSWER QUESTIONS</h3>
        {t.qa.map(([q,a],i) =>
          <div className="qa-row" key={i}>
            <div className="q">
              <b>{i+1}.</b> {q}
              <button className="btn" style={{padding:"3px 7px",marginLeft:6}} onClick={()=>speak(q)}>🔊</button>
            </div>
            <div className="a">
              {a}
              {recorder(`test${t.n}-part4-q${i+1}`, `De_${t.n}_Part_4_Cau_${i+1}`)}
            </div>
          </div>
        )}
      </div>
    </section>

    <div className="footer">A2 SPEAKING PRACTICE • Designed by MR. NGUYỄN BÉ LÂM</div>
  </div>;
}
