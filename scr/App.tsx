/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

 import React, { useState, useEffect, useRef } from 'react';
 import {
   Wifi, Zap, Globe, ShieldCheck, PhoneCall, CheckCircle2, ArrowRight,
   Menu, X, CreditCard, Clock, BarChart3, LayoutDashboard, Plus,
   Trash2, Edit2, Image as ImageIcon, Send, MessageSquare, LogOut,
   User, RefreshCcw, RotateCcw, Filter, Check, AlertCircle, Search, Users, TrendingUp,
   Package as PackageIcon, ShoppingCart, DollarSign } from
 'lucide-react';
 import { motion, AnimatePresence } from 'motion/react';
 import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   PieChart, Pie, Cell } from
 'recharts';
 import { auth, db } from './firebase';
 import {
   signInWithPopup,
   GoogleAuthProvider,
   onAuthStateChanged,
   signOut,
   User as FirebaseUser } from
 'firebase/auth';
 import { doc, getDoc, setDoc } from 'firebase/firestore';
 import {
   categoriesService,
   packagesService,
   subscriptionsService,
   chatService,
   refundService,
   settingsService,
   usersService } from
 './services/firestore';
 import { cn } from './lib/utils';
 
 // --- Constants ---
 const ADMIN_EMAILS = ["mhmdasm628@gmail.com", "djcj1421@gmail.com"];
 
 // --- Components ---
 
 const ErrorBoundary = ({ children }: {children: React.ReactNode;}) => {
   const [hasError, setHasError] = useState(false);
   const [errorInfo, setErrorInfo] = useState<any>(null);
 
   useEffect(() => {
     const handleError = (event: ErrorEvent) => {
       if (event.error?.message) {
         try {
           const parsed = JSON.parse(event.error.message);
           if (parsed.error) {
             setHasError(true);
             setErrorInfo(parsed);
           }
         } catch (e) {
 
 
           // Not a JSON error
         }}};
     window.addEventListener('error', handleError);
     return () => window.removeEventListener('error', handleError);
   }, []);
 
   if (hasError) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
         <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full border border-red-100">
           <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
           <h2 className="text-2xl font-bold text-slate-900 mb-2">عذراً، حدث خطأ في النظام</h2>
           <p className="text-slate-600 mb-6">لقد واجهنا مشكلة في الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.</p>
           <div className="bg-red-50 p-4 rounded-xl text-xs font-mono text-red-700 mb-6 overflow-auto max-h-32">
             {JSON.stringify(errorInfo, null, 2)}
           </div>
           <button
             onClick={() => window.location.reload()}
             className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
 
             إعادة تحميل الصفحة
           </button>
         </div>
       </div>);
 
   }
 
   return <>{children}</>;
 };
 
 export default function App() {
   const [user, setUser] = useState<FirebaseUser | null>(null);
   const [isAdmin, setIsAdmin] = useState(false);
   const [isModerator, setIsModerator] = useState(false);
   const [loading, setLoading] = useState(true);
   const [view, setView] = useState<'home' | 'dashboard' | 'my-subscriptions'>('home');
 
   // Data State
   const [categories, setCategories] = useState<any[]>([]);
   const [packages, setPackages] = useState<any[]>([]);
   const [users, setUsers] = useState<any[]>([]);
   const [settings, setSettings] = useState<any>({
     vodafoneCashNumber: "01012345678",
     isMaintenanceMode: false
   });
   const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
   const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
   const [allSubscriptions, setAllSubscriptions] = useState<any[]>([]);
 
   // UI State
   const [showAuthModal, setShowAuthModal] = useState(false);
   const [showPurchaseModal, setShowPurchaseModal] = useState<any>(null);
   const [showChatModal, setShowChatModal] = useState<any>(null);
   const [isMenuOpen, setIsMenuOpen] = useState(false);
 
   // Auth Listener
   useEffect(() => {
     const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
       setUser(firebaseUser);
       if (firebaseUser) {
         const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
         const userData = userDoc.data();
         const role = userData?.role || (ADMIN_EMAILS.includes(firebaseUser.email || '') ? 'admin' : 'user');
 
         setIsAdmin(role === 'admin');
         setIsModerator(role === 'admin' || role === 'moderator');
 
         // Sync user to Firestore
         await setDoc(doc(db, 'users', firebaseUser.uid), {
           uid: firebaseUser.uid,
           email: firebaseUser.email,
           displayName: firebaseUser.displayName,
           photoURL: firebaseUser.photoURL,
           role: role
         }, { merge: true });
       } else {
         setIsAdmin(false);
         setIsModerator(false);
       }
       setLoading(false);
     });
     return () => unsubscribe();
   }, []);
 
   // Data Fetching
   useEffect(() => {
     const loadInitialData = async () => {
       const cats = await categoriesService.getAll();
       const pkgs = await packagesService.getAll();
       setCategories(cats || []);
       setPackages(pkgs || []);
     };
     loadInitialData();
 
     const unsubSettings = settingsService.subscribe((s) => {
       if (s) setSettings(s);
     });
 
     return () => unsubSettings();
   }, []);
 
   // Subscriptions Listener
   useEffect(() => {
     if (user) {
       const unsub = subscriptionsService.subscribeToUserSubscriptions(user.uid, (subs) => {
         setActiveSubscriptions(subs);
       });
       return () => unsub();
     }
   }, [user]);
 
   useEffect(() => {
     if (isModerator) {
       const unsub = subscriptionsService.subscribeToAll((subs) => {
         setAllSubscriptions(subs);
       });
 
       let unsubUsers = () => {};
       if (isAdmin) {
         unsubUsers = usersService.subscribeToAll((u) => {
           setUsers(u);
         });
       }
 
       return () => {
         unsub();
         unsubUsers();
       };
     }
   }, [isModerator, isAdmin]);
 
   const handleLogin = async () => {
     try {
       const provider = new GoogleAuthProvider();
       await signInWithPopup(auth, provider);
       setShowAuthModal(false);
     } catch (error) {
       console.error("Login failed", error);
     }
   };
 
   const handleLogout = async () => {
     await signOut(auth);
     setView('home');
   };
 
   const filteredPackages = selectedCategory === 'all' ?
   packages :
   packages.filter((p) => p.categoryId === selectedCategory);
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
       </div>);
 
   }
 
   return (
     <ErrorBoundary>
       <div className="min-h-screen bg-slate-50 font-sans text-slate-900" dir="rtl">
         {/* Navigation */}
         <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             <div className="flex justify-between h-16 items-center">
               <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
                 <div className="bg-indigo-600 p-2 rounded-lg">
                   <Wifi className="text-white w-6 h-6" />
                 </div>
                 <span className="text-xl font-bold tracking-tight text-indigo-900">نت باكت</span>
               </div>
               
               <div className="hidden md:flex items-center gap-6">
                 <button onClick={() => setView('home')} className={cn("font-medium transition-colors", view === 'home' ? "text-indigo-600" : "text-slate-600 hover:text-indigo-600")}>الرئيسية</button>
                 {user &&
                 <button onClick={() => setView('my-subscriptions')} className={cn("font-medium transition-colors", view === 'my-subscriptions' ? "text-indigo-600" : "text-slate-600 hover:text-indigo-600")}>اشتراكاتي</button>
                 }
                 {isModerator &&
                 <button onClick={() => setView('dashboard')} className={cn("font-medium transition-colors", view === 'dashboard' ? "text-indigo-600" : "text-slate-600 hover:text-indigo-600")}>لوحة التحكم</button>
                 }
                 
                 {user ?
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                       <img src={user.photoURL || ''} alt="" className="w-6 h-6 rounded-full" />
                       <span className="text-sm font-bold">{user.displayName?.split(' ')[0]}</span>
                     </div>
                     <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                       <LogOut className="w-5 h-5" />
                     </button>
                   </div> :
 
                 <button
                   onClick={() => setShowAuthModal(true)}
                   className="bg-indigo-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
 
                     تسجيل الدخول
                   </button>
                 }
               </div>
 
               <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                 {isMenuOpen ? <X /> : <Menu />}
               </button>
             </div>
           </div>
         </nav>
 
         {/* Mobile Menu */}
         <AnimatePresence>
           {isMenuOpen &&
           <motion.div
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="md:hidden bg-white border-b border-slate-200 absolute w-full z-40">
 
               <div className="px-4 pt-2 pb-6 space-y-2">
                 <button onClick={() => {setView('home');setIsMenuOpen(false);}} className="block w-full text-right px-3 py-2 text-slate-700 font-medium">الرئيسية</button>
                 {user && <button onClick={() => {setView('my-subscriptions');setIsMenuOpen(false);}} className="block w-full text-right px-3 py-2 text-slate-700 font-medium">اشتراكاتي</button>}
                 {isModerator && <button onClick={() => {setView('dashboard');setIsMenuOpen(false);}} className="block w-full text-right px-3 py-2 text-slate-700 font-medium">لوحة التحكم</button>}
                 {!user && <button onClick={() => {setShowAuthModal(true);setIsMenuOpen(false);}} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold mt-4">تسجيل الدخول</button>}
                 {user && <button onClick={() => {handleLogout();setIsMenuOpen(false);}} className="w-full bg-red-50 text-red-600 px-6 py-3 rounded-xl font-semibold mt-4">تسجيل الخروج</button>}
               </div>
             </motion.div>
           }
         </AnimatePresence>
 
         <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
           {view === 'home' &&
           <HomeView
             categories={categories}
             packages={filteredPackages}
             selectedCategory={selectedCategory}
             setSelectedCategory={setSelectedCategory}
             onSubscribe={(pkg) => user ? setShowPurchaseModal(pkg) : setShowAuthModal(true)} />
 
           }
           {view === 'dashboard' && isModerator &&
           <DashboardView
             categories={categories}
             packages={packages}
             subscriptions={allSubscriptions}
             users={users}
             isAdmin={isAdmin}
             isModerator={isModerator}
             onOpenChat={(sub: any) => setShowChatModal(sub)}
             onRefresh={async () => {
               const cats = await categoriesService.getAll();
               const pkgs = await packagesService.getAll();
               setCategories(cats || []);
               setPackages(pkgs || []);
             }} />
 
           }
           {view === 'my-subscriptions' && user &&
           <MySubscriptionsView
             subscriptions={activeSubscriptions}
             onOpenChat={(sub) => setShowChatModal(sub)} />
 
           }
         </main>
 
         {/* Modals */}
         <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={handleLogin} />
         <PurchaseModal
           isOpen={!!showPurchaseModal}
           onClose={() => setShowPurchaseModal(null)}
           pkg={showPurchaseModal}
           user={user}
           settings={settings} />
 
         <ChatModal
           isOpen={!!showChatModal}
           onClose={() => setShowChatModal(null)}
           subscription={showChatModal}
           isAdmin={isAdmin}
           isModerator={isModerator} />
 
       </div>
     </ErrorBoundary>);
 
 }
 
 // --- View Components ---
 
 function HomeView({ categories, packages, selectedCategory, setSelectedCategory, onSubscribe }: any) {
   return (
     <div className="space-y-12">
       <header className="text-center space-y-4">
         <h1 className="text-4xl md:text-5xl font-black text-slate-900">باقات الإنترنت المميزة</h1>
         <p className="text-slate-500 text-lg max-w-2xl mx-auto">اختر من بين أفضل العروض والخدمات لجميع الشبكات في مصر.</p>
       </header>
 
       {/* Categories Filter */}
       <div className="flex flex-wrap justify-center gap-3">
         <button
           onClick={() => setSelectedCategory('all')}
           className={cn(
             "px-6 py-2.5 rounded-full font-bold transition-all border-2",
             selectedCategory === 'all' ?
             "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" :
             "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
           )}>
 
           الكل
         </button>
         {categories.map((cat: any) =>
         <button
           key={cat.id}
           onClick={() => setSelectedCategory(cat.id)}
           className={cn(
             "px-6 py-2.5 rounded-full font-bold transition-all border-2",
             selectedCategory === cat.id ?
             "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" :
             "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
           )}>
 
             {cat.name}
           </button>
         )}
       </div>
 
       {/* Packages Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {packages.map((pkg: any) => {
           const isOutOfStock = pkg.stock !== undefined && pkg.stock <= 0;
           return (
             <motion.div
               key={pkg.id}
               layout
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className={cn(
                 "bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 group relative",
                 isOutOfStock && "opacity-75 grayscale-[0.5]"
               )}>
 
               <div className="h-48 overflow-hidden relative">
                 <img
                   src={pkg.imageUrl || `https://picsum.photos/seed/${pkg.id}/600/400`}
                   alt={pkg.name}
                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                   referrerPolicy="no-referrer" />
 
                 <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600">
                   {categories.find((c: any) => c.id === pkg.categoryId)?.name}
                 </div>
                 {isOutOfStock &&
                 <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                     <span className="bg-red-600 text-white px-6 py-2 rounded-full font-black text-lg rotate-[-5deg]">نفذت الكمية</span>
                   </div>
                 }
               </div>
               <div className="p-8 space-y-6">
                 <div className="flex justify-between items-start">
                   <div className="flex-1">
                     <h3 className="text-2xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
                     <p className="text-slate-500 text-sm line-clamp-2">{pkg.description}</p>
                   </div>
                   {pkg.stock !== undefined && pkg.stock > 0 && pkg.stock <= 5 &&
                   <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-[10px] font-bold animate-pulse">
                       بقي {pkg.stock} فقط!
                     </span>
                   }
                 </div>
                 
                 <div className="flex items-center justify-between">
                   <div className="flex items-baseline gap-1">
                     <span className="text-3xl font-black text-indigo-600">{pkg.price}</span>
                     <span className="text-slate-400 text-sm">جنية</span>
                   </div>
                   <div className="flex gap-4 text-xs font-bold text-slate-400">
                     <div className="flex items-center gap-1"><Zap className="w-3 h-3" /> {pkg.speed}</div>
                     <div className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {pkg.quota}</div>
                   </div>
                 </div>
 
                 <button
                   onClick={() => !isOutOfStock && onSubscribe(pkg)}
                   disabled={isOutOfStock}
                   className={cn(
                     "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                     isOutOfStock ?
                     "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" :
                     "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                   )}>
 
                   {isOutOfStock ? 'غير متوفر حالياً' : 'شراء الباقة'} <ArrowRight className="w-5 h-5 rotate-180" />
                 </button>
               </div>
             </motion.div>);
 
         })}
       </div>
     </div>);
 
 }
 
 function MySubscriptionsView({ subscriptions, onOpenChat }: any) {
   return (
     <div className="space-y-8">
       <header>
         <h1 className="text-3xl font-bold text-slate-900">اشتراكاتي</h1>
         <p className="text-slate-500">تابع حالة طلباتك وتواصل مع المشرفين</p>
       </header>
 
       {subscriptions.length === 0 ?
       <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
           <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد اشتراكات حالياً</h3>
           <p className="text-slate-500">ابدأ بتصفح الباقات واشترك في الخدمة التي تناسبك.</p>
         </div> :
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {subscriptions.map((sub: any) =>
         <div key={sub.id} className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex flex-col justify-between gap-6">
               <div className="flex justify-between items-start">
                 <div>
                   <h3 className="text-xl font-bold text-slate-900">{sub.packageName}</h3>
                   <p className="text-slate-400 text-sm">تاريخ الطلب: {new Date(sub.createdAt?.toDate()).toLocaleDateString('ar-EG')}</p>
                 </div>
                 <StatusBadge status={sub.status} />
               </div>
 
               <div className="flex gap-3">
                 {sub.status === 'approved' &&
             <button
               onClick={() => onOpenChat(sub)}
               className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
 
                     <MessageSquare className="w-5 h-5" /> تواصل مع المشرف
                   </button>
             }
                 {sub.status === 'pending' &&
             <div className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-center">
                     في انتظار مراجعة المشرف
                   </div>
             }
                 {sub.status === 'refund_requested' &&
             <div className="flex-1 bg-orange-50 text-orange-600 py-3 rounded-xl font-bold text-center">
                     تم تقديم طلب الاسترداد
                   </div>
             }
               </div>
             </div>
         )}
         </div>
       }
     </div>);
 
 }
 
 function DashboardView({ categories, packages, subscriptions, users, isAdmin, isModerator, onRefresh, onOpenChat }: any) {
   const [tab, setTab] = useState<'stats' | 'subs' | 'packages' | 'categories' | 'users' | 'settings'>(isAdmin ? 'stats' : 'subs');
   const [statsRange, setStatsRange] = useState<'today' | '3days' | 'all' | 'custom'>('all');
   const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
   const [showAddPackage, setShowAddPackage] = useState(false);
   const [showAddCategory, setShowAddCategory] = useState(false);
   const [editingPackage, setEditingPackage] = useState<any>(null);
   const [editingCategory, setEditingCategory] = useState<any>(null);
   const [settings, setSettings] = useState<any>({
     vodafoneCashNumber: '',
     isMaintenanceMode: false
   });
 
   useEffect(() => {
     settingsService.get().then((s) => {
       if (s) setSettings(s);
     });
   }, []);
 
   const handleUpdateSettings = async (e: React.FormEvent) => {
     e.preventDefault();
     await settingsService.update(settings);
     alert('تم حفظ الإعدادات بنجاح');
   };
 
   // Statistics Calculations
   const filteredSubs = subscriptions.filter((s: any) => {
     if (statsRange === 'all') return true;
     const subDate = s.createdAt?.toDate();
     if (!subDate) return false;
     const now = new Date();
     if (statsRange === 'today') {
       return subDate.toDateString() === now.toDateString();
     }
     if (statsRange === '3days') {
       const threeDaysAgo = new Date();
       threeDaysAgo.setDate(now.getDate() - 3);
       return subDate >= threeDaysAgo;
     }
     if (statsRange === 'custom') {
       return subDate.toLocaleDateString('en-CA') === customDate;
     }
     return true;
   });
 
   const totalSales = filteredSubs.filter((s: any) => s.status === 'approved').reduce((acc: number, s: any) => acc + (s.price || 0), 0);
   const activeSubsCount = filteredSubs.filter((s: any) => s.status === 'approved').length;
   const pendingSubsCount = filteredSubs.filter((s: any) => s.status === 'pending').length;
 
   const salesByDay = filteredSubs.
   filter((s: any) => s.status === 'approved').
   reduce((acc: any, s: any) => {
     const date = new Date(s.createdAt?.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     acc[date] = (acc[date] || 0) + s.price;
     return acc;
   }, {});
 
   const chartData = Object.entries(salesByDay).map(([name, value]) => ({ name, value })).slice(-7);
 
   const categoryStats = categories.map((cat: any) => ({
     name: cat.name,
     value: packages.filter((p: any) => p.categoryId === cat.id).length
   }));
 
   const packageSales = packages.map((pkg: any) => ({
     name: pkg.name,
     sales: filteredSubs.filter((s: any) => s.packageId === pkg.id && s.status === 'approved').length
   })).filter((p) => p.sales > 0).sort((a, b) => b.sales - a.sales);
 
   const hasPendingSubs = subscriptions.some((s: any) => s.status === 'pending');
   const hasUnreadMessages = subscriptions.some((s: any) => s.lastMessageSenderId && s.lastMessageSenderId !== auth.currentUser?.uid);
 
   const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
 
   return (
     <div className="space-y-8">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-3xl font-bold text-slate-900">لوحة التحكم</h1>
           <p className="text-slate-500">إدارة الباقات والطلبات والعملاء</p>
         </div>
         {isAdmin &&
         <div className="flex gap-3">
             <button onClick={() => setShowAddCategory(true)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
               <Plus className="w-5 h-5" /> إضافة فئة
             </button>
             <button onClick={() => setShowAddPackage(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all">
               <Plus className="w-5 h-5" /> إضافة باقة
             </button>
           </div>
         }
       </header>
 
       {/* Stats Cards */}
       {tab === 'stats' &&
       <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex flex-wrap items-center gap-4 mb-6">
           <span className="font-bold text-slate-700">تصفية الإحصائيات:</span>
           <div className="flex gap-2">
             <button onClick={() => setStatsRange('today')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", statsRange === 'today' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>اليوم</button>
             <button onClick={() => setStatsRange('3days')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", statsRange === '3days' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>آخر 3 أيام</button>
             <button onClick={() => setStatsRange('all')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", statsRange === 'all' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>الكل</button>
             <div className="flex items-center gap-2">
               <button onClick={() => setStatsRange('custom')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", statsRange === 'custom' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>تاريخ مخصص</button>
               {statsRange === 'custom' &&
             <input
               type="date"
               value={customDate}
               onChange={(e) => setCustomDate(e.target.value)}
               className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
 
             }
             </div>
           </div>
         </div>
       }
 
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex items-center gap-4">
           <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600"><DollarSign className="w-6 h-6" /></div>
           <div>
             <div className="text-xs text-slate-400 font-bold">إجمالي المبيعات</div>
             <div className="text-2xl font-black text-slate-900">{totalSales} ج.م</div>
           </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex items-center gap-4">
           <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600"><CheckCircle2 className="w-6 h-6" /></div>
           <div>
             <div className="text-xs text-slate-400 font-bold">الاشتراكات النشطة</div>
             <div className="text-2xl font-black text-slate-900">{activeSubsCount}</div>
           </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex items-center gap-4">
           <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Clock className="w-6 h-6" /></div>
           <div>
             <div className="text-xs text-slate-400 font-bold">طلبات قيد المراجعة</div>
             <div className="text-2xl font-black text-slate-900">{pendingSubsCount}</div>
           </div>
         </div>
         <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 flex items-center gap-4">
           <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><Users className="w-6 h-6" /></div>
           <div>
             <div className="text-xs text-slate-400 font-bold">إجمالي المستخدمين</div>
             <div className="text-2xl font-black text-slate-900">{users.length}</div>
           </div>
         </div>
       </div>
 
       <div className="flex gap-4 border-b border-slate-200 overflow-x-auto pb-1">
         {isAdmin && <button onClick={() => setTab('stats')} className={cn("px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap", tab === 'stats' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>الإحصائيات</button>}
         <button onClick={() => setTab('subs')} className={cn("px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap relative", tab === 'subs' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>
           طلبات الاشتراك ({subscriptions.length})
           {(hasPendingSubs || hasUnreadMessages) &&
           <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
           }
         </button>
         {isAdmin && <button onClick={() => setTab('packages')} className={cn("px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap", tab === 'packages' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>الباقات ({packages.length})</button>}
         {isAdmin && <button onClick={() => setTab('categories')} className={cn("px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap", tab === 'categories' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>الفئات ({categories.length})</button>}
         {isAdmin && <button onClick={() => setTab('users')} className={cn("px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap", tab === 'users' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>الأعضاء ({users.length})</button>}
         {isAdmin && <button onClick={() => setTab('settings')} className={cn("px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap", tab === 'settings' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400")}>الإعدادات</button>}
       </div>
 
       <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden min-h-[400px]">
         {tab === 'stats' &&
         <div className="p-8 space-y-12">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="space-y-6">
                 <h3 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-indigo-600" /> نمو المبيعات (آخر 7 أيام)</h3>
                 <div className="h-[300px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                       <Tooltip
                       contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                       cursor={{ fill: '#f8fafc' }} />
 
                       <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               </div>
               <div className="space-y-6">
                 <h3 className="text-xl font-bold flex items-center gap-2"><PackageIcon className="text-indigo-600" /> توزيع الباقات حسب الفئة</h3>
                 <div className="h-[300px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                       data={categoryStats}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value">
 
                         {categoryStats.map((entry, index) =>
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       )}
                       </Pie>
                       <Tooltip />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
                 <div className="flex flex-wrap justify-center gap-4">
                   {categoryStats.map((stat, index) =>
                 <div key={stat.name} className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                       <span className="text-xs font-bold text-slate-600">{stat.name}</span>
                     </div>
                 )}
                 </div>
               </div>
             </div>
 
             <div className="space-y-6 pt-8 border-t border-slate-100">
               <h3 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="text-indigo-600" /> مبيعات الباقات التفصيلية</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {packageSales.map((pkg: any) =>
               <div key={pkg.name} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                     <span className="font-bold text-slate-700">{pkg.name}</span>
                     <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-black">{pkg.sales} مبيعة</span>
                   </div>
               )}
                 {packageSales.length === 0 && <p className="text-slate-400 text-sm">لا توجد مبيعات في هذه الفترة.</p>}
               </div>
             </div>
           </div>
         }
 
         {tab === 'subs' &&
         <div className="overflow-x-auto">
             <table className="w-full text-right">
               <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-4 font-bold text-slate-600">العميل</th>
                   <th className="px-6 py-4 font-bold text-slate-600">الباقة</th>
                   <th className="px-6 py-4 font-bold text-slate-600">رقم التحويل</th>
                   <th className="px-6 py-4 font-bold text-slate-600">الحالة</th>
                   <th className="px-6 py-4 font-bold text-slate-600">الإجراءات</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {subscriptions.
               filter((s: any) => isAdmin || s.status === 'approved' || s.status === 'refund_requested' || s.status === 'refunded').
               map((sub: any) =>
               <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-4">
                       <div className="text-sm font-bold">{sub.userEmail}</div>
                       <div className="text-xs text-slate-400">{sub.userId}</div>
                       {sub.status === 'refund_requested' && sub.refundDetails &&
                   <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs border border-red-100">
                           <div className="font-bold text-red-700 mb-1">تفاصيل الاسترداد:</div>
                           <div>من: <span className="font-mono">{sub.refundDetails.senderPhone}</span></div>
                           <div>إلى: <span className="font-mono">{sub.refundDetails.refundPhone}</span></div>
                         </div>
                   }
                     </td>
                     <td className="px-6 py-4 font-medium">{sub.packageName}</td>
                     <td className="px-6 py-4 font-mono text-indigo-600">{sub.senderPhone}</td>
                     <td className="px-6 py-4"><StatusBadge status={sub.status} /></td>
                     <td className="px-6 py-4">
                       <div className="flex gap-2">
                         {isAdmin && sub.status === 'pending' &&
                     <button
                       onClick={() => subscriptionsService.updateStatus(sub.id, 'approved')}
                       className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                       title="تأكيد الدفع">
 
                             <Check className="w-4 h-4" />
                           </button>
                     }
                         {isModerator && sub.status === 'pending' &&
                     <button
                       onClick={() => subscriptionsService.updateStatus(sub.id, 'rejected')}
                       className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                       title="رفض الطلب">
 
                             <X className="w-4 h-4" />
                           </button>
                     }
                         {sub.status === 'approved' &&
                     <button
                       onClick={() => onOpenChat(sub)}
                       className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 relative"
                       title="محادثة">
 
                             <MessageSquare className="w-4 h-4" />
                             {sub.lastMessageSenderId && sub.lastMessageSenderId !== auth.currentUser?.uid &&
                       <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                       }
                           </button>
                     }
                         {isAdmin && sub.status === 'refund_requested' &&
                     <button
                       onClick={() => subscriptionsService.updateStatus(sub.id, 'refunded')}
                       className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold">
 
                             تأكيد الاسترداد
                           </button>
                     }
                       </div>
                     </td>
                   </tr>
               )}
               </tbody>
             </table>
           </div>
         }
 
         {tab === 'users' && isAdmin &&
         <div className="overflow-x-auto">
             <table className="w-full text-right">
               <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-4 font-bold text-slate-600">المستخدم</th>
                   <th className="px-6 py-4 font-bold text-slate-600">البريد الإلكتروني</th>
                   <th className="px-6 py-4 font-bold text-slate-600">الصلاحية</th>
                   <th className="px-6 py-4 font-bold text-slate-600">تغيير الصلاحية</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {users.map((u: any) =>
               <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                         <span className="font-bold">{u.displayName}</span>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-slate-500">{u.email}</td>
                     <td className="px-6 py-4">
                       <span className={cn(
                     "px-3 py-1 rounded-full text-xs font-bold",
                     u.role === 'admin' ? "bg-red-50 text-red-600" :
                     u.role === 'moderator' ? "bg-indigo-50 text-indigo-600" :
                     "bg-slate-100 text-slate-600"
                   )}>
                         {u.role === 'admin' ? 'مدير' : u.role === 'moderator' ? 'مشرف' : 'عضو'}
                       </span>
                     </td>
                     <td className="px-6 py-4">
                       <select
                     value={u.role}
                     onChange={(e) => usersService.updateRole(u.id, e.target.value)}
                     className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                     disabled={ADMIN_EMAILS.includes(u.email)}>
 
                         <option value="user">عضو</option>
                         <option value="moderator">مشرف</option>
                         <option value="admin">مدير</option>
                       </select>
                     </td>
                   </tr>
               )}
               </tbody>
             </table>
           </div>
         }
 
         {tab === 'packages' &&
         <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {packages.map((pkg: any) =>
           <div key={pkg.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-4">
                 <img src={pkg.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                 <div className="flex-1">
                   <h4 className="font-bold">{pkg.name}</h4>
                   <p className="text-xs text-slate-400 mb-2">{pkg.price} ج.م</p>
                   <div className="flex gap-2">
                     <button onClick={() => setEditingPackage(pkg)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                     <button
                   onClick={() => {if (confirm('هل أنت متأكد؟')) packagesService.delete(pkg.id).then(onRefresh);}}
                   className="p-1.5 text-slate-400 hover:text-red-500">
 
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               </div>
           )}
           </div>
         }
 
         {tab === 'categories' &&
         <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {categories.map((cat: any) =>
           <div key={cat.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="bg-white p-2 rounded-lg shadow-sm">
                     <Globe className="w-5 h-5 text-indigo-600" />
                   </div>
                   <span className="font-bold">{cat.name}</span>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => setEditingCategory(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                   <button
                 onClick={() => {if (confirm('هل أنت متأكد؟')) categoriesService.delete(cat.id).then(onRefresh);}}
                 className="p-1.5 text-slate-400 hover:text-red-500">
 
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               </div>
           )}
           </div>
         }
 
         {tab === 'settings' &&
         <div className="p-8 max-w-md mx-auto">
             <form onSubmit={handleUpdateSettings} className="space-y-6">
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">رقم فودافون كاش</label>
                 <input
                 type="text"
                 value={settings.vodafoneCashNumber}
                 onChange={(e) => setSettings({ ...settings, vodafoneCashNumber: e.target.value })}
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                 placeholder="010xxxxxxxx" />
 
               </div>
               <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <div className="flex flex-col">
                   <span className="font-bold">وضع الصيانة</span>
                   <span className="text-xs text-slate-400">إيقاف عمليات الشراء مؤقتاً</span>
                 </div>
                 <button
                 type="button"
                 onClick={() => setSettings({ ...settings, isMaintenanceMode: !settings.isMaintenanceMode })}
                 className={cn(
                   "w-12 h-6 rounded-full transition-all relative",
                   settings.isMaintenanceMode ? "bg-indigo-600" : "bg-slate-300"
                 )}>
 
                   <div className={cn(
                   "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                   settings.isMaintenanceMode ? "right-7" : "right-1"
                 )} />
                 </button>
               </div>
               <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
                 حفظ الإعدادات
               </button>
             </form>
           </div>
         }
       </div>
 
       {/* Admin Modals */}
       <AddPackageModal
         isOpen={showAddPackage || !!editingPackage}
         onClose={() => {setShowAddPackage(false);setEditingPackage(null);}}
         categories={categories}
         onSuccess={onRefresh}
         editingPackage={editingPackage} />
 
       <AddCategoryModal
         isOpen={showAddCategory || !!editingCategory}
         onClose={() => {setShowAddCategory(false);setEditingCategory(null);}}
         onSuccess={onRefresh}
         editingCategory={editingCategory} />
 
     </div>);
 
 }
 
 // --- UI Helper Components ---
 
 function StatusBadge({ status }: {status: string;}) {
   const styles: any = {
     pending: "bg-orange-50 text-orange-600 border-orange-100",
     approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
     rejected: "bg-red-50 text-red-600 border-red-100",
     refund_requested: "bg-indigo-50 text-indigo-600 border-indigo-100",
     refunded: "bg-slate-100 text-slate-500 border-slate-200"
   };
   const labels: any = {
     pending: "قيد المراجعة",
     approved: "مقبول",
     rejected: "مرفوض",
     refund_requested: "طلب استرداد",
     refunded: "تم الاسترداد"
   };
   return (
     <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", styles[status])}>
       {labels[status]}
     </span>);
 
 }
 
 function AuthModal({ isOpen, onClose, onLogin }: any) {
   if (!isOpen) return null;
   return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center">
         <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
           <User className="text-indigo-600 w-8 h-8" />
         </div>
         <h2 className="text-2xl font-bold mb-2">تسجيل الدخول</h2>
         <p className="text-slate-500 mb-8">يرجى تسجيل الدخول لمتابعة عمليات الشراء والاشتراكات.</p>
         <button
           onClick={onLogin}
           className="w-full bg-white border-2 border-slate-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
 
           <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
           الدخول بواسطة جوجل
         </button>
       </motion.div>
     </div>);
 
 }
 
 function PurchaseModal({ isOpen, onClose, pkg, user, settings }: any) {
   const [senderPhone, setSenderPhone] = useState('');
   const [loading, setLoading] = useState(false);
 
   if (!isOpen || !pkg) return null;
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     await subscriptionsService.create({
       userId: user.uid,
       userEmail: user.email,
       packageId: pkg.id,
       packageName: pkg.name,
       price: pkg.price,
       senderPhone
     });
     setLoading(false);
     alert('تم إرسال طلبك بنجاح! سيتم مراجعته من قبل المشرف.');
     onClose();
   };
 
   return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full">
         <h2 className="text-2xl font-bold mb-6">تأكيد شراء الباقة</h2>
         
         {settings.isMaintenanceMode ?
         <div className="bg-red-50 p-6 rounded-2xl text-center space-y-4">
             <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
             <h3 className="text-xl font-bold text-red-900">الموقع قيد الصيانة</h3>
             <p className="text-red-700">عذراً، عمليات الشراء متوقفة حالياً لفترة وجيزة. يرجى المحاولة مرة أخرى لاحقاً.</p>
             <button onClick={onClose} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold">إغلاق</button>
           </div> :
 
         <>
             <div className="bg-indigo-50 p-6 rounded-2xl mb-8 space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-slate-600">الباقة المختارة:</span>
                 <span className="font-bold text-indigo-600">{pkg.name}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-slate-600">المبلغ المطلوب:</span>
                 <span className="font-bold text-indigo-600">{pkg.price} ج.م</span>
               </div>
               <div className="pt-4 border-t border-indigo-100">
                 <p className="text-xs text-slate-500 mb-2">يرجى تحويل المبلغ إلى رقم فودافون كاش التالي:</p>
                 <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-200">
                   <span className="font-mono font-bold text-lg tracking-wider">{settings.vodafoneCashNumber}</span>
                   <button onClick={() => navigator.clipboard.writeText(settings.vodafoneCashNumber)} className="text-indigo-600 text-xs font-bold">نسخ</button>
                 </div>
               </div>
             </div>
 
             <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">الرقم الذي قمت بالتحويل منه</label>
                 <input
                 required
                 type="tel"
                 value={senderPhone}
                 onChange={(e) => setSenderPhone(e.target.value)}
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                 placeholder="01xxxxxxxxx" />
 
               </div>
               <button
               disabled={loading}
               className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
 
                 {loading ? 'جاري الإرسال...' : 'تأكيد التحويل وإرسال الطلب'}
               </button>
             </form>
           </>
         }
       </motion.div>
     </div>);
 
 }
 
 function ChatModal({ isOpen, onClose, subscription, isAdmin, isModerator }: any) {
   const [messages, setMessages] = useState<any[]>([]);
   const [text, setText] = useState('');
   const [showRefundForm, setShowRefundForm] = useState(false);
   const [refundData, setRefundData] = useState({ senderPhone: '', refundPhone: '' });
   const [refundLoading, setRefundLoading] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);
 
   useEffect(() => {
     if (isOpen && subscription) {
       const unsub = chatService.subscribeToMessages(subscription.id, (msgs) => {
         setMessages(msgs);
         setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
       });
       setRefundData({ senderPhone: subscription.senderPhone || '', refundPhone: '' });
       return () => unsub();
     }
   }, [isOpen, subscription]);
 
   if (!isOpen || !subscription) return null;
 
   const handleSend = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!text.trim()) return;
     await chatService.sendMessage(subscription.id, text);
     setText('');
   };
 
   const handleRefundRequest = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!refundData.senderPhone || !refundData.refundPhone) {
       alert('يرجى إدخال كافة البيانات');
       return;
     }
     setRefundLoading(true);
     await refundService.requestRefund(subscription.id, refundData.senderPhone, refundData.refundPhone);
     setRefundLoading(false);
     setShowRefundForm(false);
     alert('تم تقديم طلب الاسترداد بنجاح');
   };
 
   return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
       <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-2xl h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
           <div className="flex items-center gap-4">
             <div>
               <h3 className="font-bold text-lg">محادثة مع {isAdmin || isModerator ? 'العميل' : 'المشرف'}</h3>
               <p className="text-xs opacity-80">باقة: {subscription.packageName}</p>
             </div>
             {(isAdmin || isModerator) && subscription.status === 'approved' &&
             <button
               onClick={() => setShowRefundForm(!showRefundForm)}
               className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all">
 
                 <RotateCcw className="w-3 h-3" /> {showRefundForm ? 'إلغاء الطلب' : 'طلب استرداد'}
               </button>
             }
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
         </div>
 
         {showRefundForm && (isAdmin || isModerator) &&
         <div className="p-6 bg-red-50 border-b border-red-100 animate-in slide-in-from-top duration-300">
             <form onSubmit={handleRefundRequest} className="space-y-4">
               <h4 className="font-bold text-red-900 text-sm">تقديم طلب استرداد للمبلغ</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wider">رقم الهاتف المحول منه</label>
                   <input
                   type="tel"
                   required
                   value={refundData.senderPhone}
                   onChange={(e) => setRefundData({ ...refundData, senderPhone: e.target.value })}
                   className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                   placeholder="01xxxxxxxxx" />
 
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wider">رقم الهاتف المراد التحويل إليه</label>
                   <input
                   type="tel"
                   required
                   value={refundData.refundPhone}
                   onChange={(e) => setRefundData({ ...refundData, refundPhone: e.target.value })}
                   className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                   placeholder="01xxxxxxxxx" />
 
                 </div>
               </div>
               <button
               disabled={refundLoading}
               className="w-full bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 transition-all">
 
                 {refundLoading ? 'جاري الإرسال...' : 'تأكيد طلب الاسترداد'}
               </button>
             </form>
           </div>
         }
 
         <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
           {messages.map((msg: any) =>
           <div key={msg.id} className={cn("flex", msg.senderId === auth.currentUser?.uid ? "justify-start" : "justify-end")}>
               <div className={cn(
               "max-w-[80%] p-4 rounded-2xl text-sm shadow-sm",
               msg.senderId === auth.currentUser?.uid ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
             )}>
                 {msg.text}
               </div>
             </div>
           )}
           <div ref={scrollRef} />
         </div>
 
         <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100 flex gap-3">
           <input
             type="text"
             value={text}
             onChange={(e) => setText(e.target.value)}
             className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
             placeholder="اكتب رسالتك هنا..." />
 
           <button className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all">
             <Send className="w-5 h-5 rotate-180" />
           </button>
         </form>
       </motion.div>
     </div>);
 
 }
 
 
 function AddPackageModal({ isOpen, onClose, categories, onSuccess, editingPackage }: any) {
   const [form, setForm] = useState({ name: '', description: '', price: '', imageUrl: '', categoryId: '', speed: '', quota: '', stock: '0' });
   const [loading, setLoading] = useState(false);
 
   useEffect(() => {
     if (editingPackage) {
       setForm({
         name: editingPackage.name,
         description: editingPackage.description,
         price: editingPackage.price.toString(),
         imageUrl: editingPackage.imageUrl,
         categoryId: editingPackage.categoryId,
         speed: editingPackage.speed,
         quota: editingPackage.quota,
         stock: (editingPackage.stock || 0).toString()
       });
     } else {
       setForm({ name: '', description: '', price: '', imageUrl: '', categoryId: '', speed: '', quota: '', stock: '0' });
     }
   }, [editingPackage, isOpen]);
 
   if (!isOpen) return null;
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     const data = { ...form, price: Number(form.price), stock: Number(form.stock) };
     if (editingPackage) {
       await packagesService.update(editingPackage.id, data);
     } else {
       await packagesService.add(data);
     }
     setLoading(false);
     onSuccess();
     onClose();
   };
 
   return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-y-auto max-h-[90vh]">
         <h2 className="text-2xl font-bold mb-6">{editingPackage ? 'تعديل باقة' : 'إضافة باقة جديدة'}</h2>
         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="md:col-span-2">
             <label className="block text-sm font-bold mb-2">اسم الباقة</label>
             <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" />
           </div>
           <div className="md:col-span-2">
             <label className="block text-sm font-bold mb-2">الوصف</label>
             <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl h-20" />
           </div>
           <div>
             <label className="block text-sm font-bold mb-2">السعر (جنية)</label>
             <input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" />
           </div>
           <div>
             <label className="block text-sm font-bold mb-2">الفئة</label>
             <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl">
               <option value="">اختر الفئة</option>
               {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
           </div>
           <div>
             <label className="block text-sm font-bold mb-2">السرعة</label>
             <input required value={form.speed} onChange={(e) => setForm({ ...form, speed: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" />
           </div>
           <div>
             <label className="block text-sm font-bold mb-2">سعة التحميل</label>
             <input required value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" />
           </div>
           <div>
             <label className="block text-sm font-bold mb-2">الكمية المتوفرة (المخزون)</label>
             <input required type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" />
           </div>
           <div className="md:col-span-2">
             <label className="block text-sm font-bold mb-2">رابط الصورة المباشر</label>
             <input required value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" placeholder="https://..." />
           </div>
           <div className="md:col-span-2 pt-4">
             <button disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
               {loading ? 'جاري الحفظ...' : editingPackage ? 'تحديث الباقة' : 'حفظ الباقة'}
             </button>
           </div>
         </form>
       </motion.div>
     </div>);
 
 }
 
 function AddCategoryModal({ isOpen, onClose, onSuccess, editingCategory }: any) {
   const [name, setName] = useState('');
   const [loading, setLoading] = useState(false);
 
   useEffect(() => {
     if (editingCategory) {
       setName(editingCategory.name);
     } else {
       setName('');
     }
   }, [editingCategory, isOpen]);
 
   if (!isOpen) return null;
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
     if (editingCategory) {
       await categoriesService.update(editingCategory.id, { name });
     } else {
       await categoriesService.add({ name, order: Date.now() });
     }
     setLoading(false);
     onSuccess();
     onClose();
   };
 
   return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full">
         <h2 className="text-2xl font-bold mb-6">{editingCategory ? 'تعديل فئة' : 'إضافة فئة جديدة'}</h2>
         <form onSubmit={handleSubmit} className="space-y-4">
           <div>
             <label className="block text-sm font-bold mb-2">اسم الفئة (مثل: فودافون)</label>
             <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" />
           </div>
           <button disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
             {loading ? 'جاري الحفظ...' : editingCategory ? 'تحديث الفئة' : 'حفظ الفئة'}
           </button>
         </form>
       </motion.div>
     </div>);
 
 }