"use client";
import { useState } from "react";

export function AdminLogin(){
  const [password,setPassword]=useState(""); const [msg,setMsg]=useState("");
  async function go(e){
    e.preventDefault(); setMsg("");
    const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
    const d=await r.json(); if(r.ok) location.reload(); else setMsg(d.error||"Không đăng nhập được.");
  }
  return <div className="auth-wrap"><form className="auth-card" onSubmit={go}>
    <h1>⚙ Quản trị viên</h1><div className="brand" style={{color:"#1d4ed8"}}>MR. NGUYỄN BÉ LÂM</div>
    <p>Khu vực này dùng để đổi mật khẩu lớp trên <b>tất cả thiết bị</b>.</p>
    <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu quản trị" autoFocus/>
    <button className="btn primary" style={{width:"100%",marginTop:8}}>Đăng nhập quản trị</button>
    <div className="msg error">{msg}</div><div style={{textAlign:"center"}}><a href="/">← Về trang học</a></div>
  </form></div>;
}

export function AdminPanel(){
  const [student,setStudent]=useState(""); const [student2,setStudent2]=useState("");
  const [admin,setAdmin]=useState(""); const [admin2,setAdmin2]=useState(""); const [msg,setMsg]=useState("");
  async function post(url,body={}){
    setMsg(""); const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d=await r.json(); setMsg(d.message||d.error||"Xong."); if(r.status===401)setTimeout(()=>location.reload(),900); return r.ok;
  }
  async function changeStudent(){
    if(student!==student2){setMsg("Hai mật khẩu lớp không trùng nhau.");return}
    if(await post("/api/admin/change-student",{password:student})){setStudent("");setStudent2("")}
  }
  async function changeAdmin(){
    if(admin!==admin2){setMsg("Hai mật khẩu quản trị không trùng nhau.");return}
    if(await post("/api/admin/change-admin",{password:admin})){setAdmin("");setAdmin2("");setTimeout(()=>location.reload(),1200)}
  }
  async function logoutAdmin(){await fetch("/api/admin/logout",{method:"POST"});location.reload()}
  return <div className="shell">
    <div className="hero"><h1>⚙ ADMIN – A2 SPEAKING</h1><div className="brand">MR. NGUYỄN BÉ LÂM</div><p className="sub">Đổi mật khẩu một lần → áp dụng cho tất cả học sinh trên mọi thiết bị.</p></div>
    <div className="topbar"><a className="btn" href="/">← Trang học</a><button className="btn danger" onClick={logoutAdmin}>Đăng xuất Admin</button></div>
    <div className="note"><b>Cách hoạt động:</b> Khi đổi mật khẩu lớp, mật khẩu cũ hết hiệu lực ngay và phiên đăng nhập cũ của học sinh sẽ bị vô hiệu hóa. Trang học kiểm tra phiên định kỳ khoảng 30 giây.</div>
    <div className="admin-grid">
      <div className="card"><h3>🔐 Đổi mật khẩu lớp</h3><input className="input" type="password" value={student} onChange={e=>setStudent(e.target.value)} placeholder="Mật khẩu lớp mới (ít nhất 6 ký tự)"/><input className="input" type="password" value={student2} onChange={e=>setStudent2(e.target.value)} placeholder="Nhập lại mật khẩu lớp"/><button className="btn primary" style={{width:"100%"}} onClick={changeStudent}>ĐỔI MẬT KHẨU LỚP</button></div>
      <div className="card"><h3>🛡️ Đổi mật khẩu quản trị</h3><input className="input" type="password" value={admin} onChange={e=>setAdmin(e.target.value)} placeholder="Mật khẩu Admin mới (ít nhất 8 ký tự)"/><input className="input" type="password" value={admin2} onChange={e=>setAdmin2(e.target.value)} placeholder="Nhập lại mật khẩu Admin"/><button className="btn primary" style={{width:"100%"}} onClick={changeAdmin}>ĐỔI MẬT KHẨU ADMIN</button></div>
    </div>
    <div className="card"><h3>🚪 Đăng xuất toàn bộ học sinh</h3><p>Dùng nút này khi nghi lớp khác đang truy cập. Mật khẩu lớp không đổi, nhưng tất cả phiên đang mở sẽ bị vô hiệu hóa.</p><button className="btn danger" onClick={()=>post("/api/admin/logout-students")}>ĐĂNG XUẤT TẤT CẢ HỌC SINH</button></div>
    <div className={"msg "+(msg.includes("Đã")?"ok":"error")}>{msg}</div>
  </div>;
}