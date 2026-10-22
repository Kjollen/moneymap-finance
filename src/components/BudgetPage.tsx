import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { Wallet, Plus, Trash2, X, Loader2, Target, TrendingUp, TrendingDown, CreditCard, Calendar, Edit2 } from 'lucide-react';

interface BudgetPlan {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  dayOfMonth: number;
  recurring: boolean;
  month: string;
  userId: string;
}

interface Credit {
  id: string;
  name: string;
  monthlyPayment: number;
  paymentDay: number;
}

interface Budget {
  id: string;
  month: string;
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
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BudgetPlan | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Форма для budget_plan
  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planType, setPlanType] = useState<'income' | 'expense'>('income');
  const [planDay, setPlanDay] = useState('');

  // Форма для budget
  const [categoryId, setCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  useEffect(() => {
    loadData();
  }, [user, selectedMonth]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [plansRes, creditsRes, budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
        pb.collection('budget_plans').getFullList({
          filter: `userId = "${user.id}" && month = "${selectedMonth}"`,
        }),
        pb.collection('credits').getFullList({
          filter: `userId = "${user.id}"`,
        }),
        pb.collection('budgets').getFullList({
          filter: `userId = "${user.id}" && month = "${selectedMonth}"`,
          expand: 'categoryId',
        }),
        pb.collection('categories').getFullList({}),
        pb.collection('transactions').getFullList({
          filter: `userId = "${user.id}" && date ~ "${selectedMonth}"`,
        }),
      ]);
      setBudgetPlans(plansRes as any);
      setCredits(creditsRes as any);
      setBudgets(budgetsRes as any);
      setCategories(categoriesRes as any);
      setTransactions(transactionsRes as any);
    } catch (err) {
      console.error('Error loading budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim() || !planAmount || !planDay || !user) return;

    setSubmitting(true);
    try {
      if (editingPlan) {
        // Режим редактирования
        const updated = await pb.collection('budget_plans').update(editingPlan.id, {
          name: planName.trim(),
          amount: parseFloat(planAmount),
          type: planType,
          dayOfMonth: parseInt(planDay),
        });
        setBudgetPlans(budgetPlans.map(p => p.id === editingPlan.id ? updated as any : p));
        setEditingPlan(null);
      } else {
        // Режим создания
        const record = await pb.collection('budget_plans').create({
          name: planName.trim(),
          amount: parseFloat(planAmount),
          type: planType,
          dayOfMonth: parseInt(planDay),
          recurring: true,
          month: selectedMonth,
          userId: user.id,
        });
        setBudgetPlans([...budgetPlans, record as any]);
      }
      setPlanName('');
      setPlanAmount('');
      setPlanDay('');
      setPlanType('income');
      setShowAddPlan(false);
    } catch (err) {
      console.error('Error saving plan:', err);
      alert('Ошибка при сохранении плана');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPlan = (plan: BudgetPlan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanAmount(plan.amount.toString());
    setPlanType(plan.type);
    setPlanDay(plan.dayOfMonth.toString());
    setShowAddPlan(true);
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Удалить этот пункт?')) return;
    try {
      await pb.collection('budget_plans').delete(id);
      setBudgetPlans(budgetPlans.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert('Ошибка при удалении');
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !budgetAmount || !user) return;

    setSubmitting(true);
    try {
      if (editingBudget) {
        // Режим редактирования
        const updated = await pb.collection('budgets').update(editingBudget.id, {
          amount: parseFloat(budgetAmount),
        });
        setBudgets(budgets.map(b => b.id === editingBudget.id ? updated as any : b));
        setEditingBudget(null);
      } else {
        // Режим создания
        const record = await pb.collection('budgets').create({
          month: selectedMonth,
          categoryId,
          amount: parseFloat(budgetAmount),
          userId: user.id,
        });
        setBudgets([...budgets, record as any]);
      }
      setCategoryId('');
      setBudgetAmount('');
      setShowAddBudget(false);
    } catch (err) {
      console.error('Error saving budget:', err);
      alert('Ошибка при сохранении бюджета');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setCategoryId(budget.categoryId);
    setBudgetAmount(budget.amount.toString());
    setShowAddBudget(true);
  };

  const handleDeleteBudget = async (id: string) => {
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

  // Расчёты
  const incomePlans = budgetPlans.filter(p => p.type === 'income');
  const expensePlans = budgetPlans.filter(p => p.type === 'expense');
  
  const totalIncome = incomePlans.reduce((sum, p) => sum + p.amount, 0);
  const totalPlannedExpense = expensePlans.reduce((sum, p) => sum + p.amount, 0);
  const totalCreditPayments = credits.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
  const totalMandatoryExpense = totalPlannedExpense + totalCreditPayments;

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  // Свободные деньги = Доходы - Обязательные платежи - Бюджет по категориям
  const freeMoney = totalIncome - totalMandatoryExpense - totalBudget;

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
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddPlan(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            План
          </button>
          <button
            onClick={() => setShowAddBudget(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Категория
          </button>
        </div>
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

      {/* Три главных блока */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-700">Гарантированные доходы</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{formatMoney(totalIncome)}</p>
          {incomePlans.length > 0 && (
            <div className="mt-3 space-y-1">
              {incomePlans.sort((a, b) => a.dayOfMonth - b.dayOfMonth).map(plan => (
                <div key={plan.id} className="flex items-center justify-between text-xs text-green-600 group">
                  <span>{plan.dayOfMonth} числа — {plan.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{formatMoney(plan.amount)}</span>
                    <button
                      onClick={() => handleEditPlan(plan)}
                      className="opacity-0 group-hover:opacity-100 text-green-500 hover:text-green-700 transition p-0.5"
                      title="Редактировать"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="opacity-0 group-hover:opacity-100 text-green-500 hover:text-red-600 transition p-0.5"
                      title="Удалить"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-red-700">Обязательные платежи</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{formatMoney(totalMandatoryExpense)}</p>
          <div className="mt-3 space-y-1">
            {expensePlans.sort((a, b) => a.dayOfMonth - b.dayOfMonth).map(plan => (
              <div key={plan.id} className="flex items-center justify-between text-xs text-red-600 group">
                <span>{plan.dayOfMonth} числа — {plan.name}</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{formatMoney(plan.amount)}</span>
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-700 transition p-0.5"
                    title="Редактировать"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition p-0.5"
                    title="Удалить"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {credits.filter(c => c.paymentDay).sort((a, b) => a.paymentDay - b.paymentDay).map(credit => (
              <div key={credit.id} className="flex items-center justify-between text-xs text-orange-600">
                <span>{credit.paymentDay} числа — {credit.name}</span>
                <span className="font-medium">{formatMoney(credit.monthlyPayment)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-xl p-5 border ${freeMoney >= 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-br from-red-100 to-red-50 border-red-300'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-5 h-5 ${freeMoney >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            <p className={`text-sm font-medium ${freeMoney >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              Свободные деньги
            </p>
          </div>
          <p className={`text-2xl font-bold ${freeMoney >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {formatMoney(freeMoney)}
          </p>
          <div className={`text-xs mt-2 space-y-1 ${freeMoney >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            <div className="flex justify-between">
              <span>Доходы:</span>
              <span className="font-medium">{formatMoney(totalIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Обязательные платежи:</span>
              <span className="font-medium">-{formatMoney(totalMandatoryExpense)}</span>
            </div>
            <div className="flex justify-between">
              <span>Бюджет по категориям:</span>
              <span className="font-medium">-{formatMoney(totalBudget)}</span>
            </div>
          </div>
          <p className={`text-xs mt-2 ${freeMoney >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {freeMoney >= 0
              ? 'Можно распределить по категориям'
              : 'Дефицит! Расходы превышают доходы'}
          </p>
        </div>
      </div>

      {/* Планирование по категориям */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          Распределение по категориям
          <span className="text-sm font-normal text-gray-400">
            ({formatMoney(totalSpent)} из {formatMoney(totalBudget)})
          </span>
        </h2>

        {budgets.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет бюджета по категориям</p>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditBudget(budget)}
                        className="text-gray-300 hover:text-blue-500 transition"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(budget.id)}
                        className="text-gray-300 hover:text-red-500 transition"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
      </div>

      {/* Модальное окно — План */}
      {showAddPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {editingPlan ? 'Редактировать пункт плана' : 'Новый пункт плана'}
              </h2>
              <button onClick={() => { setShowAddPlan(false); setEditingPlan(null); setPlanName(''); setPlanAmount(''); setPlanDay(''); setPlanType('income'); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPlan} className="space-y-4">
              {/* Тип */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPlanType('income')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                    planType === 'income' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Доход
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType('expense')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                    planType === 'expense' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Расход
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={planType === 'income' ? 'Например: Зарплата' : 'Например: Коммуналка'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                <input
                  type="number"
                  value={planAmount}
                  onChange={(e) => setPlanAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                  placeholder="0"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">День месяца</label>
                <input
                  type="number"
                  value={planDay}
                  onChange={(e) => setPlanDay(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="15"
                  min="1"
                  max="31"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Число, когда приходит/уходит деньги</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Сохранение...' : (editingPlan ? 'Сохранить' : 'Добавить')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно — Бюджет по категории */}
      {showAddBudget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {editingBudget ? 'Редактировать бюджет' : 'Бюджет по категории'}
              </h2>
              <button onClick={() => { setShowAddBudget(false); setEditingBudget(null); setCategoryId(''); setBudgetAmount(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                {editingBudget ? (
                  <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-600 text-sm">
                    {(() => {
                      const cat = getCategoryInfo(editingBudget);
                      return <span className="flex items-center gap-2"><span>{cat?.icon}</span><span>{cat?.name || 'Категория'}</span></span>;
                    })()}
                  </div>
                ) : (
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
                )}
                {expenseCategories.length === 0 && !editingBudget && (
                  <p className="text-xs text-gray-400 mt-1">Сначала добавьте категории расходов</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Лимит на месяц (₽)</label>
                <input
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                  placeholder="0"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !categoryId}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Сохранение...' : (editingBudget ? 'Сохранить' : 'Запланировать')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
