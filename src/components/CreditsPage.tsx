import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { CreditCard, Plus, Trash2, X, Loader2, Edit2 } from 'lucide-react';

interface Credit {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  monthlyPayment: number;
  paymentDay: number;
  userId: string;
}

export default function CreditsPage() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

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

      {credits.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Пока нет кредитов</p>
          <p className="text-gray-400 text-sm mt-1">Добавьте кредит для отслеживания</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {credits.map(credit => {
            const progress = getProgress(credit);
            return (
              <div key={credit.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">{credit.name}</h3>
                  <div className="flex items-center gap-2">
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
                    <span className="font-semibold text-orange-600">{formatMoney(credit.remainingAmount)}</span>
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
