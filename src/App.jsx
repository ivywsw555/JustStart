import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Trash2, Brain, CheckCircle, ChevronRight, ChevronLeft, Shuffle, Coffee, Sparkles, Loader2, Calendar as CalendarIcon, ArrowLeft, Pencil, X } from 'lucide-react';

// --- Gemini API Configuration ---
const apiKey = ""; // 系统会自动注入 API Key
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

const callGemini = async (prompt, systemInstruction = "") => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

// 初始默认任务
const INITIAL_TASKS = [
  { id: 1, title: 'LeetCode 算法刷题', goalMinutes: 30, completedMinutes: 0, color: 'bg-blue-500' },
  { id: 2, title: '系统设计学习', goalMinutes: 120, completedMinutes: 0, color: 'bg-indigo-500' },
  { id: 3, title: '英语口语练习', goalMinutes: 5, completedMinutes: 0, color: 'bg-emerald-500' },
];

// --- Sub-Component: Particle Canvas (Hero Section) ---
const FocusParticleCanvas = ({ progress }) => {
  const canvasRef = useRef(null);
  // 强制使用温暖的琥珀金色，不管任务本来是什么颜色，营造"温暖光芒"
  const warmGoldHex = '#F59E0B';
  const warmLightHex = '#FEF3C7';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Resize handler
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Particles
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

        // 速度更慢，更优雅
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

        const dx = centerX - this.x;
        const dy = centerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 15 || this.life > this.maxLife) {
          this.reset();
        }
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
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let time = 0;

    const render = () => {
      time++;
      // 拖尾效果
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter';

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      // --- 核心光球 (The Warm Core) ---
      // 减慢呼吸频率 (0.05 -> 0.02)
      const pulse = Math.sin(time * 0.02) * 8;
      const baseRadius = 30 + (progress * 120);
      const actualRadius = Math.max(15, baseRadius + pulse);

      // 外发光 (金色)
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, actualRadius * 2.5);
      gradient.addColorStop(0, warmGoldHex);
      gradient.addColorStop(0.3, 'rgba(245, 158, 11, 0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, actualRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.6; // 柔和一点
      ctx.fill();

      // 内核 (亮白暖色)
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
  const [step, setStep] = useState(1); // 1: Edit, 2: Confirm Series

  const handleInitialSave = () => {
    if (!title.trim() || minutes <= 0) return;
    setStep(2);
  };

  const handleFinalSave = () => {
    onSave(task.id, title, parseInt(minutes));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {step === 1 ? (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-gray-900">调整计划</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">任务名称</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">每日目标 (分钟)</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-24 text-3xl font-mono font-bold text-indigo-600 border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-1 bg-transparent"
                />
                <span className="text-gray-400">min</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors">取消</button>
              <button onClick={handleInitialSave} className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">保存修改</button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center animate-fade-in">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">更新系列任务？</h3>
            <p className="text-gray-500 text-sm mb-6">
              检测到这是一个循环任务。您希望将新的设置应用到未来所有的 "{title}" 任务中吗？
            </p>

            <div className="space-y-3">
              <button
                onClick={handleFinalSave}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                是的，更新整个系列
              </button>
              <button
                onClick={handleFinalSave}
                className="w-full py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
              >
                仅更新今天 (暂不支持)
              </button>
            </div>
          </div>
        )}
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

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const touchX = e.touches[0].clientX;
    const diff = touchX - startX.current;
    if (diff < 0 && diff > -120) {
      setOffsetX(diff);
    } else if (diff > 0 && offsetX < 0) {
      setOffsetX(Math.min(0, MAX_SWIPE + diff));
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    if (offsetX < SNAP_THRESHOLD) {
      setOffsetX(MAX_SWIPE);
    } else {
      setOffsetX(0);
    }
  };

  const progress = Math.min((task.completedMinutes / task.goalMinutes) * 100, 100);
  const isDone = progress >= 100;

  return (
    <div className="relative w-full h-24 mb-4 select-none overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-2xl">
        <Trash2 className="text-white animate-pulse" size={24} />
      </div>

      <div
        className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => {
          if (offsetX < -10) setOffsetX(0);
          else onClick(task.id);
        }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-lg ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</h3>
              {/* Edit Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="p-1 text-gray-300 hover:text-indigo-600 transition-colors"
              >
                <Pencil size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span>{Math.round(task.completedMinutes)} / {task.goalMinutes} min</span>
              {isDone && <span className="text-green-500 font-bold px-2 py-0.5 bg-green-50 rounded text-[10px]">COMPLETED</span>}
            </div>
          </div>

          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${task.color} text-white shrink-0`}>
            <Play fill="currentColor" size={16} className="ml-0.5" />
          </div>
        </div>

        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-3">
          <div className={`h-full ${task.color} transition-all duration-500`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {offsetX === MAX_SWIPE && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="absolute top-0 right-0 bottom-0 w-20 cursor-pointer z-10" />
      )}
    </div>
  );
};


export default function JumpStart() {
  // --- State ---
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('jumpstart_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('jumpstart_history');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeTaskId, setActiveTaskId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [viewMode, setViewMode] = useState('dashboard');

  // Edit State
  const [editingTask, setEditingTask] = useState(null);

  // AI State
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("点击这里，让 AI 基于你的当前进度给出建议...");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const [showSummary, setShowSummary] = useState(false);
  const [lastSessionTime, setLastSessionTime] = useState(0);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('jumpstart_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('jumpstart_history', JSON.stringify(history));
  }, [history]);

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
    setAiMessage("正在分析你的学习数据...");

    const prompt = JSON.stringify({
      currentTasks: tasks.map(t => ({
        title: t.title,
        goal: t.goalMinutes,
        done: Math.round(t.completedMinutes)
      })),
      currentTime: new Date().toLocaleTimeString()
    });

    const systemPrompt = `你是一个严格但幽默的职场教练。用户正在为跳槽做准备。
    请根据用户的任务列表和进度，给出一条简短、有力、具体的建议（20-40字）。
    如果用户进度落后，督促他。如果做得好，夸奖他。
    请用 JSON 格式返回: { "advice": "你的建议内容" }`;

    const result = await callGemini(prompt, systemPrompt);

    if (result) {
      try {
        const parsed = JSON.parse(result);
        setAiMessage(parsed.advice);
      } catch (e) {
        setAiMessage("AI 似乎在思考人生，请重试...");
      }
    } else {
      setAiMessage("网络开小差了，建议你先做个简单的任务。");
    }
    setIsAiLoading(false);
  };

  const generateSmartPlan = async () => {
    if (!newTaskTitle.trim()) return;
    setIsGeneratingPlan(true);

    const systemPrompt = `你是一个专业的项目经理。用户输入一个模糊的学习目标，你需要将其拆解为 2-4 个具体的、可执行的子任务。
    每个任务应该包含：title (任务名), minutes (建议时长，整数), color (从 bg-blue-500, bg-indigo-500, bg-emerald-500, bg-amber-500, bg-rose-500 中随机选一个)。
    返回格式必须是纯 JSON 数组: [{ "title": "xxx", "minutes": 30, "color": "bg-xxx" }, ...]`;

    const prompt = `用户的目标是: "${newTaskTitle}"。请拆解。`;

    const result = await callGemini(prompt, systemPrompt);

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
          setTasks(prev => [...prev, ...createdTasks]);
          setNewTaskTitle('');
          setIsAddingTask(false);
        }
      } catch (e) {
        alert("生成计划失败，请手动添加试试。");
      }
    }
    setIsGeneratingPlan(false);
  };

  // --- Helpers ---
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgress = (current, goal) => {
    const percentage = (current / goal) * 100;
    return Math.min(percentage, 100);
  };

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // --- Handlers ---
  const handleTaskClick = (taskId) => {
    if (activeTaskId === taskId) {
      const sessionSecs = timerSeconds;
      saveSession(taskId, sessionSecs);
      setLastSessionTime(sessionSecs);
      setActiveTaskId(null);
      setShowSummary(true);
    } else {
      if (activeTaskId) {
        saveSession(activeTaskId, timerSeconds);
      }
      setTimerSeconds(0);
      setActiveTaskId(taskId);
    }
  };

  const saveSession = (taskId, seconds) => {
    if (seconds < 5) return;
    const minutesToAdd = seconds / 60;

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, completedMinutes: t.completedMinutes + minutesToAdd };
      }
      return t;
    }));

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const today = getTodayString();

    setHistory(prev => {
      const dayRecords = prev[today] || [];
      return {
        ...prev,
        [today]: [...dayRecords, {
          taskId,
          title: task.title,
          minutes: minutesToAdd,
          timestamp: Date.now(),
          color: task.color
        }]
      };
    });
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleUpdateTask = (id, newTitle, newMinutes) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, title: newTitle, goalMinutes: newMinutes };
      }
      return t;
    }));
    setEditingTask(null);
  };

  const handleSummaryConfirm = () => {
    setShowSummary(false);
    setTimerSeconds(0);
  };

  const addNewTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle,
      goalMinutes: 30, // 默认 30 分钟
      completedMinutes: 0,
      color: 'bg-slate-500'
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const deleteTask = (id) => {
    if (confirm('确定要放弃这个提升计划吗？')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  // --- Calendar Component ---
  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(getTodayString());

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const changeMonth = (delta) => {
      setCurrentDate(new Date(year, month + delta, 1));
    };

    const getDayData = (day) => {
      if (!day) return null;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        dateStr,
        records: history[dateStr] || []
      };
    };

    const selectedDayData = history[selectedDate] || [];
    const totalMinutesSelected = selectedDayData.reduce((acc, curr) => acc + curr.minutes, 0);

    const aggregatedSelectedData = selectedDayData.reduce((acc, curr) => {
      if (!acc[curr.title]) {
        acc[curr.title] = { minutes: 0, color: curr.color, count: 0 };
      }
      acc[curr.title].minutes += curr.minutes;
      acc[curr.title].count += 1;
      return acc;
    }, {});

    return (
      <div className="animate-fade-in pb-20">
        <div className="flex items-center justify-between mb-6 px-2">
          <button onClick={() => setViewMode('dashboard')} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full flex items-center gap-1">
            <ArrowLeft size={20} /> 返回
          </button>
          <h2 className="text-xl font-bold text-gray-800">历史回顾</h2>
          <div className="w-10"></div>
        </div>

        {/* Calendar Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
            <h3 className="font-bold text-lg">{year}年 {month + 1}月</h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20} /></button>
          </div>

          {/* Grid */}
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
                } else if (totalMins > 120) bgClass = 'bg-green-500 text-white';
                else if (totalMins > 60) bgClass = 'bg-green-400 text-white';
                else if (totalMins > 30) bgClass = 'bg-green-300 text-white';
                else if (totalMins > 0) bgClass = 'bg-green-100 text-green-800';
              }

              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDate(data.dateStr)}
                  className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium cursor-pointer transition-all ${bgClass} ${textClass}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
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
            {totalMinutesSelected > 0 && <div className="text-2xl">🔥</div>}
          </div>

          {Object.keys(aggregatedSelectedData).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              这一天没有任何记录，<br />是不是去偷懒了？
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(aggregatedSelectedData).map(([title, data]) => (
                <div key={title} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${data.color}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">{title}</span>
                      <span className="text-gray-900 font-mono font-bold">{Math.round(data.minutes)}m</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full ${data.color} opacity-60`} style={{ width: `${Math.min(100, (data.minutes / totalMinutesSelected) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Render Components ---

  // 1. Focus Mode with Canvas
  if (activeTaskId) {
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const progress = Math.min(1, (activeTask.completedMinutes + timerSeconds / 60) / activeTask.goalMinutes);

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-colors duration-1000 overflow-hidden">
        {/* Background Animation */}
        <FocusParticleCanvas progress={progress} />

        {/* Foreground Content */}
        <div className="relative z-10 text-center space-y-8 animate-fade-in px-6 w-full max-w-md">
          <div className="inline-block p-4 rounded-full bg-white/10 mb-4 backdrop-blur-md border border-white/10">
            <Brain size={48} className="text-amber-100 opacity-90 animate-pulse" />
          </div>

          <h2 className="text-xl font-medium text-amber-100/60 tracking-widest uppercase">Now Focusing</h2>
          <h1 className="text-3xl md:text-5xl font-bold text-amber-50 tracking-tight drop-shadow-2xl">{activeTask?.title}</h1>

          <div className="text-7xl md:text-9xl font-mono font-bold text-amber-50 tracking-wider my-8 tabular-nums drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            {formatTime(timerSeconds)}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-amber-100/60 text-sm font-medium px-1">
              <span>Current Progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] transition-all duration-1000"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => handleTaskClick(activeTaskId)}
            className="mt-16 w-20 h-20 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all duration-300 mx-auto group"
          >
            <Pause fill="currentColor" className="opacity-80 group-hover:opacity-100 text-amber-100" size={32} />
          </button>
        </div>
      </div>
    );
  }

  // 2. Summary Modal
  if (showSummary) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 z-50 relative">
        <div className="bg-gray-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-gray-700 animate-fade-in">
          <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">干得漂亮！</h2>
          <p className="text-gray-400 mb-6">你刚刚专注了 <span className="text-white font-mono font-bold">{formatTime(lastSessionTime)}</span></p>
          <button
            onClick={handleSummaryConfirm}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            记录并返回
          </button>
        </div>
      </div>
    )
  }

  // 3. Main Interface
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Edit Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
        />
      )}

      {/* Header */}
      <header className={`px-6 pt-12 pb-6 bg-white shadow-sm sticky top-0 z-10 transition-transform duration-300 ${viewMode === 'calendar' ? '-translate-y-full absolute opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">JumpStart <span className="text-blue-600">.</span></h1>
            <p className="text-sm text-gray-500">科学跳槽备战助手</p>
          </div>
          <button
            onClick={() => setViewMode('calendar')}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors tooltip"
            title="查看历史记录"
          >
            <CalendarIcon size={20} className="text-gray-600" />
          </button>
        </div>

        {/* AI Insight Bar */}
        <div
          onClick={handleAiAdvice}
          className={`mt-4 p-4 rounded-xl cursor-pointer transition-all duration-300 border ${isAiPanelOpen ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]' : 'bg-indigo-50 border-indigo-100 text-indigo-900 hover:bg-indigo-100'}`}
        >
          <div className="flex items-start gap-3">
            {isAiLoading ? (
              <Loader2 size={20} className="mt-1 animate-spin" />
            ) : (
              <Brain size={20} className={`mt-1 ${isAiPanelOpen ? 'text-white' : 'text-indigo-600'}`} />
            )}
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                AI 每日教练 ✨
              </h3>
              <p className="text-sm leading-relaxed opacity-90">
                {aiMessage}
              </p>
            </div>
            {!isAiPanelOpen && <ChevronRight size={16} className="ml-auto mt-1 opacity-50" />}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-6 py-6">
        {viewMode === 'dashboard' ? (
          <div className="space-y-4 animate-fade-in">
            {tasks.map(task => (
              <SwipeableTaskItem
                key={task.id}
                task={task}
                onClick={handleTaskClick}
                onEdit={handleEditTask}
                onDelete={deleteTask}
              />
            ))}

            {/* Add Task */}
            {isAddingTask ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 animate-fade-in">
                <input
                  autoFocus
                  type="text"
                  placeholder="例如: 准备面试, 学习React..."
                  className="w-full bg-transparent outline-none text-lg mb-4 text-gray-800 placeholder-gray-400"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <div className="flex gap-2 justify-between items-center">
                  <button
                    onClick={generateSmartPlan}
                    disabled={!newTaskTitle.trim() || isGeneratingPlan}
                    className={`flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${!newTaskTitle.trim() ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                  >
                    {isGeneratingPlan ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGeneratingPlan ? '生成中...' : 'AI 帮我拆解'}
                  </button>

                  <div className="flex gap-2">
                    <button onClick={() => setIsAddingTask(false)} className="px-4 py-2 text-gray-500 text-sm">取消</button>
                    <button onClick={addNewTask} className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold">手动添加</button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTask(true)}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <Plus size={20} /> 添加新目标
              </button>
            )}
          </div>
        ) : (
          <div className="pt-8">
            <CalendarView />
          </div>
        )}
      </main>

      {/* Floating Action / Bottom Bar */}
      {viewMode === 'dashboard' && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md shadow-xl border border-gray-200 p-2 rounded-full pointer-events-auto flex gap-2">
            <button
              onClick={handleAiAdvice}
              className="p-3 hover:bg-gray-100 rounded-full text-indigo-600 transition-colors tooltip"
              title="AI 建议"
            >
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
  );
}