"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const router = useRouter();
  async function submit(event:FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    if(!response.ok){setError("E-mail ou senha inválidos.");setLoading(false);return;}
    router.push("/painel");
  }
  return <main style={{maxWidth:440,margin:"80px auto",padding:24}}><p className="eyebrow">área dos noivos</p><h1>Entrar no painel</h1><form onSubmit={submit} style={{display:"grid",gap:16,marginTop:24}}><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>{error&&<p role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading?"Entrando…":"Entrar"}</button></form></main>;
}
