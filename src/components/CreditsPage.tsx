import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Credit, getItems, addItem, deleteItem, generateId
} from '../lib/storage';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';

export default function CreditsPage() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credit[]>(
    getItems<Credit>('credits').filter(c => c.userId === user?.id)
  );
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');

  const refreshCredits = () => {
    setCredits(getItems<Credit>('credits').filter(c => c.userId === user?.id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !totalAmount) return;

    const credit: Credit = {
      id: generateId(),
      name: name.trim(),
      totalAmount: parseFloat(totalAmount),
      remainingAmount: parseFloat(remainingAmount) || parseFloat(totalAmount),
      monthlyPayment: parseFloat(monthlyPayment) || 0,
      userId: user!.id,
    };
    addItem('credits', credit);
    setName('');
    setTotalAmount('');
    setRemainingAmount('');
    setMonthlyPayment('');
    setShowAdd(false);
    refreshCredits();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить этот кредит?')) return;
    deleteItem<Credit>('credits', id);
    refreshCredits();
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgress = (credit: Credit) => {
    return ((credit.totalAmount - credit.remainingAmount) / credit.totalAmount) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-orange-500" />
          Мои кредиты
        </h1>
        <button
          onClick={() => setShowAdd(true)}
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
                  <button
                    onClick={() => handleDelete(credit.id)}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                    <span className="text-gray-500">Ежемесячный платёж</span>
                    <span className="text-gray-700">{formatMoney(credit.monthlyPayment)}</span>
                  </div>

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

      {/* Модальное окно добавления */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Новый кредит</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
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
              <button
                type="submit"
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition"
              >
                Добавить кредит
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
