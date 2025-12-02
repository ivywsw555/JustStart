import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Trash2, Brain, CheckCircle, ChevronRight, ChevronLeft, Shuffle, Coffee, Sparkles, Loader2, Calendar as CalendarIcon, ArrowLeft, Pencil, X, Download, LogIn, LogOut, User, Cloud, CloudOff } from 'lucide-react';

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

// --- Configuration ---
const apiKey = ""; // Gemini API Key (System Injected)
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

// Initialize Firebase (Safely handle environment)
const getFirebaseConfig = () => {
  try {
    // __firebase_config is injected by the preview environment
    return typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  } catch (e) {
    return {};
  }
};

const firebaseConfig = getFirebaseConfig();
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Gemini API ---
const callGemini = async (prompt, systemInstruction = "") => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );
    if (!response.ok) throw new Error(`API call failed: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

const INITIAL_TASKS = [
  { id: 1, title: 'LeetCode 算法刷题', goalMinutes: 60, completedMinutes: 0, color: 'bg-blue-500' },
  { id: 2, title: '系统设计学习', goalMinutes: 45, completedMinutes: 0, color: 'bg-indigo-500' },
  { id: 3, title: '英语口语练习', goalMinutes: 30, completedMinutes: 0, color: 'bg-emerald-500' },
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
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const particles = [];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        class Particle {
            constructor() {
                this.reset();
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
            }

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
                this.x += this.vx;
                this.y += this.vy;
                this.life++;
                if (this.life < 80) this.alpha = this.life / 80;
                else this.alpha = 1 - (this.life - 80) / (this.maxLife - 80);
                this.vx *= 1.005;
                this.vy *= 1.005;
                if (Math.sqrt((centerX - this.x)**2 + (centerY - this.y)**2) < 15 || this.life > this.maxLife) this.reset();
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = warmGoldHex;
                ctx.globalAlpha = this.alpha * 0.7;
                ctx.fill();
            }
        }

        const particleCount = 60 + Math.floor(progress * 120);
        for (let i = 0; i < particleCount; i++) particles.push(new Particle());

        let time = 0;
        const render = () => {
            time++;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'lighter';
            particles.forEach(p => { p.update(); p.draw(); });

            const pulse = Math.sin(time * 0.02) * 8; 
            const baseRadius = 30 + (progress * 120);
            const actualRadius = Math.max(15, baseRadius + pulse);

            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, actualRadius * 2.5);
            gradient.addColorStop(0, warmGoldHex); 
            gradient.addColorStop(0.3, 'rgba(245, 158, 11, 0.3)'); 
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.beginPath();
            ctx.arc(centerX, centerY, actualRadius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.6;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(centerX, centerY, actualRadius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = warmLightHex;
            ctx.globalAlpha = 0.9;
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [progress]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};

// --- Sub-Component: Edit Modal ---
const EditTaskModal = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title);
    const [minutes, setMinutes] = useState(task.goalMinutes);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900">调整计划</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">任务名称</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">每日目标 (分钟)</label>
                    <div className="flex items-center gap-4">
                        <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-24 text-3xl font-mono font-bold text-indigo-600 border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-1 bg-transparent"/>
                        <span className="text-gray-400">min</span>
                    </div>
                </div>
                <div className="pt-4 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors">取消</button>
                    <button onClick={() => { onSave(task.id, title, parseInt(minutes)); onClose(); }} className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">保存修改</button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Component: Swipeable Task Item ---
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
        if (diff < 0 && diff > -120) setOffsetX(diff);
        else if (diff > 0 && offsetX < 0) setOffsetX(Math.min(0, MAX_SWIPE + diff));
    };
    const onTouchEnd = () => {
        setIsDragging(false);
        setOffsetX(offsetX < SNAP_THRESHOLD ? MAX_SWIPE : 0);
    };

    const progress = Math.min((task.completedMinutes / task.goalMinutes) * 100, 100);
    const isDone = progress >= 100;

    return (
        <div className="relative w-full mb-4 select-none overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-2xl">
                <Trash2 className="text-white animate-pulse" size={24} />
            </div>
            <div 
                className="absolute inset-0 bg-white rounded-2xl border border-gray-100 flex flex-col justify-between transition-transform duration-300 ease-out will-change-transform z-10"
                style={{ transform: `translateX(${offsetX}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                onClick={() => offsetX < -10 ? setOffsetX(0) : onClick(task.id)}
            >
                <div className="flex justify-between items-center p-5 h-full relative z-20">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-lg ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</h3>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1 text-gray-300 hover:text-indigo-600 transition-colors"><Pencil size={14} /></button>
                        </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${task.color} text-white shrink-0`}>
                        <Play fill="currentColor" size={16} className="ml-0.5" />
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 h-1.5 bg-gray-100 w-full overflow-hidden rounded-b-2xl">
                    <div className="h-full bg-green-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <div className="h-24"></div>
            {offsetX === MAX_SWIPE && (
                 <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="absolute top-0 right-0 bottom-0 w-20 cursor-pointer z-10" />
            )}
        </div>
    );
};

export default function JumpStart() {
  // --- Data State ---
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [history, setHistory] = useState({});
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('offline'); // 'offline' | 'synced' | 'saving'

  // --- UI State ---
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [viewMode, setViewMode] = useState('dashboard');
  const [editingTask, setEditingTask] = useState(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("登录后，数据将自动同步到云端...");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [lastSessionTime, setLastSessionTime] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // --- 1. Auth & Initial Load ---
  useEffect(() => {
    if (!auth) return;

    // Handle initial auth for preview environment (System requirement)
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        // Fallback for demo if no google account linked yet
        await signInAnonymously(auth); 
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          setSyncStatus('synced');
          if (currentUser.isAnonymous) {
              setAiMessage("当前为访客模式，数据仅保存在此设备。点击右上角登录以永久保存。");
          } else {
              setAiMessage(`欢迎回来，${currentUser.displayName || '奋斗者'}。数据已同步。`);
          }
      } else {
          setSyncStatus('offline');
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 2. Data Sync (Firestore Listener) ---
  useEffect(() => {
    if (!user || !db) {
        // Fallback to local storage if offline/no firebase
        const savedTasks = localStorage.getItem('jumpstart_tasks');
        const savedHistory = localStorage.getItem('jumpstart_history');
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        return;
    }

    // Real-time listener from Firestore
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
    const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Merge strategy: Server wins. 
            // In a real app, you might want more complex merging.
            if (data.tasks) setTasks(data.tasks);
            if (data.history) setHistory(data.history);
        } else {
            // New user on cloud, maybe upload local data?
            // For now, we just keep initial state or local state.
        }
    }, (error) => {
        console.error("Sync error:", error);
        setSyncStatus('offline');
    });

    return () => unsubscribeSnapshot();
  }, [user]);

  // --- 3. Save Logic (Debounced Write) ---
  const saveDataToCloud = useCallback(async (newTasks, newHistory) => {
      if (!user || !db) {
          // Fallback Local Save
          localStorage.setItem('jumpstart_tasks', JSON.stringify(newTasks));
          localStorage.setItem('jumpstart_history', JSON.stringify(newHistory));
          return;
      }

      setSyncStatus('saving');
      try {
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'main');
        await setDoc(userDocRef, {
            tasks: newTasks,
            history: newHistory,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        setSyncStatus('synced');
      } catch (e) {
        console.error("Save failed", e);
        setSyncStatus('offline');
      }
  }, [user]);

  // --- Login / Logout Handlers ---
  const handleGoogleLogin = async () => {
      if (!auth) return;
      try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
          // onAuthStateChanged will handle the rest
      } catch (error) {
          console.error("Login failed", error);
          alert("登录失败: " + error.message + "\n(注意：在预览环境中，Google登录可能因域名限制无法弹出。部署后即可正常使用。)");
      }
  };

  const handleLogout = async () => {
      if (!auth) return;
      try {
          await signOut(auth);
          // Optionally revert to anonymous?
          // For simplicity, we just sign out.
          setTasks(INITIAL_TASKS);
          setHistory({});
      } catch (error) {
          console.error("Logout error", error);
      }
  };

  // --- Timer Logic ---
  useEffect(() => {
    if (activeTaskId) {
      startTimeRef.current = Date.now() - (timerSeconds * 1000);
      timerRef.current = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeTaskId]);

  // --- Gemini Functions ---
  const handleAiAdvice = async () => {
    if (isAiLoading) return;
    setIsAiPanelOpen(true);
    setIsAiLoading(true);
    setAiMessage("AI 正在分析您的云端数据...");

    const prompt = JSON.stringify({
      currentTasks: tasks.map(t => ({ title: t.title, goal: t.goalMinutes, done: Math.round(t.completedMinutes) })),
      currentTime: new Date().toLocaleTimeString()
    });
    const systemPrompt = `你是一个严格但幽默的职场教练。用户正在为跳槽做准备。请根据用户的任务列表和进度，给出一条简短、有力、具体的建议（20-40字）。`;
    
    const result = await callGemini(prompt, systemPrompt);
    if (result) {
        try { const parsed = JSON.parse(result); setAiMessage(parsed.advice); } 
        catch (e) { setAiMessage(result.substring(0, 100)); } // Fallback if not JSON
    } else { setAiMessage("网络开小差了，建议你先做个简单的任务。"); }
    setIsAiLoading(false);
  };

  const generateSmartPlan = async () => {
    if (!newTaskTitle.trim()) return;
    setIsGeneratingPlan(true);
    const systemPrompt = `Project Manager AI. Break down goal into 2-4 tasks. Return JSON Array: [{ "title": "xx", "minutes": 30, "color": "bg-blue-500" }]`;
    const result = await callGemini(`Goal: "${newTaskTitle}"`, systemPrompt);

    if (result) {
      try {
        const newPlan = JSON.parse(result);
        if (Array.isArray(newPlan)) {
            const createdTasks = newPlan.map((item, index) => ({
                id: Date.now() + index,
                title: item.title,
                goalMinutes: item.minutes,
                completedMinutes: 0,
                color: item.color || 'bg-slate-500'
            }));
            const updatedTasks = [...tasks, ...createdTasks];
            setTasks(updatedTasks);
            saveDataToCloud(updatedTasks, history); // Save immediately
            setNewTaskTitle('');
            setIsAddingTask(false);
        }
      } catch (e) { alert("生成计划失败，请手动添加试试。"); }
    }
    setIsGeneratingPlan(false);
  };

  // --- Helpers ---
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // --- Core Logic ---
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
    
    // 1. Calculate new state
    const newTasks = tasks.map(t => {
      if (t.id === taskId) return { ...t, completedMinutes: t.completedMinutes + minutesToAdd };
      return t;
    });

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const today = getTodayString();
    
    const dayRecords = history[today] || [];
    const newHistory = {
        ...history,
        [today]: [...dayRecords, {
            taskId,
            title: task.title,
            minutes: minutesToAdd,
            timestamp: Date.now(),
            color: task.color
        }]
    };

    // 2. Set State
    setTasks(newTasks);
    setHistory(newHistory);

    // 3. Persist
    saveDataToCloud(newTasks, newHistory);
  };

  const handleUpdateTask = (id, newTitle, newMinutes) => {
      const newTasks = tasks.map(t => {
          if (t.id === id) return { ...t, title: newTitle, goalMinutes: newMinutes };
          return t;
      });
      setTasks(newTasks);
      saveDataToCloud(newTasks, history);
      setEditingTask(null);
  };

  const addNewTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle,
      goalMinutes: 30,
      completedMinutes: 0,
      color: 'bg-slate-500'
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveDataToCloud(newTasks, history);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const deleteTask = (id) => {
    if (confirm('确定要放弃这个提升计划吗？')) {
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
      a.download = `jumpstart_backup_${getTodayString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  // --- Calendar Component ---
  const CalendarView = () => {
      const [currentDate, setCurrentDate] = useState(new Date());
      const [selectedDate, setSelectedDate] = useState(getTodayString());

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(i);

      const changeMonth = (delta) => setCurrentDate(new Date(year, month + delta, 1));
      const getDayData = (day) => {
          if (!day) return null;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return { dateStr, records: history[dateStr] || [] };
      };

      const selectedDayData = history[selectedDate] || [];
      const totalMinutesSelected = selectedDayData.reduce((acc, curr) => acc + curr.minutes, 0);

      const aggregated = selectedDayData.reduce((acc, curr) => {
          if (!acc[curr.title]) acc[curr.title] = { minutes: 0, color: curr.color };
          acc[curr.title].minutes += curr.minutes;
          return acc;
      }, {});

      return (
          <div className="animate-fade-in pb-20">
              <div className="flex items-center justify-between mb-6 px-2">
                  <button onClick={() => setViewMode('dashboard')} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full flex items-center gap-1">
                      <ArrowLeft size={20} /> 返回
                  </button>
                  <h2 className="text-xl font-bold text-gray-800">历史回顾</h2>
                  <button onClick={exportData} className="p-2 text-gray-400 hover:text-indigo-600 rounded-full" title="导出备份">
                      <Download size={20} />
                  </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                  <div className="flex justify-between items-center mb-4">
                      <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                      <h3 className="font-bold text-lg">{year}年 {month + 1}月</h3>
                      <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                          <div key={d} className="text-xs text-gray-400 font-medium py-2">{d}</div>
                      ))}
                      {days.map((day, idx) => {
                          const data = getDayData(day);
                          const totalMins = data?.records?.reduce((acc, curr) => acc + curr.minutes, 0) || 0;
                          const isSelected = data?.dateStr === selectedDate;
                          
                          let bgClass = 'bg-transparent';
                          let textClass = 'text-gray-700';
                          if (day) {
                              if (isSelected) {
                                  bgClass = 'bg-gray-900 shadow-md ring-2 ring-offset-1 ring-gray-900';
                                  textClass = 'text-white';
                              } else if (totalMins > 0) bgClass = 'bg-green-100 text-green-800 font-bold';
                          }

                          return (
                              <div key={idx} onClick={() => day && setSelectedDate(data.dateStr)}
                                  className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium cursor-pointer transition-all ${bgClass} ${textClass}`}
                              >
                                  {day}
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex justify-between items-end mb-4">
                      <div>
                          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                              {selectedDate === getTodayString() ? '今天' : selectedDate}
                          </p>
                          <h3 className="text-2xl font-bold text-gray-800">
                              {Math.round(totalMinutesSelected)} <span className="text-base font-normal text-gray-500">分钟专注</span>
                          </h3>
                      </div>
                  </div>

                  {Object.keys(aggregated).length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">暂无记录</div>
                  ) : (
                      <div className="space-y-3">
                          {Object.entries(aggregated).map(([title, data]) => (
                              <div key={title} className="flex items-center gap-3 border-b border-gray-50 pb-2 last:border-0">
                                  <div className={`w-2 h-2 rounded-full ${data.color}`}></div>
                                  <div className="flex-1 flex justify-between">
                                      <span className="text-gray-700">{title}</span>
                                      <span className="text-gray-900 font-mono">{Math.round(data.minutes)}m</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      );
  };

  // --- Render ---
  // 1. Focus Mode
  if (activeTaskId) {
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const progress = Math.min(1, (activeTask.completedMinutes + timerSeconds / 60) / activeTask.goalMinutes);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-colors duration-1000 overflow-hidden">
        <FocusParticleCanvas progress={progress} />
        <div className="relative z-10 text-center space-y-8 animate-fade-in px-6 w-full max-w-md">
          <div className="inline-block p-4 rounded-full bg-white/10 mb-4 backdrop-blur-md border border-white/10">
             <Brain size={48} className="text-amber-100 opacity-90 animate-pulse" />
          </div>
          <h2 className="text-xl font-medium text-amber-100/60 tracking-widest uppercase">Now Focusing</h2>
          <h1 className="text-3xl md:text-5xl font-bold text-amber-50 tracking-tight drop-shadow-2xl">{activeTask?.title}</h1>
          <div className="text-7xl md:text-9xl font-mono font-bold text-amber-50 tracking-wider my-8 tabular-nums drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            {formatTime(timerSeconds)}
          </div>
          <button onClick={() => handleTaskClick(activeTaskId)} className="mt-16 w-20 h-20 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all duration-300 mx-auto group">
            <Pause fill="currentColor" className="opacity-80 group-hover:opacity-100 text-amber-100" size={32} />
          </button>
        </div>
      </div>
    );
  }

  // 2. Summary
  if (showSummary) {
      return (
        <div className="min-h-screen bg-gray-900/90 flex items-center justify-center p-6 z-50 relative">
            <div className="bg-gray-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-gray-700 animate-fade-in">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Session Complete</h2>
                <p className="text-gray-400 mb-6">已记录: <span className="text-white font-mono font-bold">{formatTime(lastSessionTime)}</span></p>
                <button onClick={handleSummaryConfirm} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">Done</button>
            </div>
        </div>
      )
  }

  // 3. Dashboard
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex justify-center">
      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleUpdateTask} />}
      
      <div className="w-full max-w-lg bg-white min-h-screen shadow-xl border-x border-gray-100 relative">
        <header 
            className={`
                px-6 pt-12 pb-6 bg-white z-30 transition-all duration-300
                ${viewMode === 'calendar' ? 'absolute -translate-y-full opacity-0 pointer-events-none' : 'sticky top-0 translate-y-0 opacity-100'}
            `}
        >
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">JumpStart <span className="text-blue-600">.</span></h1>
                    <div className="flex items-center gap-2 mt-1">
                        {user && !user.isAnonymous ? (
                             <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <Cloud size={10} /> 已同步
                             </span>
                        ) : (
                             <span className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                <User size={10} /> 访客
                             </span>
                        )}
                        {syncStatus === 'saving' && <span className="text-xs text-gray-400 animate-pulse">保存中...</span>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('calendar')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors tooltip" title="历史记录">
                        <CalendarIcon size={20} className="text-gray-600" />
                    </button>
                    {user && !user.isAnonymous ? (
                        <button onClick={handleLogout} className="p-2 bg-red-50 hover:bg-red-100 rounded-full transition-colors text-red-500" title="登出">
                            <LogOut size={20} />
                        </button>
                    ) : (
                        <button onClick={handleGoogleLogin} className="p-2 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors text-blue-600" title="Google 登录">
                            <LogIn size={20} />
                        </button>
                    )}
                </div>
            </div>
            
            <div onClick={handleAiAdvice} className={`mt-4 p-4 rounded-xl cursor-pointer transition-all duration-300 border ${isAiPanelOpen ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]' : 'bg-indigo-50 border-indigo-100 text-indigo-900 hover:bg-indigo-100'}`}>
                <div className="flex items-start gap-3">
                    {isAiLoading ? <Loader2 size={20} className="mt-1 animate-spin" /> : <Brain size={20} className={`mt-1 ${isAiPanelOpen ? 'text-white' : 'text-indigo-600'}`} />}
                    <div className="flex-1">
                        <h3 className="font-bold text-sm mb-1">AI 每日教练 ✨</h3>
                        <p className="text-sm leading-relaxed opacity-90">{aiMessage}</p>
                    </div>
                </div>
            </div>
        </header>

        <main className={`px-6 py-4 pb-24 ${viewMode === 'calendar' ? 'pt-14' : ''}`}>
            {viewMode === 'dashboard' ? (
                <div className="space-y-4 animate-fade-in">
                    {tasks.map(task => (
                        <SwipeableTaskItem key={task.id} task={task} onClick={handleTaskClick} onEdit={setEditingTask} onDelete={deleteTask} />
                    ))}
                    {isAddingTask ? (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 animate-fade-in">
                            <input autoFocus type="text" placeholder="例如: 准备面试..." className="w-full bg-transparent outline-none text-lg mb-4 text-gray-800 placeholder-gray-400" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                            <div className="flex gap-2 justify-between items-center">
                                <button onClick={generateSmartPlan} disabled={!newTaskTitle.trim() || isGeneratingPlan} className={`flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${!newTaskTitle.trim() ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}>
                                    {isGeneratingPlan ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} />} AI 拆解
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsAddingTask(false)} className="px-3 py-2 text-gray-500 text-sm">取消</button>
                                    <button onClick={addNewTask} className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold">添加</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsAddingTask(true)} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                            <Plus size={20} /> 添加新目标
                        </button>
                    )}
                </div>
            ) : (
                <CalendarView />
            )}
        </main>

        {viewMode === 'dashboard' && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md shadow-xl border border-gray-200 p-2 rounded-full pointer-events-auto flex gap-2">
                    <button onClick={handleAiAdvice} className="p-3 hover:bg-gray-100 rounded-full text-indigo-600 transition-colors tooltip">
                        <Shuffle size={24} />
                    </button>
                    <div className="w-px h-10 bg-gray-200 mx-1"></div>
                    <button onClick={() => alert('休息一下，喝杯咖啡')} className="p-3 hover:bg-gray-100 rounded-full text-amber-600 transition-colors">
                        <Coffee size={24} />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
