import { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || '';

// June 2025 default schedule
const JUNE_SCHEDULE = {
  1:'rest',2:'rest',3:'rest',4:'push',5:'pull',6:'legs',7:'push',
  8:'pull',9:'rest',10:'legs',11:'push',12:'pull',13:'rest',14:'match',
  15:'rest',16:'push',17:'match',18:'pull',19:'legs',20:'light',21:'rest',
  22:'match',23:'rest',24:'push',25:'legs',26:'pull',27:'light',28:'match',
  29:'rest',30:'push'
};

const ALL_TYPES = ['push','pull','legs','light','match','rest'];
const TYPE_LABEL = {push:'PUSH',pull:'PULL',legs:'KOJOS',light:'LENGVA',match:'RUNGTYNĖS',rest:'Poilsis'};

const MONTHS_LT = ['Sausis','Vasaris','Kovas','Balandis','Gegužė','Birželis','Liepa','Rugpjūtis','Rugsėjis','Spalis','Lapkritis','Gruodis'];
const DAY_SHORT = ['Pr','An','Tr','Kt','Pn','Št','Sk'];
const DAY_NAMES = ['Sekmadienis','Pirmadienis','Antradienis','Trečiadienis','Ketvirtadienis','Penktadienis','Šeštadienis'];

const BLOCKS = {
  push:[
    {name:'Blokas A — galingumo', params:'3–5 reps × 3–5 serijos'},
    {name:'Blokas B — hipertrofija', params:'6–10 reps × 3–4 serijos'},
    {name:'Blokas C — papildomas', params:'10–15 reps × 2–3 serijos'},
  ],
  pull:[
    {name:'Blokas A — galingumo', params:'3–5 reps × 3–5 serijos'},
    {name:'Blokas B — hipertrofija', params:'6–10 reps × 3–4 serijos'},
    {name:'Blokas C — papildomas', params:'10–15 reps × 2–3 serijos'},
  ],
  legs:[
    {name:'Blokas A — galingumo', params:'3–5 reps × 4–5 serijos'},
    {name:'Blokas B — unilateral', params:'5–8 reps × 3–4 serijos'},
    {name:'Blokas C — hipertrofija', params:'8–12 reps × 3 serijos'},
    {name:'Blokas D — core', params:'Integrated movement'},
  ],
  light:[
    {name:'Mobilumas', params:'10–15 min'},
    {name:'Aktyvacija', params:'Lengva, be nuovargio'},
    {name:'Tempimas', params:'10 min'},
  ],
  match:[{name:'Rungtynės', params:''}],
  rest:[{name:'Poilsis', params:''}],
};

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year, month) {
  // 0=Sun..6=Sat, convert to Mon-first: 0=Mon..6=Sun
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}
function dateKey(year, month, day) {
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function getDefaultType(year, month, day) {
  if (year === 2025 && month === 5) return JUNE_SCHEDULE[day] || 'rest';
  return 'rest';
}

function typeStyle(t) {
  const s = {
    push:  {bg:'#DBEAFE', color:'#1D4ED8', border:'#93C5FD'},
    pull:  {bg:'#EDE9FE', color:'#6D28D9', border:'#C4B5FD'},
    legs:  {bg:'#DCFCE7', color:'#15803D', border:'#86EFAC'},
    light: {bg:'#FEF3C7', color:'#B45309', border:'#FCD34D'},
    match: {bg:'#FEE2E2', color:'#B91C1C', border:'#FCA5A5'},
    rest:  {bg:'#F1F5F9', color:'#64748B', border:'#CBD5E1'},
  };
  return s[t] || s.rest;
}

function makeEmptyDay(type) {
  const bDefs = BLOCKS[type] || BLOCKS.rest;
  return {
    blocks: bDefs.map(b => ({name:b.name, params:b.params, exercises:[{name:'',sets:'',reps:'',weight:''}]})),
    note:'',
  };
}

function getToken() { return localStorage.getItem('gym_token'); }
function setToken(t) { localStorage.setItem('gym_token', t); }
function clearToken() { localStorage.removeItem('gym_token'); }

async function apiReq(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { clearToken(); window.location.reload(); }
  return res.json();
}

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setErr('');
    try {
      const res = await fetch(API+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
      const data = await res.json();
      if (data.token) { setToken(data.token); onLogin(); }
      else setErr('Neteisingas slaptažodis');
    } catch { setErr('Serverio klaida.'); }
    setLoading(false);
  }
  return (
    <div style={S.loginWrap}>
      <div style={S.loginCard}>
        <div style={{fontSize:40,marginBottom:4}}>🏋️</div>
        <h1 style={S.loginTitle}>Gym Žurnalas</h1>
        <p style={S.loginSub}>Hegelmann · 2025</p>
        <form onSubmit={handleLogin} style={{width:'100%'}}>
          <input type="password" placeholder="Slaptažodis" value={pw} onChange={e=>setPw(e.target.value)} style={S.loginInput} autoFocus/>
          {err && <p style={S.loginErr}>{err}</p>}
          <button type="submit" disabled={loading} style={S.loginBtn}>{loading?'Jungiamasi...':'Prisijungti'}</button>
        </form>
      </div>
    </div>
  );
}

function TypePicker({ currentType, onSelect, onClose }) {
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:600,color:'#1E293B',marginBottom:12}}>Keisti dienos tipą</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {ALL_TYPES.map(t=>{
            const ts=typeStyle(t);
            return <button key={t} onClick={()=>onSelect(t)} style={{background:ts.bg,color:ts.color,border:`1px solid ${ts.border}`,borderRadius:8,padding:'8px 14px',fontSize:13,fontWeight:600,cursor:'pointer',textAlign:'left',outline:t===currentType?`2px solid ${ts.color}`:'none'}}>{TYPE_LABEL[t]} {t===currentType?'✓':''}</button>;
          })}
        </div>
        <button onClick={onClose} style={{...S.backBtn,marginTop:12,width:'100%',textAlign:'center'}}>Atšaukti</button>
      </div>
    </div>
  );
}

function Calendar({ year, month, workouts, dayTypes, onDayClick }) {
  const days = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);

  function getType(d) {
    const k = dateKey(year, month, d);
    return dayTypes[k] || getDefaultType(year, month, d);
  }
  function isLogged(d) {
    const w = workouts[dateKey(year, month, d)];
    return w && w.blocks && w.blocks.some(b=>b.exercises&&b.exercises.some(e=>e.name&&e.name.trim()));
  }

  return (
    <div style={S.calGrid}>
      {DAY_SHORT.map(d=><div key={d} style={S.calHeader}>{d}</div>)}
      {Array.from({length:offset},(_,i)=><div key={'e'+i} style={S.emptyCell}/>)}
      {Array.from({length:days},(_,i)=>{
        const d=i+1;
        const type=getType(d);
        const ts=typeStyle(type);
        const logged=isLogged(d);
        return (
          <div key={d} onClick={()=>onDayClick(d)} style={{...S.dayCell,background:ts.bg,border:`1px solid ${ts.border}`,cursor:'pointer'}}>
            <span style={S.dayNum}>{d}</span>
            <span style={{...S.dayType,color:ts.color,fontSize:type==='match'?10:11}}>{TYPE_LABEL[type]}</span>
            {logged&&<span style={S.logged}>✓</span>}
          </div>
        );
      })}
    </div>
  );
}

function DayView({ year, month, day, initial, currentType, onBack, onSave, onChangeType }) {
  const ts = typeStyle(currentType);
  const dow = new Date(year, month, day).getDay();
  const dk = dateKey(year, month, day);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [dayData, setDayData] = useState(()=>initial&&initial.blocks&&initial.blocks.length>0?initial:makeEmptyDay(currentType));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateEx(bi,ei,field,val){setDayData(prev=>{const nd=JSON.parse(JSON.stringify(prev));nd.blocks[bi].exercises[ei][field]=val;return nd;});}
  function addEx(bi){setDayData(prev=>{const nd=JSON.parse(JSON.stringify(prev));nd.blocks[bi].exercises.push({name:'',sets:'',reps:'',weight:''});return nd;});}
  function delEx(bi,ei){setDayData(prev=>{const nd=JSON.parse(JSON.stringify(prev));nd.blocks[bi].exercises.splice(ei,1);if(nd.blocks[bi].exercises.length===0)nd.blocks[bi].exercises.push({name:'',sets:'',reps:'',weight:''});return nd;});}

  async function handleTypeChange(newType){
    setShowTypePicker(false);
    await onChangeType(dk, newType);
    setDayData(makeEmptyDay(newType));
  }
  async function handleSave(){
    setSaving(true);
    await onSave(dk, dayData);
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  }

  return (
    <div style={S.dayView}>
      {showTypePicker&&<TypePicker currentType={currentType} onSelect={handleTypeChange} onClose={()=>setShowTypePicker(false)}/>}
      <button onClick={onBack} style={S.backBtn}>← Atgal</button>
      <div style={{...S.dayHeader,background:ts.bg,borderColor:ts.border}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={S.dayHeaderDate}>{day} {MONTHS_LT[month]} {year} · {DAY_NAMES[dow]}</div>
            <div style={{...S.dayBadge,color:ts.color}}>{TYPE_LABEL[currentType]}</div>
          </div>
          <button onClick={()=>setShowTypePicker(true)} style={{background:'rgba(255,255,255,0.7)',border:`1px solid ${ts.border}`,borderRadius:8,padding:'5px 10px',fontSize:12,color:ts.color,cursor:'pointer',fontWeight:500}}>Keisti tipą</button>
        </div>
      </div>

      {dayData.blocks.map((block,bi)=>(
        <div key={bi} style={S.blockCard}>
          <div style={S.blockTitle}>{block.name}{block.params?<span style={S.blockParams}> · {block.params}</span>:null}</div>
          <div style={S.exHeader}>
            <span style={{flex:1}}>Pratimas</span>
            <span style={S.exNum}>Serijos</span>
            <span style={S.exNum}>Kartai</span>
            <span style={S.exNum}>Svoris</span>
            <span style={{width:28}}/>
          </div>
          {block.exercises.map((ex,ei)=>(
            <div key={ei} style={S.exRow}>
              <input style={{...S.input,flex:1}} value={ex.name} placeholder="Pratimas..." onChange={e=>updateEx(bi,ei,'name',e.target.value)}/>
              <input style={{...S.input,...S.inputNum}} type="number" min="1" max="20" value={ex.sets} placeholder="—" onChange={e=>updateEx(bi,ei,'sets',e.target.value)}/>
              <input style={{...S.input,...S.inputNum}} type="number" min="1" max="100" value={ex.reps} placeholder="—" onChange={e=>updateEx(bi,ei,'reps',e.target.value)}/>
              <input style={{...S.input,...S.inputNum}} type="number" min="0" step="0.5" value={ex.weight} placeholder="—" onChange={e=>updateEx(bi,ei,'weight',e.target.value)}/>
              <button onClick={()=>delEx(bi,ei)} style={S.delBtn}>✕</button>
            </div>
          ))}
          <button onClick={()=>addEx(bi)} style={S.addBtn}>+ Pridėti pratimą</button>
        </div>
      ))}

      <div style={S.blockCard}>
        <div style={S.blockTitle}>Pastabos</div>
        <textarea style={S.textarea} placeholder="Kaip jautėtės, nuovargis..." value={dayData.note||''} onChange={e=>setDayData(prev=>({...prev,note:e.target.value}))}/>
      </div>
      <button onClick={handleSave} disabled={saving} style={S.saveBtn}>{saving?'Saugojama...':saved?'✓ Išsaugota!':'Išsaugoti treniruotę'}</button>
    </div>
  );
}

export default function App() {
  const now = new Date();
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [workouts, setWorkouts] = useState({});
  const [dayTypes, setDayTypes] = useState({});
  const [activeDay, setActiveDay] = useState(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('');

  const fetchAll = useCallback(async()=>{
    try {
      const [w,dt] = await Promise.all([apiReq('GET','/api/workouts'),apiReq('GET','/api/daytypes')]);
      if(w&&!w.error) setWorkouts(w);
      if(dt&&!dt.error) setDayTypes(dt);
    } catch{}
    setLoading(false);
  },[]);

  useEffect(()=>{if(loggedIn)fetchAll();else setLoading(false);},[loggedIn,fetchAll]);

  async function handleSave(dk, dayData){
    setSyncStatus('Saugojama...');
    try {
      await apiReq('PUT','/api/workouts/'+dk,dayData);
      setWorkouts(prev=>({...prev,[dk]:dayData}));
      setSyncStatus('Išsaugota ✓');
      setTimeout(()=>setSyncStatus(''),3000);
    } catch { setSyncStatus('Klaida'); }
  }

  async function handleChangeType(dk, newType){
    try {
      await apiReq('PUT','/api/daytypes/'+dk,{type:newType});
      setDayTypes(prev=>({...prev,[dk]:newType}));
    } catch{}
  }

  function getTypeForDay(d){
    const dk = dateKey(year,month,d);
    return dayTypes[dk] || getDefaultType(year,month,d);
  }

  function prevMonth(){
    if(month===0){setMonth(11);setYear(y=>y-1);}
    else setMonth(m=>m-1);
  }
  function nextMonth(){
    if(month===11){setMonth(0);setYear(y=>y+1);}
    else setMonth(m=>m+1);
  }

  if(!loggedIn) return <LoginScreen onLogin={()=>setLoggedIn(true)}/>;
  if(loading) return <div style={S.loadingWrap}><div style={S.loadingText}>Kraunama...</div></div>;

  if(activeDay!==null){
    const dk=dateKey(year,month,activeDay);
    return (
      <div style={S.app}>
        <DayView year={year} month={month} day={activeDay} initial={workouts[dk]} currentType={getTypeForDay(activeDay)} onBack={()=>setActiveDay(null)} onSave={handleSave} onChangeType={handleChangeType}/>
      </div>
    );
  }

  const loggedCount = Object.keys(workouts).filter(k=>k.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length;

  return (
    <div style={S.app}>
      <div style={S.topBar}>
        <div>
          <div style={S.appTitle}>🏋️ Gym Žurnalas</div>
          <div style={S.appSub}>Hegelmann</div>
        </div>
        <button onClick={()=>{clearToken();setLoggedIn(false);}} style={S.logoutBtn}>Atsijungti</button>
      </div>

      {syncStatus?<div style={S.syncBar}>{syncStatus}</div>:null}

      <div style={S.monthNav}>
        <button onClick={prevMonth} style={S.navBtn}>‹</button>
        <div style={S.monthTitle}>{MONTHS_LT[month]} {year}</div>
        <button onClick={nextMonth} style={S.navBtn}>›</button>
      </div>

      <div style={S.legend}>
        {[['push','PUSH'],['pull','PULL'],['legs','KOJOS'],['light','LENGVA'],['match','RUNGTYNĖS']].map(([t,l])=>{
          const ts=typeStyle(t);
          return <div key={t} style={S.legItem}><div style={{width:10,height:10,borderRadius:2,background:ts.bg,border:`1px solid ${ts.border}`}}/><span style={{fontSize:11,color:'#64748B'}}>{l}</span></div>;
        })}
      </div>

      <Calendar year={year} month={month} workouts={workouts} dayTypes={dayTypes} onDayClick={setActiveDay}/>

      <div style={S.footer}>{loggedCount} treniruočių šį mėnesį · Spausk ant dienos</div>
    </div>
  );
}

const S = {
  app:{maxWidth:500,margin:'0 auto',padding:'16px 12px',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',minHeight:'100vh',background:'#F8FAFC'},
  loadingWrap:{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F8FAFC'},
  loadingText:{fontSize:16,color:'#64748B'},
  loginWrap:{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#F8FAFC',padding:16},
  loginCard:{background:'#fff',borderRadius:16,border:'0.5px solid #E2E8F0',padding:'32px 24px',width:'100%',maxWidth:320,display:'flex',flexDirection:'column',alignItems:'center',gap:8},
  loginTitle:{fontSize:22,fontWeight:600,color:'#1E293B',margin:0},
  loginSub:{fontSize:13,color:'#64748B',margin:0,marginBottom:8},
  loginInput:{width:'100%',fontSize:16,padding:'10px 14px',borderRadius:10,border:'1px solid #E2E8F0',marginBottom:8,boxSizing:'border-box',outline:'none'},
  loginErr:{fontSize:13,color:'#B91C1C',margin:'0 0 8px',textAlign:'center'},
  loginBtn:{width:'100%',background:'#1D4ED8',color:'#fff',border:'none',borderRadius:10,padding:'11px',fontSize:15,fontWeight:500,cursor:'pointer'},
  topBar:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12},
  appTitle:{fontSize:20,fontWeight:600,color:'#1E293B'},
  appSub:{fontSize:12,color:'#64748B',marginTop:2},
  logoutBtn:{background:'none',border:'0.5px solid #E2E8F0',borderRadius:8,padding:'5px 10px',fontSize:12,color:'#64748B',cursor:'pointer'},
  syncBar:{background:'#EFF6FF',border:'0.5px solid #BFDBFE',borderRadius:8,padding:'6px 12px',fontSize:12,color:'#1D4ED8',marginBottom:10,textAlign:'center'},
  monthNav:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,background:'#fff',borderRadius:12,border:'0.5px solid #E2E8F0',padding:'8px 12px'},
  monthTitle:{fontSize:16,fontWeight:600,color:'#1E293B'},
  navBtn:{background:'none',border:'none',fontSize:22,color:'#1D4ED8',cursor:'pointer',padding:'0 8px',fontWeight:300},
  legend:{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10},
  legItem:{display:'flex',alignItems:'center',gap:4},
  calGrid:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3},
  calHeader:{fontSize:11,fontWeight:500,color:'#94A3B8',textAlign:'center',padding:'4px 0'},
  emptyCell:{height:70,borderRadius:8,background:'transparent'},
  dayCell:{borderRadius:8,padding:'6px 5px',minHeight:70,display:'flex',flexDirection:'column',gap:3,transition:'transform 0.1s'},
  dayNum:{fontSize:11,color:'#64748B',fontWeight:500},
  dayType:{fontSize:11,fontWeight:600,lineHeight:1.2},
  logged:{fontSize:10,color:'#15803D',fontWeight:500},
  dayView:{maxWidth:500,margin:'0 auto'},
  backBtn:{background:'none',border:'0.5px solid #E2E8F0',borderRadius:8,padding:'6px 12px',fontSize:13,color:'#64748B',cursor:'pointer',marginBottom:12,display:'inline-block'},
  dayHeader:{borderRadius:12,border:'1px solid',padding:'12px 16px',marginBottom:12},
  dayHeaderDate:{fontSize:15,fontWeight:600,color:'#1E293B'},
  dayBadge:{fontSize:12,fontWeight:600,marginTop:4},
  blockCard:{background:'#fff',border:'0.5px solid #E2E8F0',borderRadius:12,padding:'14px',marginBottom:10},
  blockTitle:{fontSize:13,fontWeight:600,color:'#374151',marginBottom:10},
  blockParams:{fontWeight:400,color:'#94A3B8'},
  exHeader:{display:'flex',gap:5,marginBottom:4,alignItems:'center'},
  exRow:{display:'flex',gap:5,marginBottom:5,alignItems:'center'},
  input:{fontSize:13,padding:'7px 8px',borderRadius:8,border:'0.5px solid #E2E8F0',background:'#fff',color:'#1E293B',outline:'none'},
  inputNum:{width:58,textAlign:'center',flex:'none'},
  delBtn:{background:'none',border:'none',color:'#CBD5E1',fontSize:14,cursor:'pointer',padding:'4px',width:28,flexShrink:0},
  addBtn:{background:'none',border:'0.5px dashed #E2E8F0',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#94A3B8',cursor:'pointer',width:'100%',marginTop:2},
  textarea:{width:'100%',fontSize:13,padding:'8px',borderRadius:8,border:'0.5px solid #E2E8F0',fontFamily:'-apple-system,sans-serif',minHeight:70,resize:'vertical',boxSizing:'border-box',color:'#1E293B',outline:'none'},
  saveBtn:{width:'100%',background:'#1D4ED8',color:'#fff',border:'none',borderRadius:12,padding:'13px',fontSize:15,fontWeight:500,cursor:'pointer',marginTop:4},
  footer:{textAlign:'center',fontSize:12,color:'#94A3B8',marginTop:16,paddingTop:12,borderTop:'0.5px solid #F1F5F9'},
  modalOverlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  modalCard:{background:'#fff',borderRadius:16,padding:'20px',width:'90%',maxWidth:300,boxShadow:'0 4px 24px rgba(0,0,0,0.15)'},
  exNum:{width:58,textAlign:'center',fontSize:10,color:'#94A3B8'},
};
