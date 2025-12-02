import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Trash2, Brain, CheckCircle, ChevronRight, ChevronLeft, Shuffle, Coffee, Sparkles, Loader2, Calendar as CalendarIcon, ArrowLeft, Pencil, X, Download, LogIn, LogOut, User, Cloud, LayoutList, Timer, Archive, Clock, Layers, ChevronDown, ChevronUp, Server } from 'lucide-react';

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

// --- 🔥 LLM Configuration---
const AI_CONFIG = {
    useMockData: true, 
    baseUrl: "http://localhost:11434/v1/chat/completions", 
    model: "llama3" 
};

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

// --- 🧠 Universal AI Caller (适配本地 LLM) ---
const callLocalLLM = async (systemPrompt, userPrompt, jsonMode = false) => {
  // 1. Mock Mode (当前演示用)
  if (AI_CONFIG.useMockData) {
      console.log("Mock AI Call:", userPrompt);
      await new Promise(r => setTimeout(r, 1500)); // 模拟网络延迟
      
      // 针对 "Generate Plan" 的模拟返回
      if (jsonMode) {
          return JSON.stringify({
              projectName: "Mock Project",
              tasks: [
                  { title: "Review Basics (Mock)", minutes: 30, group: "Phase 1", dayOffset: 0 },
                  { title: "Deep Dive (Mock)", minutes: 60, group: "Phase 1", dayOffset: 1 },
                  { title: "Practice (Mock)", minutes: 45, group: "Phase 2", dayOffset: 3 }
              ]
          });
      }
      return JSON.stringify({ advice: "Mock建议：回家记得打开 Mac Mini，真正的 Llama 正在等你唤醒！保持专注！" });
  }

  try {
    const response = await fetch(AI_CONFIG.baseUrl, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: jsonMode ? { type: "json_object" } : undefined 
      }),
    });

    if (!response.ok) throw new Error(`Local LLM Error: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error("Local LLM Connection Failed:", error);
    return null; // 让前端处理错误展示
  }
};

// 默认 90 天后过期
const getDefaultDeadline = (offsetDays = 90) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.getTime();
};

const INITIAL_TASKS = [
  { id: 1, title: 'LeetCode 算法刷题', goalMinutes: 60, completedMinutes: 0, color: 'bg-blue-500', status: 'active', createdAt: Date.now(), deadline: getDefaultDeadline(), group: 'Daily Routine', project: 'Default' },
];

// --- Sub-Component: Focus Hero ---
const FocusParticleCanvas = ({ progress }) => {
    const canvasRef = useRef(null);
    const warmGoldHex = '#F59E0B'; 
    const warmLightHex = '#FEF3C7'; 

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
        class Particle {
            constructor() { this.reset(); this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; }
            reset() {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.max(canvas.width, canvas.height) * 0.8;
                this.x = centerX + Math.cos(angle) * dist;
                this.y = centerY + Math.sin(angle) * dist;
                const speed = Math.random() * 1.5 + 0.2 + (progress * 1.5); 
                this.vx = (centerX - this.x) * 0.0008 * speed;
                this.vy = (centerY - this.y) * 0.0008 * speed;
                this.size = Math.random() * 2.5;
                this.life = 0;
                this.maxLife = 300 + Math.random() * 100;
                this.alpha = 0;
            }
            update() {
                this.x += this.vx; this.y += this.vy; this.life++;
                if (this.life < 80) this.alpha = this.life / 80; else this.alpha = 1 - (this.life - 80) / (this.maxLife - 80);
                this.vx *= 1.005; this.vy *= 1.005;
                if (Math.sqrt((centerX - this.x)**2 + (centerY - this.y)**2) < 15 || this.life > this.maxLife) this.reset();
            }
            draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = warmGoldHex; ctx.globalAlpha = this.alpha * 0.7; ctx.fill(); }
        }
        const particleCount = 60 + Math.floor(progress * 120);
        for (let i = 0; i < particleCount; i++) particles.push(new Particle());
        let time = 0;
        const render = () => {
            time++;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'lighter';
            particles.forEach(p => { p.update(); p.draw(); });
            const pulse = Math.sin(time * 0.02) * 8; 
            const baseRadius = 30 + (progress * 120);
            const actualRadius = Math.max(15, baseRadius + pulse);
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, actualRadius * 2.5);
            gradient.addColorStop(0, warmGoldHex); gradient.addColorStop(0.3, 'rgba(245, 158, 11, 0.3)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(centerX, centerY, actualRadius * 2.5, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.globalAlpha = 0.6; ctx.fill();
            ctx.beginPath(); ctx.arc(centerX, centerY, actualRadius * 0.4, 0, Math.PI * 2); ctx.fillStyle = warmLightHex; ctx.globalAlpha = 0.9; ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
    }, [progress]);
    return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};

// --- Sub-Component: Edit Modal ---
const EditTaskModal = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title);
    const [minutes, setMinutes] = useState(task.goalMinutes);
    const [group, setGroup] = useState(task.group || 'General');
    const [deadlineDate, setDeadlineDate] = useState(() => {
        const d = new Date(task.deadline || Date.now());
        return d.toISOString().split('T')[0];
    });
    const handleSave = () => {
        const newDeadline = new Date(deadlineDate).getTime();
        onSave(task.id, { title, goalMinutes: parseInt(minutes), deadline: newDeadline, group });
        onClose();
    };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900">调整任务</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div><label className="block text-sm font-medium text-gray-500 mb-1">任务名称</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"/></div>
                <div><label className="block text-sm font-medium text-gray-500 mb-1">分组 / 阶段</label><input type="text" value={group} onChange={(e) => setGroup(e.target.value)} className="w-full text-base border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-500 mb-1">每日目标 (分)</label><input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-full text-lg font-mono font-bold text-indigo-600 border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-1 bg-transparent"/></div>
                    <div><label className="block text-sm font-medium text-gray-500 mb-1">计划截止日</label><input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className="w-full text-sm font-medium text-gray-700 border-b-2 border-gray-200 focus:border-black outline-none py-2 bg-transparent"/></div>
                </div>
                <div className="pt-4 flex gap-3"><button onClick={handleSave} className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">保存修改</button></div>
            </div>
        </div>
    );
};

// --- Sub-Component: Task List Item ---
const SwipeableTaskItem = ({ task, onClick, onDelete, onEdit }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const SNAP_THRESHOLD = -40;
    const MAX_SWIPE = -80;
    const onTouchStart = (e) => { startX.current = e.touches[0].clientX; setIsDragging(true); };
    const onTouchMove = (e) => {
        if (!isDragging) return;
        const diff = e.touches[0].clientX - startX.current;
        if (diff < 0 && diff > -120) setOffsetX(diff); else if (diff > 0 && offsetX < 0) setOffsetX(Math.min(0, MAX_SWIPE + diff));
    };
    const onTouchEnd = () => { setIsDragging(false); setOffsetX(offsetX < SNAP_THRESHOLD ? MAX_SWIPE : 0); };
    const progress = Math.min((task.completedMinutes / task.goalMinutes) * 100, 100);
    const isDone = progress >= 100;
    const daysLeft = Math.ceil(((task.deadline || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24));
    const isExpired = daysLeft < 0;
    return (
        <div className="relative w-full mb-4 select-none overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-2xl"><Trash2 className="text-white animate-pulse" size={24} /></div>
            <div className="absolute inset-0 bg-white rounded-2xl border border-gray-100 flex flex-col justify-between transition-transform duration-300 ease-out will-change-transform z-10"
                style={{ transform: `translateX(${offsetX}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={() => offsetX < -10 ? setOffsetX(0) : onClick(task.id)}>
                <div className="flex justify-between items-center p-5 h-full relative z-20">
                    <div className="flex-1 pr-4">
                        <div className="flex flex-col gap-1">
                            <h3 className={`font-bold text-lg leading-tight ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</h3>
                            {task.project && task.project !== 'Default' && (<span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">{task.project} • {task.group}</span>)}
                        </div>
                        <div className="flex items-center gap-3 text-xs mt-2">
                            <span className="text-gray-400 font-mono">{Math.round(task.completedMinutes)} / {task.goalMinutes} min</span>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1 -ml-1 text-gray-300 hover:text-indigo-600 transition-colors"><Pencil size={12} /></button>
                        </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${task.color} text-white shrink-0`}><Play fill="currentColor" size={16} className="ml-0.5" /></div>
                </div>
                <div className="absolute bottom-0 left-0 h-1.5 bg-gray-100 w-full overflow-hidden rounded-b-2xl"><div className="h-full bg-green-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="h-24"></div>
            {offsetX === MAX_SWIPE && (<button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="absolute top-0 right-0 bottom-0 w-20 cursor-pointer z-10" />)}
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
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("AI 助手就绪...");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [lastSessionTime, setLastSessionTime] = useState(0);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
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
        console.warn("Auth disabled in preview or failed. Running offline.", e);
        setSyncStatus('offline');
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          setSyncStatus('synced');
          if (currentUser.isAnonymous) setAiMessage("访客模式 | 本地 AI 就绪");
          else setAiMessage(`欢迎, ${currentUser.displayName || 'Engineer'}。`);
      } else setSyncStatus('offline');
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Data Sync ---
  useEffect(() => {
    if (!user || !db) {
        const savedTasks = localStorage.getItem('jumpstart_tasks');
        const savedHistory = localStorage.getItem('jumpstart_history');
        if (savedTasks) {
            const parsed = JSON.parse(savedTasks);
            const migrated = parsed.map(t => ({ ...t, status: t.status || 'active', createdAt: t.createdAt || Date.now(), deadline: t.deadline || getDefaultDeadline(), group: t.group || 'Daily', project: t.project || 'Default' }));
            setTasks(migrated);
        }
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        return;
    }
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
    const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.tasks) setTasks(data.tasks);
            if (data.history) setHistory(data.history);
        }
    });
    return () => unsubscribeSnapshot();
  }, [user]);

  // --- 3. Save Logic ---
  const saveDataToCloud = useCallback(async (newTasks, newHistory) => {
      if (!user || !db) {
          localStorage.setItem('jumpstart_tasks', JSON.stringify(newTasks));
          localStorage.setItem('jumpstart_history', JSON.stringify(newHistory));
          return;
      }
      setSyncStatus('saving');
      try {
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
        await setDoc(userDocRef, { tasks: newTasks, history: newHistory, lastUpdated: new Date().toISOString() }, { merge: true });
        setSyncStatus('synced');
      } catch (e) { console.error("Save failed", e); setSyncStatus('offline'); }
  }, [user]);

  // --- Handlers ---
  const handleGoogleLogin = async () => { if (!auth) return; try { const provider = new GoogleAuthProvider(); await signInWithPopup(auth, provider); } catch (error) { alert("Login failed (Preview mode restriction): " + error.message); } };
  const handleLogout = async () => { if (!auth) return; await signOut(auth); setTasks(INITIAL_TASKS); setHistory({}); };

  useEffect(() => {
    if (activeTaskId) {
      startTimeRef.current = Date.now() - (timerSeconds * 1000);
      timerRef.current = setInterval(() => { setTimerSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000)); }, 1000);
    } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [activeTaskId]);

  // --- Core AI Logic (Modified for Local) ---
  const handleAiAdvice = async () => {
    if (isAiLoading) return;
    setIsAiPanelOpen(true);
    setIsAiLoading(true);
    setAiMessage("请求本地神经网络...");
    const activeTasks = tasks.filter(t => t.status === 'active');
    const systemPrompt = `You are a strict technical coach. User is an engineer. Give 1 short sentence advice.`;
    const userPrompt = `Tasks: ${JSON.stringify(activeTasks.map(t => ({ title: t.title, done: t.completedMinutes })))}. Time: ${new Date().toLocaleTimeString()}`;
    
    const result = await callLocalLLM(systemPrompt, userPrompt, true); // JSON mode enabled for structure parsing test
    
    if (result) { 
        try { 
            const parsed = JSON.parse(result); 
            setAiMessage(parsed.advice || result); 
        } catch (e) { setAiMessage(result); } 
    } else { 
        setAiMessage(AI_CONFIG.useMockData ? "本地模型未连接 (Mock模式)" : "连接超时，请检查 Mac Mini"); 
    }
    setIsAiLoading(false);
  };

  const generateSmartPlan = async () => {
    if (!newTaskInput.trim()) return;
    setIsGeneratingPlan(true);

    const isBulkImport = newTaskInput.length > 50 || newTaskInput.includes('\n');
    let systemPrompt = `You are a Project Manager. Return STRICT JSON: { "projectName": "Name", "tasks": [{ "title": "Task", "minutes": 30, "group": "Phase 1", "dayOffset": 0 }] }`;
    let userPrompt = `Goal: "${newTaskInput}"`;

    if (isBulkImport) {
        systemPrompt = `You are an elite technical Project Manager. Analyze the plan. 
        Extract Project Name. Break content into tasks. Parse durations (default 45). Group by week/phase. Estimate dayOffset (Week 1=0, Week 2=7).
        Return STRICT JSON: { "projectName": "Name", "tasks": [{ "title": "Task", "minutes": 30, "group": "Week 1", "dayOffset": 0 }] }`;
        userPrompt = `Raw Plan:\n${newTaskInput}`;
    }

    const result = await callLocalLLM(systemPrompt, userPrompt, true);

    if (result) {
      try {
        const parsed = JSON.parse(result);
        const projectName = parsed.projectName || "New Project";
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
            const createdTasks = parsed.tasks.map((item, index) => {
                const colorMap = ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                return {
                    id: Date.now() + index,
                    title: item.title,
                    goalMinutes: item.minutes,
                    completedMinutes: 0,
                    color: colorMap[Math.floor(Math.random() * colorMap.length)],
                    status: 'active',
                    createdAt: Date.now(),
                    deadline: getDefaultDeadline(item.dayOffset ? item.dayOffset + 7 : 7),
                    group: item.group || 'General',
                    project: projectName
                };
            });
            const updatedTasks = [...tasks, ...createdTasks];
            setTasks(updatedTasks);
            saveDataToCloud(updatedTasks, history);
            setNewTaskInput('');
            setIsAddingTask(false);
            alert(`已导入: ${projectName} (${createdTasks.length} 任务)`);
        }
      } catch (e) { console.error(e); alert("解析失败，请检查格式或本地模型输出。"); }
    } else {
        alert("无法连接本地模型。请检查配置。");
    }
    setIsGeneratingPlan(false);
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTaskClick = (taskId) => {
      if (activeTaskId === taskId) {
          const sessionSecs = timerSeconds;
          saveSession(taskId, sessionSecs);
          setLastSessionTime(sessionSecs);
          setActiveTaskId(null);
          setShowSummary(true);
      } else {
          if (activeTaskId) saveSession(activeTaskId, timerSeconds);
          setTimerSeconds(0);
          setActiveTaskId(taskId);
      }
  };

  const saveSession = (taskId, seconds) => {
    if (seconds < 5) return;
    const minutesToAdd = seconds / 60;
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, completedMinutes: t.completedMinutes + minutesToAdd } : t);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const today = new Date().toISOString().split('T')[0];
    const dayRecords = history[today] || [];
    const newHistory = { ...history, [today]: [...dayRecords, { taskId, title: task.title, minutes: minutesToAdd, timestamp: Date.now(), color: task.color }] };
    setTasks(newTasks);
    setHistory(newHistory);
    saveDataToCloud(newTasks, newHistory);
  };

  const handleUpdateTask = (id, updates) => {
      const newTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
      setTasks(newTasks);
      saveDataToCloud(newTasks, history);
      setEditingTask(null);
  };

  const addNewTask = () => {
    if (!newTaskInput.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskInput,
      goalMinutes: 30,
      completedMinutes: 0,
      color: 'bg-slate-500',
      status: 'active',
      createdAt: Date.now(),
      deadline: getDefaultDeadline(),
      group: 'General',
      project: 'Manual'
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveDataToCloud(newTasks, history);
    setNewTaskInput('');
    setIsAddingTask(false);
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
    if (confirm('彻底删除该任务？')) {
        const newTasks = tasks.filter(t => t.id !== id);
        setTasks(newTasks);
        saveDataToCloud(newTasks, history);
    }
  };

  const exportData = () => {
      const dataStr = JSON.stringify({ tasks, history }, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jumpstart_backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const TaskManagementView = () => {
      const [collapsedProjects, setCollapsedProjects] = useState({});
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
      const toggleProject = (proj) => setCollapsedProjects(prev => ({...prev, [proj]: !prev[proj]}));

      return (
          <div className="space-y-8 animate-fade-in pb-20">
              <h2 className="text-xl font-bold text-gray-900 px-2">项目概览</h2>
              {Object.entries(groupedTasks).map(([project, groups]) => (
                  <div key={project} className="space-y-3">
                      <div onClick={() => toggleProject(project)} className="flex items-center justify-between px-2 cursor-pointer hover:bg-gray-50 rounded-lg py-1">
                          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><Layers size={18} /> {project}</h3>
                          {collapsedProjects[project] ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
                      </div>
                      {!collapsedProjects[project] && Object.entries(groups).map(([groupName, groupTasks]) => (
                          <div key={groupName} className="pl-4 border-l-2 border-indigo-100 ml-2">
                              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">{groupName}</h4>
                              <div className="space-y-2">
                                  {groupTasks.map(t => {
                                      const daysLeft = Math.ceil(((t.deadline || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24));
                                      const isExpired = daysLeft < 0;
                                      return (
                                          <div key={t.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                              <div className="overflow-hidden">
                                                  <h4 className="font-bold text-gray-800 truncate">{t.title}</h4>
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
              {archivedTasks.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-dashed border-gray-200">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2 flex items-center gap-2 mb-4"><Archive size={14} /> 归档箱 ({archivedTasks.length})</h3>
                      <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                          {archivedTasks.map(t => (
                              <div key={t.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                  <span className="font-medium text-gray-500 line-through text-sm">{t.title}</span>
                                  <button onClick={() => handleReactivateTask(t.id)} className="text-indigo-600 text-xs font-bold hover:underline">恢复</button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )
  };

  const CalendarView = () => {
      const [currentDate, setCurrentDate] = useState(new Date());
      const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const changeMonth = (delta) => setCurrentDate(new Date(year, month + delta, 1));
      const selectedDayData = history[selectedDate] || [];
      const totalMinutes = selectedDayData.reduce((acc, curr) => acc + curr.minutes, 0);
      const aggregated = selectedDayData.reduce((acc, curr) => { if (!acc[curr.title]) acc[curr.title] = { minutes: 0, color: curr.color }; acc[curr.title].minutes += curr.minutes; return acc; }, {});
      return (
          <div className="animate-fade-in pb-20">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">历史回顾</h2>
                  <button onClick={exportData} className="p-2 text-gray-400 hover:text-indigo-600" title="导出"><Download size={20}/></button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                  <div className="flex justify-between items-center mb-4">
                      <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                      <h3 className="font-bold text-lg">{year}年 {month + 1}月</h3>
                      <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-xs text-gray-400 py-2">{d}</div>)}
                      {Array(firstDay).fill(null).concat([...Array(daysInMonth).keys()].map(i => i + 1)).map((day, i) => {
                          if (!day) return <div key={i}></div>;
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayMins = (history[dateStr] || []).reduce((a, c) => a + c.minutes, 0);
                          const isSel = dateStr === selectedDate;
                          return (<div key={i} onClick={() => setSelectedDate(dateStr)} className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium cursor-pointer transition-all ${isSel ? 'bg-gray-900 text-white' : dayMins > 0 ? 'bg-green-100 text-green-800' : 'text-gray-700'}`}>{day}</div>)
                      })}
                  </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="mb-4"><p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{selectedDate}</p><h3 className="text-2xl font-bold text-gray-800">{Math.round(totalMinutes)} <span className="text-base font-normal text-gray-500">分钟专注</span></h3></div>
                  {Object.keys(aggregated).length === 0 ? <div className="text-center py-4 text-gray-400 text-sm">无记录</div> : <div className="space-y-3">{Object.entries(aggregated).map(([title, data]) => (<div key={title} className="flex items-center gap-3 border-b border-gray-50 pb-2 last:border-0"><div className={`w-2 h-2 rounded-full ${data.color}`}></div><div className="flex-1 flex justify-between"><span className="text-gray-700">{title}</span><span className="text-gray-900 font-mono">{Math.round(data.minutes)}m</span></div></div>))}</div>}
              </div>
          </div>
      );
  };

  if (activeTaskId) {
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const progress = Math.min(1, (activeTask.completedMinutes + timerSeconds / 60) / activeTask.goalMinutes);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-colors duration-1000 overflow-hidden">
        <FocusParticleCanvas progress={progress} />
        <div className="relative z-10 text-center space-y-8 animate-fade-in px-6 w-full max-w-md">
          <div className="inline-block p-4 rounded-full bg-white/10 mb-4 backdrop-blur-md border border-white/10"><Brain size={48} className="text-amber-100 opacity-90 animate-pulse" /></div>
          <h2 className="text-xl font-medium text-amber-100/60 tracking-widest uppercase">Now Focusing</h2>
          <h1 className="text-3xl md:text-5xl font-bold text-amber-50 tracking-tight drop-shadow-2xl">{activeTask?.title}</h1>
          <div className="text-7xl md:text-9xl font-mono font-bold text-amber-50 tracking-wider my-8 tabular-nums drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">{formatTime(timerSeconds)}</div>
          <button onClick={() => handleTaskClick(activeTaskId)} className="mt-16 w-20 h-20 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all duration-300 mx-auto group"><Pause fill="currentColor" className="opacity-80 group-hover:opacity-100 text-amber-100" size={32} /></button>
        </div>
      </div>
    );
  }

  if (showSummary) {
      return (
        <div className="min-h-screen bg-gray-900/90 flex items-center justify-center p-6 z-50 relative">
            <div className="bg-gray-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-gray-700 animate-fade-in">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={32} /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Session Complete</h2>
                <p className="text-gray-400 mb-6">已记录: <span className="text-white font-mono font-bold">{formatTime(lastSessionTime)}</span></p>
                <button onClick={handleSummaryConfirm} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">Done</button>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex justify-center pb-20">
      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleUpdateTask} />}
      <div className="w-full max-w-lg bg-white min-h-screen shadow-xl border-x border-gray-100 relative flex flex-col">
        <header className="px-6 pt-12 pb-4 bg-white sticky top-0 z-30 border-b border-gray-50">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">JumpStart <span className="text-blue-600">.</span></h1>
                    <div className="flex items-center gap-2 mt-1">
                        {user && !user.isAnonymous ? (<span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><Cloud size={10} /> 已同步</span>) : (<span className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><User size={10} /> 访客 | {AI_CONFIG.useMockData ? 'Local Mock' : 'Local AI'}</span>)}
                        {syncStatus === 'saving' && <span className="text-xs text-gray-400 animate-pulse">保存中...</span>}
                    </div>
                </div>
                <div className="flex gap-2">
                    {user && !user.isAnonymous ? (<button onClick={handleLogout} className="p-2 bg-red-50 hover:bg-red-100 rounded-full transition-colors text-red-500" title="登出"><LogOut size={20} /></button>) : (<button onClick={handleGoogleLogin} className="p-2 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors text-blue-600" title="Google 登录"><LogIn size={20} /></button>)}
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
            {viewMode === 'dashboard' && (
                <div className="space-y-4 animate-fade-in">
                    {tasks.filter(t => t.status !== 'archived').map(task => (<SwipeableTaskItem key={task.id} task={task} onClick={handleTaskClick} onEdit={setEditingTask} onDelete={handleArchiveTask} />))}
                    {isAddingTask ? (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 animate-fade-in">
                            <textarea autoFocus rows={4} placeholder="粘贴你的学习计划，或输入单个任务..." className="w-full bg-transparent outline-none text-base mb-4 text-gray-800 placeholder-gray-400 resize-none font-mono leading-relaxed" value={newTaskInput} onChange={(e) => setNewTaskInput(e.target.value)} />
                            <div className="flex gap-2 justify-between items-center">
                                <button onClick={generateSmartPlan} disabled={!newTaskInput.trim() || isGeneratingPlan} className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${!newTaskInput.trim() ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}>{isGeneratingPlan ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} 智能导入 / 拆解</button>
                                <div className="flex gap-2"><button onClick={() => setIsAddingTask(false)} className="px-3 py-2 text-gray-500 text-xs font-bold">取消</button><button onClick={addNewTask} className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold">手动添加</button></div>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsAddingTask(true)} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-colors"><Plus size={20} /> 添加 / 导入计划</button>
                    )}
                </div>
            )}
            {viewMode === 'tasks' && <TaskManagementView />}
            {viewMode === 'calendar' && <CalendarView />}
        </main>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around items-center z-40 pb-6">
            <button onClick={() => setViewMode('dashboard')} className={`flex flex-col items-center gap-1 transition-colors ${viewMode === 'dashboard' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}><LayoutList size={24} strokeWidth={viewMode === 'dashboard' ? 2.5 : 2} /><span className="text-[10px] font-bold">专注</span></button>
            <button onClick={() => setViewMode('tasks')} className={`flex flex-col items-center gap-1 transition-colors ${viewMode === 'tasks' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}><Layers size={24} strokeWidth={viewMode === 'tasks' ? 2.5 : 2} /><span className="text-[10px] font-bold">管理</span></button>
            <button onClick={() => setViewMode('calendar')} className={`flex flex-col items-center gap-1 transition-colors ${viewMode === 'calendar' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}><CalendarIcon size={24} strokeWidth={viewMode === 'calendar' ? 2.5 : 2} /><span className="text-[10px] font-bold">历史</span></button>
        </div>
      </div>
    </div>
  );
}
