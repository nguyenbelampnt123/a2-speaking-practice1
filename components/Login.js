"use client";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = await fetch("/api/auth/login", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ password })
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) location.reload();
    else setMsg(d.error || "Không đăng nhập được.");
  }

  return <div className="auth-wrap">
    <form className="auth-card" onSubmit={submit}>
      <h1>🔐 A2 Speaking Review</h1>
      <div className="brand" style={{color:"#1d4ed8"}}>A2 SPEAKING PRACTICE • Designed by MR. NGUYỄN BÉ LÂM</div>
      <p>Nhập mật khẩu lớp để truy cập 5 đề Speaking A2.</p>
      <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu lớp" autoFocus />
      <button className="btn primary" style={{width:"100%",marginTop:8}} disabled={busy}>{busy?"Đang kiểm tra...":"Vào học"}</button>
      <div className="msg error">{msg}</div>
      <div style={{marginTop:10,textAlign:"center"}}><a href="/admin"><b>⚙ Quản trị viên</b></a></div>
    </form>
  </div>;
}