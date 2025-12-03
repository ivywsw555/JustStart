import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Trash2, Brain, CheckCircle, ChevronRight, ChevronLeft, Shuffle, Coffee, Sparkles, Loader2, Calendar as CalendarIcon, ArrowLeft, Pencil, X, Download, LogIn, LogOut, User, Cloud, LayoutList, Timer, Archive, Clock, Layers, ChevronDown, ChevronUp, Server, Check, CloudOff, Eye, EyeOff } from 'lucide-react';

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
    // collection,
    // getAnalytics 
} from "firebase/firestore";

// --- 🔥 LLM Configuration ---
const AI_CONFIG = {
    useMockData: true,
    baseUrl: "http://localhost:11434/v1/chat/completions",
    model: "llama3"
};

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyCXowQfMj1aU6SF_sYvRAvHItr_4EDAu7E",
    authDomain: "juststart-e864a.firebaseapp.com",
    projectId: "juststart-e864a",
    storageBucket: "juststart-e864a.firebasestorage.app",
    messagingSenderId: "788964373482",
    appId: "1:788964373482:web:f4af83e9b74a0c13c2b893",
    measurementId: "G-LCNVGLK197"
};

// const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
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
                    { title: "Task 1 (Mock)", minutes: 30, group: "Phase 1", dayOffset: 0 },
                    { title: "Task 2 (Mock)", minutes: 60, group: "Phase 1", dayOffset: 1 }
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
// const INITIAL_TASKS = [
//     {
//         id: 1,
//         title: 'LeetCode 算法刷题',
//         dailyGoal: "攻克动态规划 (DP) 难关",
//         goalMinutes: 60,
//         completedMinutes: 65, // 已达标 (绿色对勾 + 亮色目标)
//         color: 'bg-blue-500',
//         status: 'active',
//         createdAt: Date.now(),
//         deadline: getDefaultDeadline(30),
//         group: 'Algorithm',
//         project: 'Interview Prep'
//     },
//     {
//         id: 2,
//         title: 'System Design 学习',
//         dailyGoal: "看完 Alex Xu 第 5 章",
//         goalMinutes: 45,
//         completedMinutes: 20, // 进行中
//         color: 'bg-indigo-500',
//         status: 'active',
//         createdAt: Date.now(),
//         deadline: getDefaultDeadline(14),
//         group: 'Architecture',
//         project: 'Interview Prep'
//     },
//     {
//         id: 3,
//         title: 'React 源码阅读',
//         dailyGoal: "理解 Fiber 架构",
//         goalMinutes: 90,
//         completedMinutes: 0, // 未开始
//         color: 'bg-emerald-500',
//         status: 'active',
//         createdAt: Date.now(),
//         deadline: getDefaultDeadline(60),
//         group: 'Frontend',
//         project: 'Skill Up'
//     },
//     {
//         id: 4,
//         title: '旧的英语计划',
//         dailyGoal: "背单词",
//         goalMinutes: 20,
//         completedMinutes: 200,
//         color: 'bg-amber-500',
//         status: 'archived', // 已归档 (在管理页面显示)
//         createdAt: Date.now(),
//         deadline: getDefaultDeadline(-5), // 已过期
//         group: 'Vocabulary',
//         project: 'English'
//     }
// ];
const FocusParticleCanvas = ({ progress }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // 初始化尺寸
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // 粒子系统配置
        const particles = [];
        const particleCount = 80; // 粒子数量
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseColor = { r: 245, g: 158, b: 11 }; // 琥珀金 (Amber-500)

        // 粒子类
        class Particle {
            constructor() {
                this.init();
            }

            init() {
                // 随机分布在屏幕各处，但在中心附近更密集
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * Math.max(canvas.width, canvas.height) * 0.6;
                this.x = centerX + Math.cos(angle) * radius;
                this.y = centerY + Math.sin(angle) * radius;

                // 极其缓慢的漂浮速度
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;

                this.size = Math.random() * 2; // 粒子大小
                this.alpha = Math.random() * 0.5; // 初始透明度
                this.targetAlpha = Math.random() * 0.8; // 目标透明度（用于闪烁）
                this.flickerSpeed = 0.01 + Math.random() * 0.02; // 闪烁速度
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // 简单的闪烁逻辑
                if (this.alpha < this.targetAlpha) {
                    this.alpha += this.flickerSpeed;
                    if (this.alpha >= this.targetAlpha) this.targetAlpha = 0.1; // 变亮后变暗
                } else {
                    this.alpha -= this.flickerSpeed;
                    if (this.alpha <= 0.1) {
                        this.targetAlpha = Math.random() * 0.8; // 变暗后随机变亮
                        // 如果粒子跑太远或看不见了，重置位置
                        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                            this.init();
                        }
                    }
                }
            }

            draw(ctx) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
                ctx.fill();
            }
        }

        // 初始化粒子
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        let time = 0;

        const render = () => {
            time += 0.015; // 时间流逝速度

            // 1. 背景：带有拖尾效果的深邃黑夜（不完全清除画布，制造光晕残留）
            ctx.fillStyle = 'rgba(5, 5, 10, 0.15)'; // 深蓝黑 + 透明度
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. 混合模式：滤色（让光叠加变亮）
            ctx.globalCompositeOperation = 'screen';

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // --- 核心逻辑：呼吸灯效果 ---
            // 使用正弦波模拟呼吸：(sin(t) + 1) / 2 产生 0 到 1 的平滑波动
            const breath = (Math.sin(time) + 1) / 10;

            // 基础光晕大小随进度(progress)增加，随呼吸(breath)波动
            const baseRadius = 30 + (progress * 300);
            const pulseRadius = baseRadius + (breath * 20);

            // 3. 绘制外层柔光 (Warm Halo)
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius * 2);
            gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${0.15 + breath * 0.05})`); // 中心稍亮
            gradient.addColorStop(0.5, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${0.05})`); // 中间衰减
            gradient.addColorStop(1, 'rgba(0,0,0,0)'); // 边缘透明

            ctx.beginPath();
            ctx.arc(cx, cy, pulseRadius * 2, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 4. 绘制核心亮斑 (The Lamp Core)
            // 核心也会轻微呼吸，让人感觉它是活的
            // const coreRadius = 8 + (progress * 5) + (breath * 2);
            // ctx.beginPath();
            // ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
            // // 核心是白色的，带有强烈的金色阴影
            // ctx.fillStyle = 'rgba(255, 250, 240, 0.9)'; 
            // ctx.shadowBlur = 30 + (breath * 10);
            // ctx.shadowColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`;
            // ctx.fill();

            // 重置阴影，避免影响粒子
            ctx.shadowBlur = 0;

            // 5. 绘制悬浮微尘
            particles.forEach(p => {
                p.update();
                p.draw(ctx);
            });

            // 恢复默认混合模式
            ctx.globalCompositeOperation = 'source-over';

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [progress]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 bg-[#05050A]" />;
};



const EditTaskModal = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title);
    const [minutes, setMinutes] = useState(task.goalMinutes);
    const [group, setGroup] = useState(task.group || 'General');
    const [project, setProject] = useState(task.project || 'Manual');
    // 新增状态：今日具体目标
    const [dailyGoal, setDailyGoal] = useState(task.dailyGoal || '');

    const [deadlineDate, setDeadlineDate] = useState(() => {
        const d = new Date(task.deadline || Date.now());
        // 格式化为 YYYY-MM-DD 以适配 input type="date"
        return d.toISOString().split('T')[0];
    });

    const handleSave = () => {
        const newDeadline = new Date(deadlineDate).getTime();
        // 保存时包含 dailyGoal
        onSave(task.id, {
            title,
            goalMinutes: parseInt(minutes),
            group,
            project,
            dailyGoal,
            deadline: newDeadline
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
                {/* 标题栏 */}
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900">调整任务</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* 任务名称 */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        任务名称
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"
                    />
                </div>

                {/* 新增：今日具体目标输入框 */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        今日具体目标
                    </label>
                    <input
                        type="text"
                        value={dailyGoal}
                        onChange={(e) => setDailyGoal(e.target.value)}
                        className="w-full text-base font-medium text-gray-700 border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent placeholder-gray-300"
                        placeholder="例如: 完成第3章练习"
                    />
                </div>

                {/* 项目与分组 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                            所属项目
                        </label>
                        <input
                            type="text"
                            value={project}
                            onChange={(e) => setProject(e.target.value)}
                            className="w-full text-sm border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"
                            placeholder="例如: 英语学习"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                            阶段/分组
                        </label>
                        <input
                            type="text"
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            className="w-full text-sm border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"
                            placeholder="例如: 单词"
                        />
                    </div>
                </div>

                {/* 时间与截止日期 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                            每日目标(分)
                        </label>
                        <input
                            type="number"
                            value={minutes}
                            onChange={(e) => setMinutes(e.target.value)}
                            className="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                            截止日期
                        </label>
                        <input
                            type="date"
                            value={deadlineDate}
                            onChange={(e) => setDeadlineDate(e.target.value)}
                            className="w-full text-sm border-b-2 border-gray-200 focus:border-black outline-none py-1 bg-transparent"
                        />
                    </div>
                </div>

                {/* 保存按钮 */}
                <div className="pt-4 flex gap-3">
                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        保存更改
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 🔥 Heatmap Calendar Component ---
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
                    <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><ChevronLeft size={20} /></button>
                    <h3 className="font-bold text-base text-gray-800">{year}年 {month + 1}月</h3>
                    <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><ChevronRight size={20} /></button>
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
                            <Coffee size={24} className="mx-auto mb-2 opacity-50" />
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
    const [newTaskGoal, setNewTaskGoal] = useState('');

    // --- UI State ---
    const [activeTaskId, setActiveTaskId] = useState(null);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [viewMode, setViewMode] = useState('dashboard');
    const [editingTask, setEditingTask] = useState(null);
    const [manualRecordTask, setManualRecordTask] = useState(null);
    const [isAdHocLogOpen, setIsAdHocLogOpen] = useState(false);


    const [aiMessage, setAiMessage] = useState("AI 助手就绪...");
    const [newTaskInput, setNewTaskInput] = useState('');
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
                    saveSession(taskId, timerSeconds);
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
            goalMinutes: Math.round(goalMinutes),
            completedMinutes: 0,
            color: 'bg-slate-500',
            status: 'active',
            createdAt: Date.now(),
            deadline: getDefaultDeadline(),
            group: group,
            project: 'Manual',
            dailyGoal: newTaskGoal || "Daily Progress",
        };
        const newTasks = [...tasks, newTask];
        setTasks(newTasks);
        saveDataToCloud(newTasks, history);
        setNewTaskInput('');
        setNewTaskGoal('');
        setIsAddingTask(false);
    };

    const AdHocLogModal = ({ onClose, onSave }) => {
        const [title, setTitle] = useState('');
        const [minutes, setMinutes] = useState('');

        const handleSave = () => {
            const mins = parseInt(minutes);
            if (title.trim() && mins && mins > 0) {
                onSave(title, mins * 60);
                onClose();
            }
        };

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        {/* <History size={24} /> */}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">补录任意活动</h3>
                    <p className="text-gray-500 text-sm mb-6 text-center">做了列表里没有的事情？记录下来，也是一种成就。</p>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">做了什么?</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="例如: 帮同事Debug, 读了会书..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full text-lg font-medium border-b-2 border-gray-200 focus:border-amber-500 outline-none py-2 bg-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">多久? (分钟)</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                className="w-full text-lg font-mono font-bold text-gray-900 border-b-2 border-gray-200 focus:border-amber-500 outline-none py-2 bg-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors">取消</button>
                        <button onClick={handleSave} className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">确认记录</button>
                    </div>
                </div>
            </div>
        );
    };

    const ManualRecordModal = ({ task, onClose, onSave }) => {
        const [minutes, setMinutes] = useState('');

        const handleSave = () => {
            const mins = parseInt(minutes);
            if (mins && mins > 0) {
                onSave(task.id, mins * 60);
                onClose();
            }
        };

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">补录时长</h3>
                    <p className="text-gray-500 text-sm mb-6">为 "{task.title}" 补充记录时间。</p>

                    <div className="flex justify-center items-baseline gap-2 mb-8">
                        <input
                            autoFocus
                            type="number"
                            placeholder="0"
                            value={minutes}
                            onChange={(e) => setMinutes(e.target.value)}
                            className="w-24 text-center text-4xl font-mono font-bold text-indigo-600 border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-1 bg-transparent"
                        />
                        <span className="text-gray-400 font-medium">分钟</span>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors">取消</button>
                        <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">确认</button>
                    </div>
                </div>
            </div>
        );
    };
    const SwipeableTaskItem = ({ task, onClick, onDelete, onEdit, hideTitle, onManualRecord, todayMinutes }) => {
        const [offsetX, setOffsetX] = useState(0);
        const [isDragging, setIsDragging] = useState(false);
        const startX = useRef(0);
        const progress = Math.min((todayMinutes / task.goalMinutes) * 100, 100);

        const onTouchStart = (e) => {
            startX.current = e.touches[0].clientX;
            setIsDragging(true);
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX.current;
            // Limit swipe range: -100 (Delete) to +100 (Add)
            if (diff > -100 && diff < 100) {
                setOffsetX(diff);
            }
        };

        const onTouchEnd = () => {
            setIsDragging(false);
            if (offsetX < -50) {
                setOffsetX(-80); // Snap to delete (Left)
            } else if (offsetX > 50) {
                setOffsetX(80); // Snap to add (Right)
            } else {
                setOffsetX(0); // Snap back
            }
        };

        return (
            <div className="relative w-full mb-3 select-none overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white h-[88px]">
                {/* Background Layer for Swipe Actions */}
                <div className={`absolute inset-0 flex items-center justify-between px-5 rounded-xl transition-colors duration-300 ${offsetX > 0 ? 'bg-indigo-500' : 'bg-red-500'}`}>
                    {/* Left Action (Visible on Right Swipe): Manual Record */}
                    <div className={`flex items-center gap-2 text-white transition-opacity duration-200 ${offsetX > 0 ? 'opacity-100' : 'opacity-0'}`}>
                        <Plus size={20} />
                        <span className="font-bold text-sm">补录</span>
                    </div>

                    {/* Right Action (Visible on Left Swipe): Delete */}
                    <div className={`flex items-center gap-2 text-white transition-opacity duration-200 ${offsetX < 0 ? 'opacity-100' : 'opacity-0'}`}>
                        <span className="font-bold text-sm">删除</span>
                        <Trash2 size={20} />
                    </div>
                </div>

                {/* Main Foreground Card */}
                <div className="absolute inset-0 bg-white rounded-xl border border-gray-100 flex z-10 transition-transform duration-300 ease-out overflow-hidden"
                    style={{ transform: `translateX(${offsetX}px)` }}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onClick={() => offsetX !== 0 ? setOffsetX(0) : onClick(task.id)}
                >
                    <div className={`w-1.5 h-full ${task.color}`}></div>
                    <div className="flex-1 flex justify-between items-center p-3 pl-4 min-w-0">
                        <div className="flex-1 pr-3 min-w-0 flex flex-col justify-center h-full">
                            <h3 className={`font-bold text-base text-gray-900 truncate transition-all ${hideTitle ? 'blur-sm select-none opacity-50' : ''}`}>{hideTitle ? 'Secret Task' : task.title}</h3>
                            <p className={`text-xs text-gray-400 font-medium truncate transition-all ${hideTitle ? 'opacity-0' : 'opacity-100'}`}>{task.dailyGoal || 'Manual'} • {task.group || 'General'}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                                {/* Display Today's Progress */}
                                <span className={todayMinutes >= task.goalMinutes ? 'text-green-600 font-bold' : ''}>
                                    {Math.round(todayMinutes)} / {task.goalMinutes} m (Today)
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-indigo-600 transition-colors"><Pencil size={12} /></button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Only Play Button Remains on the face */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${task.color} text-white shrink-0`}><Play fill="currentColor" size={16} className="ml-0.5" /></div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50"><div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
                </div>

                {/* Clickable Action Areas */}
                {offsetX <= -50 && <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="absolute right-0 top-0 bottom-0 w-24 z-20" aria-label="Confirm Delete"></button>}
                {offsetX >= 50 && <button onClick={(e) => { e.stopPropagation(); onManualRecord(task); setOffsetX(0); }} className="absolute left-0 top-0 bottom-0 w-24 z-20" aria-label="Confirm Manual Record"></button>}
            </div>
        );
    };
    const handleUpdateTask = (id, updates) => {
        const newTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        setTasks(newTasks);
        saveDataToCloud(newTasks, history);
        setEditingTask(null);
    };
    const saveSession = (taskId, seconds) => {
        const minutesToAdd = seconds / 60;

        // 1. Update Task Lifetime Total (Optional, but good for stats)
        const newTasks = tasks.map(t => {
            if (t.id === taskId) {
                // We keep 'completedMinutes' locally or use 'totalMinutes' for clarity.
                // Let's use 'totalMinutes' for lifetime accumulation to avoid confusion.
                const currentTotal = t.totalMinutes || t.completedMinutes || 0;
                return { ...t, totalMinutes: currentTotal + minutesToAdd };
            }
            return t;
        });

        // 2. Update History (This drives the daily progress bar)
        const task = tasks.find(t => t.id === taskId);
        const today = getTodayString();
        const safeHistory = history || {};
        const dayRecords = safeHistory[today] || [];
        const newHistory = {
            ...safeHistory,
            [today]: [...dayRecords, {
                taskId,
                title: task ? task.title : 'Unknown',
                minutes: minutesToAdd,
                timestamp: Date.now(),
                color: task ? task.color : 'bg-gray-500'
            }]
        };

        setTasks(newTasks);
        setHistory(newHistory);
        saveDataToCloud(newTasks, newHistory);
    };

    const handleManualRecord = (id, seconds) => {
        saveSession(id, seconds);
    };

    // NEW: Log ad-hoc activity directly to history
    const handleAdHocLog = (title, seconds) => {
        const minutesToAdd = seconds / 60;
        const today = getTodayString();

        // Also check if this matches an existing task title, if so, update that task too!
        const existingTask = tasks.find(t => t.title === title);
        if (existingTask) {
            setTasks(prev => prev.map(t => {
                if (t.id === existingTask.id) return { ...t, completedMinutes: t.completedMinutes + minutesToAdd };
                return t;
            }));
        }

        setHistory(prev => {
            const dayRecords = prev[today] || [];
            return {
                ...prev,
                [today]: [...dayRecords, {
                    taskId: existingTask ? existingTask.id : `adhoc-${Date.now()}`,
                    title: title,
                    minutes: minutesToAdd,
                    timestamp: Date.now(),
                    color: existingTask ? existingTask.color : 'bg-amber-500' // Default color for ad-hoc
                }]
            };
        });
    };
    const handleArchiveTask = (id) => {
        if (confirm('归档后任务将移至"管理"列表。确定吗？')) {
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

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    const getTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getTaskTodayMinutes = (taskId) => {
        const today = getTodayString();
        const dayRecords = history[today] || [];
        return dayRecords
            .filter(r => r.taskId === taskId)
            .reduce((acc, curr) => acc + curr.minutes, 0);
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
                            <ChevronUp size={16} />
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
                                                    <div className="flex gap-2 text-[10px] mt-1">
                                                        <span className={`px-1.5 py-0.5 rounded ${isExpired ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{isExpired ? 'Expired' : `${daysLeft}d left`}</span>
                                                        <span className="text-gray-400">{Math.round(t.completedMinutes)} / {t.goalMinutes}m</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => setEditingTask(t)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><Pencil size={14} /></button>
                                                    <button onClick={() => handleArchiveTask(t.id)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100" title="归档"><Archive size={14} /></button>
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
                                    <span className={`font-medium text-gray-500 line-through text-sm transition-all ${hideTitles ? 'blur-sm select-none' : ''}`}>{hideTitles ? '******' : t.title}</span>
                                    <button onClick={() => handleReactivateTask(t.id)} className="text-indigo-600 text-xs font-bold hover:underline">恢复</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
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
                <SwipeableTaskItem key={task.id} task={task}
                    onClick={handleTaskClick}
                    onEdit={setEditingTask}
                    onDelete={handleArchiveTask}
                    hideTitle={hideTitles}
                    onManualRecord={setManualRecordTask} todayMinutes={getTaskTodayMinutes(task.id)}
                />
            ))}
            {isAddingTask ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4">
                    <textarea autoFocus rows={3} placeholder="输入任务... (例如: 读书 45m #学习)" className="w-full bg-transparent outline-none text-base mb-4 font-mono" value={newTaskInput} onChange={(e) => setNewTaskInput(e.target.value)} />
                    <div className="flex items-center gap-2 mb-4 text-gray-500 border-b border-gray-200 pb-1">
                        {/* <Target size={14} /> */}
                        <input
                            type="text"
                            placeholder="今日具体目标 (例如: 看完第3章)"
                            className="w-full bg-transparent outline-none text-sm"
                            value={newTaskGoal}
                            onChange={(e) => setNewTaskGoal(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 justify-between items-center">
                        <button onClick={generateSmartPlan} disabled={!newTaskInput.trim() || isGeneratingPlan} className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${!newTaskInput.trim() ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}>{isGeneratingPlan ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 智能导入</button>
                        <div className="flex gap-2">
                            <button onClick={() => setIsAddingTask(false)} className="px-3 py-2 text-gray-500 text-xs font-bold">取消</button>
                            <button onClick={addNewTask} className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold">添加</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAddingTask(true)}
                        className="flex-1 py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                        <Plus size={20} /> 添加新目标
                    </button>
                    <button
                        onClick={() => setIsAdHocLogOpen(true)}
                        className="w-16 py-4 border-2 border-dashed border-amber-100 bg-amber-50 rounded-2xl text-amber-500 flex items-center justify-center gap-2 hover:bg-amber-100 hover:border-amber-200 transition-colors tooltip"
                        title="补录任意活动"
                    >
                        <Clock size={20} />
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 text-gray-900 font-sans flex justify-center">
            {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleUpdateTask} />}
            {manualRecordTask && <ManualRecordModal task={manualRecordTask} onClose={() => setManualRecordTask(null)} onSave={handleManualRecord} />}
            {isAdHocLogOpen && <AdHocLogModal onClose={() => setIsAdHocLogOpen(false)} onSave={handleAdHocLog} />}
            {activeTaskId && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
                    <FocusParticleCanvas progress={0.5} />
                    <div className="relative z-10 text-center text-white">
                        <h1 className={`text-4xl font-bold mb-8 transition-all ${hideTitles ? 'blur-md' : ''}`}>{hideTitles ? 'Current Task' : tasks.find(t => t.id === activeTaskId)?.title}</h1>
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
                        <button onClick={() => handleTaskClick(activeTaskId)} className="bg-white text-black p-6 rounded-full"><Pause size={32} /></button>
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

            <div className="w-full max-w-lg bg-yellow min-h-screen shadow-xl border-x border-gray-100 relative flex flex-col">
                <header className="px-6 pt-12 pb-4 bg-white sticky top-0 z-30 border-b border-gray-50">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
                                JustStart <span className="text-blue-600">.</span>
                                <button onClick={() => setHideTitles(!hideTitles)} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
                                    {hideTitles ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                {syncStatus === 'syncing' && <span className="text-xs text-blue-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> 同步中...</span>}
                                {syncStatus === 'synced' && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={10} /> 已同步</span>}
                                {syncStatus === 'offline' && <span className="text-xs text-gray-400 flex items-center gap-1"><CloudOff size={10} /> 离线</span>}
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
                                <div className="flex-1"><p className="text-xs font-bold opacity-70 mb-0.5">{AI_CONFIG.useMockData ? 'AI 每日教练 ✨' : 'AI 每日教练 ✨ (Local)'}</p><p className="text-sm leading-relaxed">{aiMessage}</p></div>
                            </div>
                        </div>
                    )}
                </header>

                <main className="flex-1 px-6 py-6 overflow-y-auto">
                    {viewMode === 'dashboard' && renderDashboard()}
                    {viewMode === 'tasks' && renderTaskManagement()}
                    {viewMode === 'calendar' && <CalendarView history={history} exportData={exportData} />}
                </main>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around items-center z-40 pb-6">
                    <button onClick={() => setViewMode('dashboard')} className={`flex flex-col items-center gap-1 ${viewMode === 'dashboard' ? 'text-black' : 'text-gray-400'}`}><LayoutList size={24} /><span className="text-[10px] font-bold">专注</span></button>
                    <button onClick={() => setViewMode('tasks')} className={`flex flex-col items-center gap-1 ${viewMode === 'tasks' ? 'text-black' : 'text-gray-400'}`}><Layers size={24} /><span className="text-[10px] font-bold">管理</span></button>
                    <button onClick={() => setViewMode('calendar')} className={`flex flex-col items-center gap-1 ${viewMode === 'calendar' ? 'text-black' : 'text-gray-400'}`}><CalendarIcon size={24} /><span className="text-[10px] font-bold">日历</span></button>
                </div>
            </div>
        </div>
    );
}
