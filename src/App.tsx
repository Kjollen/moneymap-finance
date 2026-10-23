import React, { useState, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import CardsPage from './components/CardsPage';
import CreditsPage from './components/CreditsPage';
import CategoriesPage from './components/CategoriesPage';
import TransactionsPage from './components/TransactionsPage';
import BudgetPage from './components/BudgetPage';
import AnalyticsPage from './components/AnalyticsPage';
import {
  LayoutDashboard, CreditCard, Tag, ArrowUpDown,
  LogOut, Wallet, Menu, X, Target, BarChart3
} from 'lucide-react';

type Page = 'dashboard' | 'cards' | 'credits' | 'categories' | 'transactions' | 'budget' | 'analytics';

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Главная', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'cards', label: 'Карты', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'credits', label: 'Кредиты', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'categories', label: 'Категории', icon: <Tag className="w-5 h-5" /> },
  { id: 'transactions', label: 'Операции', icon: <ArrowUpDown className="w-5 h-5" /> },
  { id: 'budget', label: 'Бюджет', icon: <Target className="w-5 h-5" /> },
  { id: 'analytics', label: 'Аналитика', icon: <BarChart3 className="w-5 h-5" /> },
];

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchCurrentX.current !== null) {
      const diff = touchCurrentX.current - touchStartX.current;
      
      // Свайп вправо — открыть меню (только если меню закрыто и свайп от левого края)
      if (diff > 80 && touchStartX.current < 50 && !sidebarOpen) {
        setSidebarOpen(true);
      }
      
      // Свайп влево — закрыть меню
      if (diff < -80 && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'cards': return <CardsPage />;
      case 'credits': return <CreditsPage />;
      case 'categories': return <CategoriesPage />;
      case 'transactions': return <TransactionsPage />;
      case 'budget': return <BudgetPage />;
      case 'analytics': return <AnalyticsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Мобильный оверлей */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Боковая панель */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Логотип */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">MoneyMap</h1>
              <p className="text-xs text-gray-400">Финансы под контролем</p>
            </div>
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                currentPage === item.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className={currentPage === item.id ? 'text-emerald-600' : 'text-gray-400'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Профиль */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-sm">
              {user.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 transition"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Мобильный хедер */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-gray-800">MoneyMap</span>
          </div>
        </header>

        {/* Контент страницы */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
