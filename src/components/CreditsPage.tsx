import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { CreditCard, Plus, Trash2, X, Loader2, Edit2, CheckCircle } from 'lucide-react';

interface Credit {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  monthlyPayment: number;
  paymentDay: number;
  lastPaidDate: string;
  userId: string;
}

export default function CreditsPage() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('active');
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCredits();
  }, [user]);

  const loadCredits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const records = await pb.collection('credits').getFullList({
        filter: `userId = "${user.id}"`,
      });
      setCredits(records as any);
    } catch (err) {
      console.error('Error loading credits:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setTotalAmount('');
    setRemainingAmount('');
    setInterestRate('');
    setMonthlyPayment('');
    setPaymentDay('');
  };

  const openEdit = (credit: Credit) => {
    setEditingCredit(credit);
    setName(credit.name);
    setTotalAmount(credit.totalAmount?.toString() || '0');
    setRemainingAmount(credit.remainingAmount?.toString() || '0');
    setInterestRate(credit.interestRate?.toString() || '0');
    setMonthlyPayment(credit.monthlyPayment?.toString() || '0');
    setPaymentDay(credit.paymentDay?.toString() || '');
    setShowAdd(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !totalAmount || !user) return;

    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        totalAmount: parseFloat(totalAmount),
        remainingAmount: remainingAmount ? parseFloat(remainingAmount) : parseFloat(totalAmount),
        interestRate: interestRate ? parseFloat(interestRate) : 0,
        monthlyPayment: monthlyPayment ? parseFloat(monthlyPayment) : 0,
        paymentDay: paymentDay ? parseInt(paymentDay) : null,
      };

      if (editingCredit) {
        const updated = await pb.collection('credits').update(editingCredit.id, data);
        setCredits(credits.map(c => c.id === editingCredit.id ? updated as any : c));
      } else {
        const record = await pb.collection('credits').create({
          ...data,
          userId: user.id,
        });
        setCredits([...credits, record as any]);
      }
      resetForm();
      setEditingCredit(null);
      setShowAdd(false);
    } catch (err) {
      console.error('Error saving credit:', err);
      alert('Ошибка при сохранении кредита');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот кредит?')) return;
    try {
      await pb.collection('credits').delete(id);
      setCredits(credits.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting credit:', err);
      alert('Ошибка при удалении кредита');
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getProgress = (credit: Credit) => {
    return ((credit.totalAmount - credit.remainingAmount) / credit.totalAmount) * 100;
  };

  // Определяем статус платежа
  const getPaymentStatus = (credit: Credit): { label: string; color: string; bgColor: string; daysLeft: number | null } => {
    if (!credit.paymentDay) {
      return { label: 'Дата не указана', color: 'text-gray-500', bgColor: 'bg-gray-100', daysLeft: null };
    }

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Проверяем, оплачен ли в этом месяце
    if (credit.lastPaidDate) {
      const lastPaid = new Date(credit.lastPaidDate);
      if (lastPaid.getMonth() === currentMonth && lastPaid.getFullYear() === currentYear) {
        return { label: '✓ Оплачено в этом месяце', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200', daysLeft: null };
      }
    }

    // Считаем дней до платежа
    let daysLeft: number;
    if (credit.paymentDay >= currentDay) {
      daysLeft = credit.paymentDay - currentDay;
    } else {
      // Платёж в следующем месяце
      const nextMonth = new Date(currentYear, currentMonth + 1, credit.paymentDay);
      daysLeft = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (daysLeft === 0) {
      return { label: '⚡ Сегодня день платежа!', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300 animate-pulse', daysLeft };
    } else if (daysLeft <= 3) {
      return { label: `⏰ Платёж через ${daysLeft} дн.`, color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-200', daysLeft };
    } else if (daysLeft <= 7) {
      return { label: `📅 Платёж через ${daysLeft} дн.`, color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200', daysLeft };
    } else {
      return { label: `Платёж через ${daysLeft} дн.`, color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200', daysLeft };
    }
  };

  // Отметить платёж как оплаченный
  const markAsPaid = async (credit: Credit) => {
    if (!confirm(`Отметить платёж "${credit.name}" как оплаченный?`)) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const updated = await pb.collection('credits').update(credit.id, {
        lastPaidDate: today,
        remainingAmount: Math.max(0, credit.remainingAmount - credit.monthlyPayment),
      });
      setCredits(credits.map(c => c.id === credit.id ? updated as any : c));
    } catch (err) {
      console.error('Error marking as paid:', err);
      alert('Ошибка при обновлении');
    }
  };

  // Закрыть кредит досрочно
  const closeCredit = async (credit: Credit) => {
    if (!confirm(`Закрыть кредит "${credit.name}" досрочно?\n\nОстаток долга будет обнулён.`)) return;
    
    try {
      const updated = await pb.collection('credits').update(credit.id, {
        remainingAmount: 0,
      });
      setCredits(credits.map(c => c.id === credit.id ? updated as any : c));
    } catch (err) {
      console.error('Error closing credit:', err);
      alert('Ошибка при закрытии кредита');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Фильтрация кредитов
  const filteredCredits = credits.filter(c => {
    if (filter === 'active') return c.remainingAmount > 0;
    if (filter === 'closed') return c.remainingAmount <= 0;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-orange-500" />
          Мои кредиты
        </h1>
        <button
          onClick={() => { resetForm(); setEditingCredit(null); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Фильтр */}
      <div className="flex gap-2">
        {(['active', 'all', 'closed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Закрытые'}
          </button>
        ))}
      </div>

      {filteredCredits.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {filter === 'active' ? 'Нет активных кредитов' : filter === 'closed' ? 'Нет закрытых кредитов' : 'Пока нет кредитов'}
          </p>
          {filter !== 'all' && (
            <p className="text-gray-400 text-sm mt-1">
              {filter === 'active' ? 'Все кредиты погашены!' : 'Добавьте кредит для отслеживания'}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCredits.map(credit => {
            const progress = getProgress(credit);
            const isClosed = credit.remainingAmount <= 0;
            return (
              <div key={credit.id} className={`rounded-xl p-6 shadow-sm border ${isClosed ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-semibold ${isClosed ? 'text-gray-500' : 'text-gray-800'}`}>{credit.name}</h3>
                    {isClosed && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Закрыт
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isClosed && (
                      <button
                        onClick={() => closeCredit(credit)}
                        className="text-gray-400 hover:text-green-500 transition"
                        title="Закрыть кредит"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(credit)}
                      className="text-gray-400 hover:text-blue-500 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(credit.id)}
                      className="text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Остаток долга</span>
                    <span className={`font-semibold ${isClosed ? 'text-green-600' : 'text-orange-600'}`}>{formatMoney(credit.remainingAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Сумма кредита</span>
                    <span className="text-gray-700">{formatMoney(credit.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ставка</span>
                    <span className="text-gray-700">{credit.interestRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ежемесячный платёж</span>
                    <span className="text-gray-700">{formatMoney(credit.monthlyPayment)}</span>
                  </div>
                  {credit.paymentDay && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">День платежа</span>
                      <span className="text-gray-700 font-medium">{credit.paymentDay} числа</span>
                    </div>
                  )}

                  {/* Прогресс-бар */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Погашено</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(progress, 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Плашка статуса платежа (не показываем для закрытых) */}
                  {!isClosed && credit.paymentDay && (() => {
                    const status = getPaymentStatus(credit);
                    const isPaid = status.label.includes('Оплачено');
                    return (
                      <button
                        onClick={() => !isPaid && markAsPaid(credit)}
                        className={`mt-3 w-full px-3 py-2 rounded-lg border text-sm font-medium transition ${status.bgColor} ${status.color} ${!isPaid ? 'cursor-pointer hover:opacity-80 active:scale-[0.98]' : 'cursor-default'}`}
                        title={!isPaid ? 'Нажмите, чтобы отметить как оплаченный' : ''}
                      >
                        <div className="flex items-center justify-between">
                          <span>{status.label}</span>
                          {!isPaid && <span className="text-xs opacity-60">нажмите ✓</span>}
                        </div>
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно добавления/редактирования */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCredit ? 'Редактировать кредит' : 'Новый кредит'}
              </h2>
              <button onClick={() => { setShowAdd(false); setEditingCredit(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Например: Ипотека"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма кредита (₽)</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="500000"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Остаток долга (₽)</label>
                <input
                  type="number"
                  value={remainingAmount}
                  onChange={(e) => setRemainingAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Оставьте пустым = вся сумма"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Процентная ставка (%)</label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="12.5"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ежемесячный платёж (₽)</label>
                <input
                  type="number"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="25000"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">День платежа (число месяца)</label>
                <input
                  type="number"
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="15"
                  min="1"
                  max="31"
                />
                <p className="text-xs text-gray-400 mt-1">Например, 15 — платёж 15-го числа каждого месяца</p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Сохранение...' : (editingCredit ? 'Сохранить' : 'Добавить кредит')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
