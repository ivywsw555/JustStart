import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Trash2, Brain, CheckCircle, ChevronRight, ChevronLeft, Shuffle, Coffee, Sparkles, Loader2, Calendar as CalendarIcon, ArrowLeft, Pencil, X, Download, LogIn, LogOut, User, Cloud, LayoutList, Timer, Archive, Clock, Layers, ChevronDown, ChevronUp, Server, Check, CloudOff, Eye, EyeOff, Target, ClipboardList } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection 
} from "firebase/firestore";

// --- 🔥 LLM Configuration ---
const AI_CONFIG = {
    useMockData: true, 
    baseUrl: "http://localhost:11434/v1/chat/completions", 
    model: "llama3" 
};

// --- Firebase Config ---
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCXowQfMj1aU6SF_sYvRAvHItr_4EDAu7E",
  authDomain: "juststart-e864a.firebaseapp.com",
  projectId: "juststart-e864a",
  storageBucket: "juststart-e864a.firebasestorage.app",
  messagingSenderId: "788964373482",
  appId: "1:788964373482:web:f4af83e9b74a0c13c2b893",
  measurementId: "G-LCNVGLK197"
};

const getFirebaseConfig = () => {
  try {
    if (Object.keys(YOUR_FIREBASE_CONFIG).length > 0 && YOUR_FIREBASE_CONFIG.apiKey) {
      return YOUR_FIREBASE_CONFIG;
    }
    return typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  } catch (e) { return {}; }
};

const firebaseConfig = getFirebaseConfig();
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'jumpstart-app';

// --- Gemini API ---
const callLocalLLM = async (systemPrompt, userPrompt, jsonMode = false) => {
  if (AI_CONFIG.useMockData) {
      console.log("Mock AI Call:", userPrompt);
      await new Promise(r => setTimeout(r, 1000));
      if (jsonMode) {
          return JSON.stringify({
              projectName: "Quick Start",
              tasks: [
                  { title: "Task 1 (Mock)", minutes: 30, group: "Phase 1", dayOffset: 0, dailyGoal: "Complete basics" },
                  { title: "Task 2 (Mock)", minutes: 60, group: "Phase 1", dayOffset: 1, dailyGoal: "Deep dive" }
              ]
          });
      }
      return JSON.stringify({ advice: "Mock: 保持专注，你的数据正在云端漫游。" });
  }
  return null;
};

// 默认 90 天后过期
const getDefaultDeadline = (offsetDays = 90) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.getTime();
};

const INITIAL_TASKS = []; 

// --- Sub-Components (Canvas, Modal, Items) ---
const FocusParticleCanvas = ({ progress }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        resize();
        const particles = [];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        for(let i=0; i<60; i++) particles.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, vx:0, vy:0, life:0, maxLife:100}); 
        const render = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath(); ctx.arc(centerX, centerY, 50 + progress * 50, 0, Math.PI * 2); 
            ctx.fillStyle = '#F59E0B'; ctx.globalAlpha = 0.1; ctx.fill();
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
    }, [progress]);
    return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};

const EditTaskModal = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title);
    const [minutes, setMinutes] = useState(task.goalMinutes);
    const [group, setGroup] = useState(task.group || 'General');
    const [project, setProject] = useState(task.project || 'Manual');
    const [dailyGoal, setDailyGoal] = useState(task.dailyGoal || '');
    const [deadlineDate, setDeadlineDate] = useState(() => {
        const d = new Date(task.deadline || Date.now());
        return d.toISOString().split('T')[0];
    });
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
                <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold text-gray-900">调整任务</h3><button onClick={onClose}><X size={20}/></button></div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">任务名称</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-lg font-bold border-b-2 border-gray-200 outline-none py-1 bg-transparent"/>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">今日具体目标</label>
                    <input type="text" value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} className="w-full text-base font-medium text-gray-700 border-b-2 border-gray-200 outline-none py-1 bg-transparent placeholder-gray-300" placeholder="例如: 完成第3章练习"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">所属项目</label>
                        <input type="text" value={project} onChange={(e) => setProject(e.target.value)} className="w-full text-sm border-b-2 border-gray-200 outline-none py-1 bg-transparent"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">阶段/分组</label>
                        <input type="text" value={group} onChange={(e) => setGroup(e.target.value)} className="w-full text-sm border-b-2 border-gray-200 outline-none py-1 bg-transparent"/>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">每日目标(分)</label>
                        <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-full text-lg font-bold border-b-2 border-gray-200 outline-none py-1 bg-transparent"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">截止日期</label>
                        <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className="w-full text-sm border-b-2 border-gray-200 outline-none py-1 bg-transparent"/>
                    </div>
                </div>
                <button onClick={() => { onSave(task.id, { title, goalMinutes: parseInt(minutes), group, project, dailyGoal, deadline: new Date(deadlineDate).getTime() }); onClose(); }} className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">保存更改</button>
            </div>
        </div>
    );
};

// --- 🔥 New Component: Log Activity Modal ---
const LogActivityModal = ({ onClose, onLog, existingTasks }) => {
    const [title, setTitle] = useState('');
    const [minutes, setMinutes] = useState('');
    const [project, setProject] = useState('Manual');
    
    // Auto-complete suggestion based on existing tasks
    const [suggestions, setSuggestions] = useState([]);

    const handleTitleChange = (e) => {
        const val = e.target.value;
        setTitle(val);
        if (val.trim()) {
            const matches = existingTasks.filter(t => t.title.toLowerCase().includes(val.toLowerCase())).slice(0, 3);
            setSuggestions(matches);
        } else {
            setSuggestions([]);
        }
    };

    const selectSuggestion = (task) => {
        setTitle(task.title);
        setProject(task.project || 'Manual');
        setSuggestions([]);
    };

    const handleConfirm = () => {
        if (!title.trim() || !minutes) return;
        onLog({ title, minutes: parseFloat(minutes), project });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList size={22} className="text-indigo-600"/> 补录事项
                    </h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">做了什么？</label>
                    <input 
                        autoFocus
                        type="text" 
                        value={title} 
                        onChange={handleTitleChange} 
                        className="w-full text-lg font-bold border-b-2 border-gray-200 outline-none py-1 bg-transparent placeholder-gray-300" 
                        placeholder="例如: 帮同事修电脑"
                    />
                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 shadow-lg rounded-xl mt-1 z-20 overflow-hidden">
                            {suggestions.map(t => (
                                <div key={t.id} onClick={() => selectSuggestion(t)} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                                    {t.title} <span className="text-xs text-gray-400 ml-2">({t.project})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">时长 (分钟)</label>
                        <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-full text-lg font-mono font-bold text-indigo-600 border-b-2 border-gray-200 outline-none py-1 bg-transparent" placeholder="30"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">所属项目</label>
                        <input type="text" value={project} onChange={(e) => setProject(e.target.value)} className="w-full text-sm border-b-2 border-gray-200 outline-none py-2 bg-transparent"/>
                    </div>
                </div>

                <button onClick={handleConfirm} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                    确认补录
                </button>
            </div>
        </div>
    );
};

const SwipeableTaskItem = ({ task, onClick, onDelete, onEdit, hideTitle }) => {
    const [offsetX, setOffsetX] = useState(0);
    const progress = Math.min((task.completedMinutes / task.goalMinutes) * 100, 100);
    const isGoalReached = task.completedMinutes >= task.goalMinutes;

    return (
        <div className="relative w-full mb-3 select-none overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white h-[92px]">
            {/* Delete Background */}
            <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-xl"><Trash2 className="text-white" size={24} /></div>
            
            {/* Main Card Content */}
            <div className="absolute inset-0 bg-white rounded-xl border border-gray-100 flex z-10 transition-transform duration-200 overflow-hidden"
                style={{ transform: `translateX(${offsetX}px)` }}
                onTouchMove={(e) => { const diff = e.touches[0].clientX - e.currentTarget.getBoundingClientRect().x; if(diff < 0) setOffsetX(Math.max(diff, -100)); }}
                onTouchEnd={() => setOffsetX(offsetX < -50 ? -80 : 0)}
                onClick={() => offsetX < -10 ? setOffsetX(0) : onClick(task.id)}
            >
                {/* Left Color Strip */}
                <div className={`w-1.5 h-full ${task.color}`}></div>

                {/* Content Area */}
                <div className="flex-1 flex justify-between items-center p-3 pl-4 min-w-0">
                    <div className="flex-1 pr-3 min-w-0 flex flex-col justify-center h-full">
                        {/* Title Row */}
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-base text-gray-900 truncate transition-all ${hideTitle ? 'blur-sm select-none opacity-50' : ''}`}>
                                {hideTitle ? 'Secret Task' : task.title}
                            </h3>
                            {isGoalReached && <CheckCircle size={14} className="text-green-500" />}
                        </div>
                        
                        {/* Goal/Target Row (The Gray Text) */}
                        <p className={`text-xs truncate mt-0.5 transition-all duration-500 ${
                            isGoalReached 
                                ? 'text-amber-500 font-bold' 
                                : 'text-gray-400 font-medium'
                        } ${hideTitle ? 'opacity-0' : 'opacity-100'}`}>
                            {task.dailyGoal || (task.project + ' • ' + task.group)}
                        </p>

                        {/* Meta Row (Time & Edit) */}
                        <div className="flex items-center gap-3 text-xs mt-1.5 text-gray-300 font-mono">
                            <span className={isGoalReached ? 'text-green-600 font-bold' : ''}>
                                {Math.round(task.completedMinutes)} / {task.goalMinutes} m
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(task); }} 
                                className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-indigo-600 transition-colors"
                            >
                                <Pencil size={12}/>
                            </button>
                        </div>
                    </div>

                    {/* Play Button */}
                    <button className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${task.color} text-white shrink-0 hover:scale-105 active:scale-95 transition-transform`}>
                        {isGoalReached ? <Check size={18} /> : <Play fill="currentColor" size={14} className="ml-0.5"/>}
                    </button>
                </div>

                {/* Bottom Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Clickable delete area */}
            {offsetX <= -80 && <button onClick={(e) => {e.stopPropagation(); onDelete(task.id)}} className="absolute right-0 top-0 bottom-0 w-20 z-20"></button>}
        </div>
    );
};
const CalendarView = ({ history, exportData }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

    const changeMonth = (delta) => setCurrentDate(new Date(year, month + delta, 1));

    // Get color intensity based on minutes
    const getIntensityClass = (minutes) => {
        if (!minutes || minutes === 0) return 'bg-gray-50 text-gray-400';
        if (minutes < 30) return 'bg-emerald-100 text-emerald-800'; // Lite
        if (minutes < 60) return 'bg-emerald-300 text-emerald-900'; // Medium
        if (minutes < 120) return 'bg-emerald-500 text-white font-bold'; // Heavy
        return 'bg-emerald-700 text-white font-bold'; // Intense
    };

    // Calculate details for the selected date
    const selectedDayData = history[selectedDate] || [];
    const totalMinutes = selectedDayData.reduce((acc, curr) => acc + curr.minutes, 0);
    
    // Aggregate tasks for the list below
    const aggregated = selectedDayData.reduce((acc, curr) => {
        if (!acc[curr.title]) acc[curr.title] = { minutes: 0, color: curr.color };
        acc[curr.title].minutes += curr.minutes;
        return acc;
    }, {});

    return (
        <div className="animate-fade-in pb-20">
            {/* Header & Export */}
            <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-xl font-bold text-gray-900">专注热力图</h2>
                <button 
                    onClick={exportData} 
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                    <Download size={14} /> 备份数据
                </button>
            </div>

            {/* Calendar Grid Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                {/* Month Navigation */}
                <div className="flex justify-between items-center mb-4 px-1">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><ChevronLeft size={20}/></button>
                    <h3 className="font-bold text-base text-gray-800">{year}年 {month + 1}月</h3>
                    <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><ChevronRight size={20}/></button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                        <div key={d} className="text-[10px] font-bold text-gray-400 uppercase py-2">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                    {/* Empty slots for previous month */}
                    {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                    
                    {/* Actual Days */}
                    {[...Array(daysInMonth).keys()].map(i => {
                        const day = i + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayMins = (history[dateStr] || []).reduce((a, c) => a + c.minutes, 0);
                        const isSelected = dateStr === selectedDate;
                        const colorClass = getIntensityClass(dayMins);

                        return (
                            <div 
                                key={day} 
                                onClick={() => setSelectedDate(dateStr)}
                                className={`
                                    aspect-square flex items-center justify-center rounded-lg text-xs cursor-pointer transition-all duration-200
                                    ${colorClass}
                                    ${isSelected ? 'ring-2 ring-black ring-offset-1 scale-105 shadow-md z-10' : 'hover:opacity-80'}
                                `}
                            >
                                {day}
                            </div>
                        )
                    })}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-gray-400 font-medium">
                    <span>Less</span>
                    <div className="w-3 h-3 rounded bg-emerald-100"></div>
                    <div className="w-3 h-3 rounded bg-emerald-300"></div>
                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                    <div className="w-3 h-3 rounded bg-emerald-700"></div>
                    <span>More</span>
                </div>
            </div>

            {/* Selected Day Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-3">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">{selectedDate}</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {Math.round(totalMinutes)} <span className="text-sm font-normal text-gray-500">分钟</span>
                        </h3>
                    </div>
                    {totalMinutes > 0 && <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full"><Sparkles size={18} /></div>}
                </div>

                <div className="space-y-3">
                    {Object.keys(aggregated).length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm">
                            <Coffee size={24} className="mx-auto mb-2 opacity-50"/>
                            这一天没有记录，注意休息哦。
                        </div>
                    ) : (
                        Object.entries(aggregated).map(([title, data]) => (
                            <div key={title} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${data.color}`}></div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-black transition-colors">{title}</span>
                                </div>
                                <span className="text-sm font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded">{Math.round(data.minutes)}m</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default function JumpStart() {
  // --- Data State ---
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [history, setHistory] = useState({});
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('offline');

  // --- UI State ---
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [viewMode, setViewMode] = useState('dashboard');
  const [editingTask, setEditingTask] = useState(null);
  const [isLoggingActivity, setIsLoggingActivity] = useState(false); // 🔥 State for Log Modal
  const [aiMessage, setAiMessage] = useState("AI 助手就绪...");
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newTaskGoal, setNewTaskGoal] = useState(''); 
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [lastSessionTime, setLastSessionTime] = useState(0);
  const [hideTitles, setHideTitles] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // --- 1. Auth & Initial Load ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth); 
      } catch (e) {
        if (e.message && (e.message.includes('auth/requests-from-referer') || e.code === 'auth/requests-from-referer-blocked')) console.log("Preview env: Auth restricted, offline mode.");
        else console.warn("Auth failed:", e);
        setSyncStatus('offline');
      }
    };
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setSyncStatus('synced');
        setAiMessage(currentUser.isAnonymous ? "访客模式" : `欢迎, ${currentUser.displayName || 'Engineer'}。`);
      } else {
        if (syncStatus !== 'offline') setSyncStatus('offline');
      }
    });
    initAuth();
    return () => unsubscribe();
  }, []);

  // --- 2. Data Sync ---
  useEffect(() => {
    if (!user || !db) return; 
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
    const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.tasks) setTasks(data.tasks);
            if (data.history) setHistory(data.history);
            setSyncStatus('synced');
        } else if (tasks.length > 0) {
            saveDataToCloud(tasks, history);
        }
    }, (error) => { console.warn("Sync error", error); setSyncStatus('offline'); });
    return () => unsubscribeSnapshot();
  }, [user]); 

  // --- 3. Save Logic ---
  const saveDataToCloud = useCallback(async (newTasks, newHistory) => {
      localStorage.setItem('jumpstart_tasks', JSON.stringify(newTasks));
      localStorage.setItem('jumpstart_history', JSON.stringify(newHistory));
      if (!user || !db) return;
      setSyncStatus('syncing');
      try {
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
        await setDoc(userDocRef, { tasks: newTasks, history: newHistory, lastUpdated: new Date().toISOString() }, { merge: true });
        setSyncStatus('synced');
      } catch (e) { 
          if (!e.message?.includes('referer')) console.error("Save failed", e);
          setSyncStatus('offline');
      }
  }, [user]);

  // --- Handlers ---
  const handleGoogleLogin = async () => { if (!auth) return; try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { alert("Login Error: " + e.message); } };
  const handleLogout = async () => { if (!auth) return; await signOut(auth); setTasks(INITIAL_TASKS); setHistory({}); setUser(null); };

  useEffect(() => {
    if (activeTaskId) {
      startTimeRef.current = Date.now() - (timerSeconds * 1000);
      timerRef.current = setInterval(() => { setTimerSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000)); }, 1000);
    } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [activeTaskId]);

  const handleTaskClick = (taskId) => {
      if (activeTaskId === taskId) {
          try {
              const minutesToAdd = timerSeconds / 60;
              if (minutesToAdd > 0.1) {
                  const newTasks = tasks.map(t => t.id === taskId ? { ...t, completedMinutes: t.completedMinutes + minutesToAdd } : t);
                  const task = tasks.find(t => t.id === taskId);
                  if (task) {
                      const today = new Date().toISOString().split('T')[0];
                      const safeHistory = history || {};
                      const dayRecords = safeHistory[today] || [];
                      const newHistory = { ...safeHistory, [today]: [...dayRecords, { taskId, title: task.title, minutes: minutesToAdd, timestamp: Date.now(), color: task.color }] };
                      setTasks(newTasks);
                      setHistory(newHistory);
                      saveDataToCloud(newTasks, newHistory);
                      setLastSessionTime(timerSeconds); 
                      setShowSummary(true); 
                  }
              }
          } catch (err) {
              console.error("Error saving task progress:", err);
          } finally {
              setActiveTaskId(null);
              setTimerSeconds(0);
          }
      } else {
          setTimerSeconds(0);
          setActiveTaskId(taskId);
      }
  };

  // --- 🔥 Log Past Activity Handler ---
  const handleLogActivity = ({ title, minutes, project }) => {
      // 1. Check if task exists
      const existingTask = tasks.find(t => t.title === title && t.status !== 'archived');
      let newTasks = [...tasks];
      let loggedTaskId = existingTask ? existingTask.id : Date.now();
      let loggedTaskTitle = title;
      let loggedTaskColor = existingTask ? existingTask.color : 'bg-slate-500';

      if (existingTask) {
          // Update existing
          newTasks = newTasks.map(t => t.id === existingTask.id ? { ...t, completedMinutes: t.completedMinutes + minutes } : t);
      } else {
          // Create new task (one-off style)
          const newTask = {
              id: loggedTaskId,
              title: title,
              dailyGoal: "Manually Logged",
              goalMinutes: minutes,
              completedMinutes: minutes,
              color: 'bg-indigo-500', // Default color for logged items
              status: 'active',
              createdAt: Date.now(),
              deadline: getDefaultDeadline(),
              group: 'General',
              project: project
          };
          newTasks = [newTask, ...newTasks]; // Add to top
          loggedTaskColor = 'bg-indigo-500';
      }

      // 2. Add to history
      const today = new Date().toISOString().split('T')[0];
      const dayRecords = history[today] || [];
      const newHistory = { 
          ...history, 
          [today]: [...dayRecords, { 
              taskId: loggedTaskId, 
              title: loggedTaskTitle, 
              minutes: minutes, 
              timestamp: Date.now(), 
              color: loggedTaskColor 
          }] 
      };

      setTasks(newTasks);
      setHistory(newHistory);
      saveDataToCloud(newTasks, newHistory);
      alert(`✅ 成功补录: ${title} (${minutes}分钟)`);
  };

  const handleSummaryConfirm = () => { setShowSummary(false); setTimerSeconds(0); };

  const handleAiAdvice = async () => { /* AI Logic Omitted */ };
  
  const generateSmartPlan = async () => { /* AI Logic Omitted */ };

  const addNewTask = () => {
    if (!newTaskInput.trim()) return;
    
    let title = newTaskInput;
    let goalMinutes = 30;
    let group = 'General';

    const timeMatch = title.match(/(\d+(?:\.\d+)?)(m|min|h)/i);
    if (timeMatch) {
        const val = parseFloat(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        goalMinutes = unit === 'h' ? val * 60 : val;
        title = title.replace(timeMatch[0], '').trim();
    }

    const groupMatch = title.match(/(?:#|\[)(\w+)(?:\])?/);
    if (groupMatch) {
        group = groupMatch[1];
        title = title.replace(groupMatch[0], '').trim();
    }

    const newTask = {
      id: Date.now(),
      title: title,
      dailyGoal: newTaskGoal || "Daily Progress", // 🔥 Use the new input
      goalMinutes: Math.round(goalMinutes),
      completedMinutes: 0,
      color: 'bg-slate-500',
      status: 'active',
      createdAt: Date.now(),
      deadline: getDefaultDeadline(),
      group: group,
      project: 'Manual'
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveDataToCloud(newTasks, history);
    setNewTaskInput('');
    setNewTaskGoal('');
    setIsAddingTask(false);
  };

  const handleUpdateTask = (id, updates) => {
      const newTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
      setTasks(newTasks);
      saveDataToCloud(newTasks, history);
      setEditingTask(null);
  };

  const handleArchiveTask = (id) => {
      if(confirm('归档后任务将移至"管理"列表。确定吗？')) {
          const newTasks = tasks.map(t => t.id === id ? { ...t, status: 'archived' } : t);
          setTasks(newTasks);
          saveDataToCloud(newTasks, history);
      }
  };

  const handleReactivateTask = (id) => {
      const newTasks = tasks.map(t => t.id === id ? { ...t, status: 'active', deadline: getDefaultDeadline() } : t);
      setTasks(newTasks);
      saveDataToCloud(newTasks, history);
  };

  const deleteTask = (id) => {
      const newTasks = tasks.filter(t => t.id !== id);
      setTasks(newTasks);
      saveDataToCloud(newTasks, history);
  };

  const exportData = () => { /* Export Logic */ };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // --- Render Functions ---
  const renderTaskManagement = () => {
      const activeTasks = tasks.filter(t => t.status !== 'archived');
      const archivedTasks = tasks.filter(t => t.status === 'archived');
      const groupedTasks = activeTasks.reduce((acc, task) => {
          const proj = task.project || 'Default';
          const grp = task.group || 'General';
          if (!acc[proj]) acc[proj] = {};
          if (!acc[proj][grp]) acc[proj][grp] = [];
          acc[proj][grp].push(task);
          return acc;
      }, {});

      return (
          <div className="space-y-8 animate-fade-in pb-20">
              <h2 className="text-xl font-bold text-gray-900 px-2">项目概览</h2>
              {Object.entries(groupedTasks).map(([project, groups]) => (
                  <div key={project} className="space-y-3">
                      <div className="flex items-center justify-between px-2 cursor-pointer hover:bg-gray-50 rounded-lg py-1">
                          <h3 className={`text-lg font-bold text-indigo-900 flex items-center gap-2 transition-all ${hideTitles ? 'blur-sm select-none' : ''}`}>
                              <Layers size={18} /> {hideTitles ? '******' : project}
                          </h3>
                          <ChevronUp size={16}/>
                      </div>
                      {Object.entries(groups).map(([groupName, groupTasks]) => (
                          <div key={groupName} className="pl-4 border-l-2 border-indigo-100 ml-2">
                              <h4 className={`text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 transition-all ${hideTitles ? 'blur-sm select-none' : ''}`}>
                                  {hideTitles ? '***' : groupName}
                              </h4>
                              <div className="space-y-2">
                                  {groupTasks.map(t => {
                                      const daysLeft = Math.ceil(((t.deadline || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24));
                                      const isExpired = daysLeft < 0;
                                      return (
                                          <div key={t.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                              <div className="overflow-hidden">
                                                  <h4 className={`font-bold text-gray-800 truncate transition-all ${hideTitles ? 'blur-sm select-none' : ''}`}>
                                                      {hideTitles ? 'Secret Task' : t.title}
                                                  </h4>
                                                  <p className="text-xs text-gray-400">{t.dailyGoal || "No goal set"}</p>
                                                  <div className="flex gap-2 text-[10px] mt-1">
                                                      <span className={`px-1.5 py-0.5 rounded ${isExpired ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{isExpired ? 'Expired' : `${daysLeft}d left`}</span>
                                                      <span className="text-gray-400">{Math.round(t.completedMinutes)} / {t.goalMinutes}m</span>
                                                  </div>
                                              </div>
                                              <div className="flex gap-1 shrink-0">
                                                  <button onClick={() => setEditingTask(t)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><Pencil size={14}/></button>
                                                  <button onClick={() => handleArchiveTask(t.id)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100" title="归档"><Archive size={14}/></button>
                                              </div>
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
              ))}
              {/* Archived Section Omitted for brevity */}
          </div>
      );
  };

  const renderCalendar = () => {
      // (Simplified Calendar logic)
      return <div className="text-center py-10 text-gray-400">历史记录模块</div>;
  };

  const renderDashboard = () => (
      <div className="space-y-4 animate-fade-in">
          {tasks.length === 0 && !isAddingTask && (
              <div className="text-center py-20 opacity-50">
                  <Sparkles className="mx-auto mb-4" size={48} />
                  <p>没有任务。开始你的第一个目标吧！</p>
              </div>
          )}
          {tasks.filter(t => t.status !== 'archived').map(task => (
              <SwipeableTaskItem key={task.id} task={task} onClick={handleTaskClick} onEdit={setEditingTask} onDelete={handleArchiveTask} hideTitle={hideTitles} />
          ))}
          {isAddingTask ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4">
                  <textarea autoFocus rows={2} placeholder="任务标题... (例如: 读书 45m #学习)" className="w-full bg-transparent outline-none text-base mb-2 font-bold font-mono" value={newTaskInput} onChange={(e) => setNewTaskInput(e.target.value)} />
                  {/* 🔥 New Goal Input in Add Mode */}
                  <div className="flex items-center gap-2 mb-4 text-gray-500 border-b border-gray-200 pb-1">
                      <Target size={14} />
                      <input type="text" placeholder="今日具体目标 (例如: 看完第3章)" className="w-full bg-transparent outline-none text-sm" value={newTaskGoal} onChange={(e) => setNewTaskGoal(e.target.value)} />
                  </div>
                  
                  <div className="flex gap-2 justify-between items-center">
                      <button onClick={generateSmartPlan} disabled={!newTaskInput.trim() || isGeneratingPlan} className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${!newTaskInput.trim() ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}>{isGeneratingPlan ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} 智能导入</button>
                      <div className="flex gap-2">
                        <button onClick={() => setIsAddingTask(false)} className="px-3 py-2 text-gray-500 text-xs font-bold">取消</button>
                        <button onClick={addNewTask} className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold">添加</button>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="flex gap-2">
                  <button onClick={() => setIsAddingTask(true)} className="flex-1 py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"><Plus size={20} /> 添加任务</button>
                  {/* 🔥 Log Past Activity Button */}
                  <button onClick={() => setIsLoggingActivity(true)} className="w-16 border-2 border-dashed border-gray-200 rounded-2xl text-indigo-400 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-200 transition-colors" title="补录"><ClipboardList size={20} /></button>
              </div>
          )}
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex justify-center pb-20">
      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleUpdateTask} />}
      {isLoggingActivity && <LogActivityModal onClose={() => setIsLoggingActivity(false)} onLog={handleLogActivity} existingTasks={tasks} />}
      
      {activeTaskId && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
              <FocusParticleCanvas progress={0.5} />
              <div className="relative z-10 text-center text-white">
                  <h1 className={`text-4xl font-bold mb-8 transition-all ${hideTitles ? 'blur-md' : ''}`}>{hideTitles ? 'Current Task' : tasks.find(t=>t.id===activeTaskId)?.title}</h1>
                  <div className="text-8xl font-mono mb-4">
                      {(() => {
                          const task = tasks.find(t => t.id === activeTaskId);
                          if (!task) return "00:00";
                          const totalSeconds = (task.completedMinutes * 60) + timerSeconds;
                          return formatTime(totalSeconds);
                      })()}
                  </div>
                  <div className="text-white/50 text-sm mb-12 font-mono">
                      Current Session: {formatTime(timerSeconds)}
                  </div>
                  <button onClick={() => handleTaskClick(activeTaskId)} className="bg-white text-black p-6 rounded-full"><Pause size={32}/></button>
              </div>
          </div>
      )}
      
      {showSummary && (
        <div className="fixed inset-0 z-[60] bg-gray-900/90 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-gray-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-gray-700">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={32} /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Session Complete</h2>
                <p className="text-gray-400 mb-6">本次专注: <span className="text-white font-mono font-bold">{formatTime(lastSessionTime)}</span></p>
                <button onClick={handleSummaryConfirm} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">Done</button>
            </div>
        </div>
      )}

      <div className="w-full max-w-lg bg-white min-h-screen shadow-xl border-x border-gray-100 relative flex flex-col">
        {/* Header with User Profile and Eye Toggle */}
        <header className="px-6 pt-12 pb-4 bg-white sticky top-0 z-30 border-b border-gray-50">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
                        JumpStart <span className="text-blue-600">.</span>
                        <button onClick={() => setHideTitles(!hideTitles)} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
                            {hideTitles ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        {syncStatus === 'syncing' && <span className="text-xs text-blue-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> 同步中...</span>}
                        {syncStatus === 'synced' && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={10}/> 已同步</span>}
                        {syncStatus === 'offline' && <span className="text-xs text-gray-400 flex items-center gap-1"><CloudOff size={10}/> 离线</span>}
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {user && !user.isAnonymous ? (
                        <>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-gray-200" title={user.displayName} />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                                    {user.displayName ? user.displayName[0].toUpperCase() : <User size={16} />}
                                </div>
                            )}
                            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500"><LogOut size={20} /></button>
                        </>
                    ) : (
                        <button onClick={handleGoogleLogin} className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold hover:opacity-80">
                            <LogIn size={14} /> 登录
                        </button>
                    )}
                </div>
            </div>
            {viewMode === 'dashboard' && (
                <div onClick={handleAiAdvice} className={`mt-2 p-3 rounded-xl cursor-pointer transition-all duration-300 border ${isAiPanelOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                    <div className="flex items-start gap-3">
                        {isAiLoading ? <Loader2 size={18} className="mt-1 animate-spin" /> : <Brain size={18} className={`mt-1 ${isAiPanelOpen ? 'text-white' : 'text-indigo-600'}`} />}
                        <div className="flex-1"><p className="text-xs font-bold opacity-70 mb-0.5">{AI_CONFIG.useMockData ? 'AI 演示 (Mock)' : 'AI 教练 (Local)'}</p><p className="text-sm leading-relaxed">{aiMessage}</p></div>
                    </div>
                </div>
            )}
        </header>

        <main className="flex-1 px-6 py-6 overflow-y-auto">
            {viewMode === 'dashboard' && renderDashboard()}
            {viewMode === 'tasks' && renderTaskManagement()}
            {viewMode === 'calendar' && renderCalendar()} 
        </main>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around items-center z-40 pb-6">
            <button onClick={() => setViewMode('dashboard')} className={`flex flex-col items-center gap-1 ${viewMode === 'dashboard' ? 'text-black' : 'text-gray-400'}`}><LayoutList size={24} /><span className="text-[10px] font-bold">专注</span></button>
            <button onClick={() => setViewMode('tasks')} className={`flex flex-col items-center gap-1 ${viewMode === 'tasks' ? 'text-black' : 'text-gray-400'}`}><Layers size={24} /><span className="text-[10px] font-bold">管理</span></button>
            <button onClick={() => setViewMode('calendar')} className={`flex flex-col items-center gap-1 ${viewMode === 'calendar' ? 'text-black' : 'text-gray-400'}`}><CalendarIcon size={24} /><span className="text-[10px] font-bold">历史</span></button>
        </div>
      </div>
    </div>
  );
}
