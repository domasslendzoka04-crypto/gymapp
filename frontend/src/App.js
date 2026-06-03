import { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || '';

const SCHEDULE = {
  1:'rest',2:'rest',3:'rest',4:'push',5:'pull',6:'legs',7:'push',
  8:'pull',9:'rest',10:'legs',11:'push',12:'pull',13:'rest',14:'match',
  15:'rest',16:'push',17:'match',18:'pull',19:'legs',20:'light',21:'rest',
  22:'match',23:'rest',24:'push',25:'legs',26:'pull',27:'light',28:'match',
  29:'rest',30:'push'
};

const TYPE_LABEL = {push:'PUSH',pull:'PULL',legs:'KOJOS',light:'LENGVA',match:'RUNGTYNĖS',rest:'Poilsis'};

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
  match:[
    {name:'Rungtynės', params:''},
  ],
};

const DAY_NAMES = ['Sekmadienis','Pirmadienis','Antradienis','Trečiadienis','Ketvirtadienis','Penktadienis','Šeštadienis'];
const DAY_SHORT = ['Pr','An','Tr','Kt','Pn','Št','Sk'];

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
  const bDefs = BLOCKS[type] || [];
  return {
    blocks: bDefs.map(b => ({
      name: b.name,
      params: b.params,
      exercises: [{name:'', sets:'', reps:'', weight:''}]
    })),
    note: '',
    completed: false,
  };
}

// ── API helpers ───────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('gym_token'); }
function setToken(t) { localStorage.setItem('gym_token', t); }
function clearToken() { localStorage.removeItem('gym_token'); }

async function apiReq(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { clearToken(); window.location.reload(); }
  return res.json();
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const res = await fetch(API + '/api/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (data.token) { setToken(data.token); onLogin(); }
      else setErr('Neteisingas slaptažodis');
    } catch {
      setErr('Serverio klaida. Bandyk dar kartą.');
    }
    setLoading(false);
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <div style={styles.loginIcon}>🏋️</div>
        <h1 style={styles.loginTitle}>Gym Žurnalas</h1>
        <p style={styles.loginSub}>Hegelmann · 2025</p>
        <form onSubmit={handleLogin} style={{width:'100%'}}>
          <input
            type="password"
            placeholder="Slaptažodis"
            value={pw}
            onChange={e => setPw(e.target.value)}
            style={styles.loginInput}
            autoFocus
          />
          {err && <p style={styles.loginErr}>{err}</p>}
          <button type="submit" disabled={loading} style={styles.loginBtn}>
            {loading ? 'Jungiamasi...' : 'Prisijungti'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function Calendar({ workouts, onDayClick }) {
  // June 1 = Sunday, offset = 6 empty cells (Mon-Sat before it)
  const emptyCells = 6;
  const totalCells = emptyCells + 30;

  const isLogged = (d) => {
    const w = workouts['2025-06-' + String(d).padStart(2,'0')];
    return w && w.blocks && w.blocks.some(b => b.exercises && b.exercises.some(e => e.name && e.name.trim()));
  };

  return (
    <div>
      <div style={styles.calGrid}>
        {DAY_SHORT.map(d => (
          <div key={d} style={styles.calHeader}>{d}</div>
        ))}
        {Array.from({length: emptyCells}, (_,i) => (
          <div key={'e'+i} style={styles.emptyCell}/>
        ))}
        {Array.from({length: 30}, (_,i) => {
          const d = i + 1;
          const type = SCHEDULE[d] || 'rest';
          const ts = typeStyle(type);
          const clickable = type !== 'rest';
          const logged = isLogged(d);
          return (
            <div
              key={d}
              onClick={() => clickable && onDayClick(d)}
              style={{
                ...styles.dayCell,
                background: ts.bg,
                border: `1px solid ${ts.border}`,
                cursor: clickable ? 'pointer' : 'default',
                opacity: type === 'rest' ? 0.6 : 1,
              }}
            >
              <span style={styles.dayNum}>{d}</span>
              <span style={{...styles.dayType, color: ts.color, fontSize: type === 'match' ? 10 : 11}}>
                {TYPE_LABEL[type]}
              </span>
              {logged && (
                <span style={styles.logged}>✓ Įrašyta</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day view ──────────────────────────────────────────────────────────────────
function DayView({ day, initial, onBack, onSave }) {
  const type = SCHEDULE[day] || 'rest';
  const ts = typeStyle(type);
  const dow = new Date(2025, 5, day).getDay();
  const dateKey = '2025-06-' + String(day).padStart(2,'0');

  const [dayData, setDayData] = useState(() => {
    if (initial && initial.blocks && initial.blocks.length > 0) return initial;
    return makeEmptyDay(type);
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateEx(bi, ei, field, val) {
    setDayData(prev => {
      const nd = JSON.parse(JSON.stringify(prev));
      nd.blocks[bi].exercises[ei][field] = val;
      return nd;
    });
  }

  function addEx(bi) {
    setDayData(prev => {
      const nd = JSON.parse(JSON.stringify(prev));
      nd.blocks[bi].exercises.push({name:'', sets:'', reps:'', weight:''});
      return nd;
    });
  }

  function delEx(bi, ei) {
    setDayData(prev => {
      const nd = JSON.parse(JSON.stringify(prev));
      nd.blocks[bi].exercises.splice(ei, 1);
      if (nd.blocks[bi].exercises.length === 0)
        nd.blocks[bi].exercises.push({name:'', sets:'', reps:'', weight:''});
      return nd;
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave(dateKey, dayData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={styles.dayView}>
      <button onClick={onBack} style={styles.backBtn}>← Atgal</button>

      <div style={{...styles.dayHeader, background: ts.bg, borderColor: ts.border}}>
        <div style={styles.dayHeaderDate}>{day} birželio · {DAY_NAMES[dow]}</div>
        <div style={{...styles.dayBadge, color: ts.color}}>{TYPE_LABEL[type]}</div>
      </div>

      {dayData.blocks.map((block, bi) => (
        <div key={bi} style={styles.blockCard}>
          <div style={styles.blockTitle}>
            {block.name}
            {block.params ? <span style={styles.blockParams}> · {block.params}</span> : null}
          </div>

          <div style={styles.exHeader}>
            <span style={{flex:1}}>Pratimas</span>
            <span style={styles.exNum}>Serijos</span>
            <span style={styles.exNum}>Kartai</span>
            <span style={styles.exNum}>Svoris</span>
            <span style={{width:28}}/>
          </div>

          {block.exercises.map((ex, ei) => (
            <div key={ei} style={styles.exRow}>
              <input
                style={{...styles.input, flex:1}}
                value={ex.name}
                placeholder="Pratimas..."
                onChange={e => updateEx(bi, ei, 'name', e.target.value)}
              />
              <input
                style={{...styles.input, ...styles.inputNum}}
                type="number" min="1" max="20"
                value={ex.sets}
                placeholder="—"
                onChange={e => updateEx(bi, ei, 'sets', e.target.value)}
              />
              <input
                style={{...styles.input, ...styles.inputNum}}
                type="number" min="1" max="100"
                value={ex.reps}
                placeholder="—"
                onChange={e => updateEx(bi, ei, 'reps', e.target.value)}
              />
              <input
                style={{...styles.input, ...styles.inputNum}}
                type="number" min="0" step="0.5"
                value={ex.weight}
                placeholder="—"
                onChange={e => updateEx(bi, ei, 'weight', e.target.value)}
              />
              <button onClick={() => delEx(bi, ei)} style={styles.delBtn}>✕</button>
            </div>
          ))}

          <button onClick={() => addEx(bi)} style={styles.addBtn}>+ Pridėti pratimą</button>
        </div>
      ))}

      <div style={styles.blockCard}>
        <div style={styles.blockTitle}>Pastabos</div>
        <textarea
          style={styles.textarea}
          placeholder="Kaip jautėtės, nuovargis, savitaika..."
          value={dayData.note || ''}
          onChange={e => setDayData(prev => ({...prev, note: e.target.value}))}
        />
      </div>

      <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
        {saving ? 'Saugojama...' : saved ? '✓ Išsaugota!' : 'Išsaugoti treniruotę'}
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [workouts, setWorkouts] = useState({});
  const [activeDay, setActiveDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('');

  const fetchWorkouts = useCallback(async () => {
    try {
      const data = await apiReq('GET', '/api/workouts');
      if (data && typeof data === 'object' && !data.error) setWorkouts(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loggedIn) fetchWorkouts();
    else setLoading(false);
  }, [loggedIn, fetchWorkouts]);

  async function handleSave(dateKey, dayData) {
    setSyncStatus('Saugojama...');
    try {
      await apiReq('PUT', '/api/workouts/' + dateKey, dayData);
      setWorkouts(prev => ({...prev, [dateKey]: dayData}));
      setSyncStatus('Išsaugota ✓');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch {
      setSyncStatus('Klaida saugant');
    }
  }

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
    setWorkouts({});
  }

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

  if (loading) return (
    <div style={styles.loadingWrap}>
      <div style={styles.loadingText}>Kraunama...</div>
    </div>
  );

  if (activeDay !== null) {
    const dateKey = '2025-06-' + String(activeDay).padStart(2,'0');
    return (
      <div style={styles.app}>
        <DayView
          day={activeDay}
          initial={workouts[dateKey]}
          onBack={() => setActiveDay(null)}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.topBar}>
        <div>
          <div style={styles.appTitle}>🏋️ Gym Žurnalas</div>
          <div style={styles.appSub}>Birželis 2025 · Hegelmann</div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Atsijungti</button>
      </div>

      {syncStatus ? <div style={styles.syncBar}>{syncStatus}</div> : null}

      <div style={styles.legend}>
        {[['push','PUSH'],['pull','PULL'],['legs','KOJOS'],['light','LENGVA'],['match','RUNGTYNĖS']].map(([t,l]) => {
          const ts = typeStyle(t);
          return (
            <div key={t} style={styles.legItem}>
              <div style={{width:10,height:10,borderRadius:2,background:ts.bg,border:`1px solid ${ts.border}`}}/>
              <span style={{fontSize:11,color:'#64748B'}}>{l}</span>
            </div>
          );
        })}
      </div>

      <Calendar workouts={workouts} onDayClick={setActiveDay} />

      <div style={styles.footer}>
        {Object.keys(workouts).length} treniruočių įrašyta
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  app: {maxWidth:500, margin:'0 auto', padding:'16px 12px', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', minHeight:'100vh', background:'#F8FAFC'},
  loadingWrap: {display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F8FAFC'},
  loadingText: {fontSize:16,color:'#64748B'},

  loginWrap: {display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#F8FAFC',padding:16},
  loginCard: {background:'#fff',borderRadius:16,border:'0.5px solid #E2E8F0',padding:'32px 24px',width:'100%',maxWidth:320,display:'flex',flexDirection:'column',alignItems:'center',gap:8},
  loginIcon: {fontSize:40,marginBottom:4},
  loginTitle: {fontSize:22,fontWeight:600,color:'#1E293B',margin:0},
  loginSub: {fontSize:13,color:'#64748B',margin:0,marginBottom:8},
  loginInput: {width:'100%',fontSize:16,padding:'10px 14px',borderRadius:10,border:'1px solid #E2E8F0',marginBottom:8,boxSizing:'border-box',outline:'none'},
  loginErr: {fontSize:13,color:'#B91C1C',margin:'0 0 8px',textAlign:'center'},
  loginBtn: {width:'100%',background:'#1D4ED8',color:'#fff',border:'none',borderRadius:10,padding:'11px',fontSize:15,fontWeight:500,cursor:'pointer'},

  topBar: {display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16},
  appTitle: {fontSize:20,fontWeight:600,color:'#1E293B'},
  appSub: {fontSize:12,color:'#64748B',marginTop:2},
  logoutBtn: {background:'none',border:'0.5px solid #E2E8F0',borderRadius:8,padding:'5px 10px',fontSize:12,color:'#64748B',cursor:'pointer'},
  syncBar: {background:'#EFF6FF',border:'0.5px solid #BFDBFE',borderRadius:8,padding:'6px 12px',fontSize:12,color:'#1D4ED8',marginBottom:10,textAlign:'center'},

  legend: {display:'flex',flexWrap:'wrap',gap:8,marginBottom:12},
  legItem: {display:'flex',alignItems:'center',gap:4},

  calGrid: {display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3},
  calHeader: {fontSize:11,fontWeight:500,color:'#94A3B8',textAlign:'center',padding:'4px 0'},
  emptyCell: {height:72,borderRadius:8,background:'transparent'},
  dayCell: {borderRadius:8,padding:'6px 5px',minHeight:72,display:'flex',flexDirection:'column',gap:3,transition:'transform 0.1s'},
  dayNum: {fontSize:11,color:'#64748B',fontWeight:500},
  dayType: {fontSize:11,fontWeight:600,lineHeight:1.2},
  logged: {fontSize:10,color:'#15803D',fontWeight:500},

  dayView: {maxWidth:500,margin:'0 auto'},
  backBtn: {background:'none',border:'0.5px solid #E2E8F0',borderRadius:8,padding:'6px 12px',fontSize:13,color:'#64748B',cursor:'pointer',marginBottom:12,display:'inline-block'},
  dayHeader: {borderRadius:12,border:'1px solid',padding:'12px 16px',marginBottom:12},
  dayHeaderDate: {fontSize:15,fontWeight:600,color:'#1E293B'},
  dayBadge: {fontSize:12,fontWeight:600,marginTop:4},

  blockCard: {background:'#fff',border:'0.5px solid #E2E8F0',borderRadius:12,padding:'14px',marginBottom:10},
  blockTitle: {fontSize:13,fontWeight:600,color:'#374151',marginBottom:10},
  blockParams: {fontWeight:400,color:'#94A3B8'},

  exHeader: {display:'flex',gap:5,marginBottom:4,alignItems:'center'},
  exRow: {display:'flex',gap:5,marginBottom:5,alignItems:'center'},
  input: {fontSize:13,padding:'7px 8px',borderRadius:8,border:'0.5px solid #E2E8F0',background:'#fff',color:'#1E293B',outline:'none'},
  inputNum: {width:60,textAlign:'center',flex:'none'},
  delBtn: {background:'none',border:'none',color:'#CBD5E1',fontSize:14,cursor:'pointer',padding:'4px',width:28,flexShrink:0},
  addBtn: {background:'none',border:'0.5px dashed #E2E8F0',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#94A3B8',cursor:'pointer',width:'100%',marginTop:2},

  textarea: {width:'100%',fontSize:13,padding:'8px',borderRadius:8,border:'0.5px solid #E2E8F0',fontFamily:'-apple-system,sans-serif',minHeight:70,resize:'vertical',boxSizing:'border-box',color:'#1E293B',outline:'none'},
  saveBtn: {width:'100%',background:'#1D4ED8',color:'#fff',border:'none',borderRadius:12,padding:'13px',fontSize:15,fontWeight:500,cursor:'pointer',marginTop:4},

  footer: {textAlign:'center',fontSize:12,color:'#94A3B8',marginTop:16,paddingTop:12,borderTop:'0.5px solid #F1F5F9'},
};
