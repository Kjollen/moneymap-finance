import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { Wallet, Plus, Trash2, X, Loader2, Target } from 'lucide-react';

interface Budget {
  id: string;
  month: string; // YYYY-MM
  categoryId: string;
  amount: number;
  userId: string;
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

interface Transaction {
  id: string;
  amount: number;
  type: string;
  categoryId: string;
  date: string;
}

export default function BudgetPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Форма
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadData();
  }, [user, selectedMonth]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
        pb.collection('budgets').getFullList({
          filter: `userId = "${user.id}" && month = "${selectedMonth}"`,
          expand: 'categoryId',
        }),
        pb.collection('categories').getFullList({}),
        pb.collection('transactions').getFullList({
          filter: `userId = "${user.id}" && date ~ "${selectedMonth}"`,
        }),
      ]);
      setBudgets(budgetsRes as any);
      setCategories(categoriesRes as any);
      setTransactions(transactionsRes as any);
    } catch (err) {
      console.error('Error loading budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || !user) return;

    setSubmitting(true);
    try {
      const record = await pb.collection('budgets').create({
        month: selectedMonth,
        categoryId,
        amount: parseFloat(amount),
        userId: user.id,
      });
      setBudgets([...budgets, record as any]);
      setCategoryId('');
      setAmount('');
      setShowAdd(false);
    } catch (err) {
      console.error('Error creating budget:', err);
      alert('Ошибка при создании бюджета');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот бюджет?')) return;
    try {
      await pb.collection('budgets').delete(id);
      setBudgets(budgets.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting budget:', err);
      alert('Ошибка при удалении бюджета');
    }
  };

  const formatMoney = (n: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(n);
  };

  const getSpent = (catId: string) => {
    return transactions
      .filter(t => t.type === 'expense' && t.categoryId === catId)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryInfo = (budget: Budget): Category | undefined => {
    if (budget.expand?.categoryId) return budget.expand.categoryId;
    return categories.find(c => c.id === budget.categoryId);
  };

  const getMonthLabel = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Target className="w-7 h-7 text-indigo-500" />
          Бюджет
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Выбор месяца */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const [y, m] = selectedMonth.split('-').map(Number);
            const d = new Date(y, m - 2);
            setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
        >
          ← Пред.
        </button>
        <div className="flex-1 text-center font-semibold text-gray-700 capitalize">
          {getMonthLabel(selectedMonth)}
        </div>
        <button
          onClick={() => {
            const [y, m] = selectedMonth.split('-').map(Number);
            const d = new Date(y, m);
            setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
        >
          След. →
        </button>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Запланировано</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatMoney(totalBudget)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Потрачено</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatMoney(totalSpent)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Остаток</p>
          <p className={`text-2xl font-bold mt-1 ${totalBudget - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoney(totalBudget - totalSpent)}
          </p>
        </div>
      </div>

      {/* Бюджеты по категориям */}
      {budgets.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Нет бюджета на этот месяц</p>
          <p className="text-gray-400 text-sm mt-1">Запланируйте расходы по категориям</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(budget => {
            const category = getCategoryInfo(budget);
            const spent = getSpent(budget.categoryId);
            const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const isOver = spent > budget.amount;

            return (
              <div key={budget.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: category ? `${category.color}20` : '#f3f4f6' }}
                    >
                      {category?.icon || '💰'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{category?.name || 'Категория'}</p>
                      <p className="text-xs text-gray-400">
                        {formatMoney(spent)} из {formatMoney(budget.amount)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="text-gray-300 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isOver ? 'bg-red-500' : percent > 80 ? 'bg-yellow-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                {isOver && (
                  <p className="text-xs text-red-500 mt-2">Превышен на {formatMoney(spent - budget.amount)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Планирование бюджета</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {expenseCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${
                        categoryId === cat.id
                          ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
                {expenseCategories.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Сначала добавьте категории расходов</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                  placeholder="0"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !categoryId}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Сохранение...' : 'Запланировать'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
