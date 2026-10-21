import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { BarChart3, Loader2, TrendingUp, TrendingDown, PieChart } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: string;
  categoryId: string;
  description: string;
  expand?: {
    categoryId?: Category;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface Card {
  id: string;
  name: string;
  balance: number;
  color: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [transactionsRes, categoriesRes, cardsRes] = await Promise.all([
        pb.collection('transactions').getFullList({
          filter: `userId = "${user.id}"`,
          sort: '-date',
          expand: 'categoryId',
        }),
        pb.collection('categories').getFullList({}),
        pb.collection('cards').getFullList({ filter: `userId = "${user.id}"` }),
      ]);
      setTransactions(transactionsRes as any);
      setCategories(categoriesRes as any);
      setCards(cardsRes as any);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(n);
  };

  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(2000, 0, 1);
    }

    return transactions.filter(t => new Date(t.date) >= startDate);
  };

  const filtered = getFilteredTransactions();
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Расходы по категориям
  const expenseByCategory: { [key: string]: { amount: number; category: Category | undefined } } = {};
  filtered.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.expand?.categoryId || categories.find(c => c.id === t.categoryId);
    if (!expenseByCategory[t.categoryId]) {
      expenseByCategory[t.categoryId] = { amount: 0, category: cat };
    }
    expenseByCategory[t.categoryId].amount += t.amount;
  });

  const topCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5);

  // Доходы по категориям
  const incomeByCategory: { [key: string]: { amount: number; category: Category | undefined } } = {};
  filtered.filter(t => t.type === 'income').forEach(t => {
    const cat = t.expand?.categoryId || categories.find(c => c.id === t.categoryId);
    if (!incomeByCategory[t.categoryId]) {
      incomeByCategory[t.categoryId] = { amount: 0, category: cat };
    }
    incomeByCategory[t.categoryId].amount += t.amount;
  });

  const topIncomeCategories = Object.entries(incomeByCategory)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5);

  // Динамика по дням (последние 30 дней)
  const dailyData: { [key: string]: { income: number; expense: number } } = {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  transactions.filter(t => new Date(t.date) >= thirtyDaysAgo).forEach(t => {
    const day = t.date;
    if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };
    if (t.type === 'income') dailyData[day].income += t.amount;
    else dailyData[day].expense += t.amount;
  });

  const dailySorted = Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDaily = Math.max(...dailySorted.map(d => Math.max(d[1].income, d[1].expense)), 1);

  const totalBalance = cards.reduce((s, c) => s + c.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-purple-500" />
          Аналитика
        </h1>
      </div>

      {/* Период */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'week', label: 'Неделя' },
          { id: 'month', label: 'Месяц' },
          { id: 'year', label: 'Год' },
          { id: 'all', label: 'Всё время' },
        ] as const).map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              period === p.id
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-sm text-gray-500">Доходы</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatMoney(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-sm text-gray-500">Расходы</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatMoney(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-purple-500" />
            <p className="text-sm text-gray-500">Баланс</p>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoney(balance)}
          </p>
        </div>
      </div>

      {/* Общий баланс */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
        <p className="text-sm text-white/70">Общий баланс на всех счетах</p>
        <p className="text-3xl font-bold mt-1">{formatMoney(totalBalance)}</p>
        <p className="text-sm text-white/60 mt-2">{cards.length} {cards.length === 1 ? 'счёт' : cards.length < 5 ? 'счета' : 'счетов'}</p>
      </div>

      {/* Топ расходов */}
      {topCategories.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Топ расходов
          </h3>
          <div className="space-y-3">
            {topCategories.map(([catId, data]) => {
              const percent = totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0;
              return (
                <div key={catId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{data.category?.icon || '💰'}</span>
                      <span className="text-sm font-medium text-gray-700">{data.category?.name || 'Без категории'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-800">{formatMoney(data.amount)}</span>
                      <span className="text-xs text-gray-400 ml-2">{percent.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: data.category?.color || '#6b7280'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Топ доходов */}
      {topIncomeCategories.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Топ доходов
          </h3>
          <div className="space-y-3">
            {topIncomeCategories.map(([catId, data]) => {
              const percent = totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0;
              return (
                <div key={catId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{data.category?.icon || '💰'}</span>
                      <span className="text-sm font-medium text-gray-700">{data.category?.name || 'Без категории'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-800">{formatMoney(data.amount)}</span>
                      <span className="text-xs text-gray-400 ml-2">{percent.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all bg-green-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Динамика по дням */}
      {dailySorted.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Динамика за 30 дней</h3>
          <div className="flex items-end gap-1 h-32 overflow-x-auto scrollbar-hide">
            {dailySorted.map(([day, data]) => (
              <div key={day} className="flex flex-col items-center gap-1 min-w-[20px]">
                <div className="flex flex-col gap-0.5 w-full items-center">
                  <div
                    className="w-3 bg-green-400 rounded-t-sm"
                    style={{ height: `${(data.income / maxDaily) * 50}px` }}
                    title={`Доход: ${formatMoney(data.income)}`}
                  />
                  <div
                    className="w-3 bg-red-400 rounded-b-sm"
                    style={{ height: `${(data.expense / maxDaily) * 50}px` }}
                    title={`Расход: ${formatMoney(data.expense)}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-400 rounded-sm" />
              <span>Доходы</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-400 rounded-sm" />
              <span>Расходы</span>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Нет данных для анализа</p>
          <p className="text-gray-400 text-sm mt-1">Добавьте операции для отображения аналитики</p>
        </div>
      )}
    </div>
  );
}
