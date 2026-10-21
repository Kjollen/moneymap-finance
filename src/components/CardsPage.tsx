import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Card, getItems, setItems, addItem, deleteItem, generateId
} from '../lib/storage';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';

export default function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>(
    getItems<Card>('cards').filter(c => c.userId === user?.id)
  );
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  const refreshCards = () => {
    setCards(getItems<Card>('cards').filter(c => c.userId === user?.id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !balance) return;

    const card: Card = {
      id: generateId(),
      name: name.trim(),
      balance: parseFloat(balance),
      userId: user!.id,
    };
    addItem('cards', card);
    setName('');
    setBalance('');
    setShowAdd(false);
    refreshCards();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить эту карту?')) return;
    deleteItem<Card>('cards', id);
    refreshCards();
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const gradients = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600',
    'from-gray-800 to-gray-900',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-emerald-600" />
          Мои карты
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Пока нет карт</p>
          <p className="text-gray-400 text-sm mt-1">Добавьте свою первую карту</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className={`bg-gradient-to-br ${gradients[index % gradients.length]} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/70">{card.name}</p>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="text-white/50 hover:text-white transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-2xl font-bold mt-4">{formatMoney(card.balance)}</p>
                <div className="mt-6 flex items-center gap-2">
                  <div className="w-8 h-5 bg-yellow-400/80 rounded-sm" />
                  <span className="text-xs text-white/50">MoneyMap</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно добавления */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Новая карта</h2>
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Например: Сбербанк"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Баланс (₽)</label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                  step="0.01"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition"
              >
                Добавить карту
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
