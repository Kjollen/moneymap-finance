import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { CreditCard, Plus, Trash2, X, Loader2 } from 'lucide-react';

interface Card {
  id: string;
  name: string;
  type: string;
  balance: number;
  creditlimit: number;
  currentdebit: number;
  lastFourdigits: string;
  color: string;
  userId: string;
}

const CARD_TYPES = [
  { value: 'debit', label: 'Дебетовая' },
  { value: 'credit', label: 'Кредитная' },
];

const CARD_COLORS = [
  { value: '#1e293b', label: 'Тёмная' },
  { value: '#059669', label: 'Зелёная' },
  { value: '#2563eb', label: 'Синяя' },
  { value: '#7c3aed', label: 'Фиолетовая' },
  { value: '#dc2626', label: 'Красная' },
  { value: '#d97706', label: 'Оранжевая' },
  { value: '#0891b2', label: 'Бирюзовая' },
  { value: '#be185d', label: 'Розовая' },
];

export default function CardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Форма
  const [name, setName] = useState('');
  const [type, setType] = useState('debit');
  const [balance, setBalance] = useState('');
  const [creditlimit, setCreditlimit] = useState('');
  const [currentdebit, setCurrentdebit] = useState('');
  const [lastFourdigits, setLastFourdigits] = useState('');
  const [color, setColor] = useState('#1e293b');

  useEffect(() => {
    loadCards();
  }, [user]);

  const loadCards = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const records = await pb.collection('cards').getFullList({
        filter: `userId = "${user.id}"`,
      });
      setCards(records as any);
    } catch (err) {
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setType('debit');
    setBalance('');
    setCreditlimit('');
    setCurrentdebit('');
    setLastFourdigits('');
    setColor('#1e293b');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setSubmitting(true);
    try {
      const record = await pb.collection('cards').create({
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        creditlimit: parseFloat(creditlimit) || 0,
        currentdebit: parseFloat(currentdebit) || 0,
        lastFourdigits: lastFourdigits.trim(),
        color,
        userId: user.id,
      });
      setCards([...cards, record as any]);
      resetForm();
      setShowAdd(false);
    } catch (err) {
      console.error('Error creating card:', err);
      alert('Ошибка при создании карты');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту карту?')) return;
    try {
      await pb.collection('cards').delete(id);
      setCards(cards.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting card:', err);
      alert('Ошибка при удалении карты');
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

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
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
              style={{ backgroundColor: card.color || '#1e293b' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">{card.name}</p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {card.type === 'credit' ? 'Кредитная' : 'Дебетовая'}
                      {card.lastFourdigits && ` ••${card.lastFourdigits}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="text-white/50 hover:text-white transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-2xl font-bold mt-4">{formatMoney(card.balance)}</p>
                
                {card.type === 'credit' && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>Лимит:</span>
                      <span>{formatMoney(card.creditlimit)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-white/60">
                      <span>Задолженность:</span>
                      <span>{formatMoney(card.currentdebit)}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-white/80 h-1.5 rounded-full"
                        style={{ width: `${card.creditlimit > 0 ? (card.currentdebit / card.creditlimit) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Новая карта</h2>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип карты</label>
                <div className="flex gap-2">
                  {CARD_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                        type === t.value ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
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
                />
              </div>

              {type === 'credit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Кредитный лимит (₽)</label>
                    <input
                      type="number"
                      value={creditlimit}
                      onChange={(e) => setCreditlimit(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="100000"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Текущая задолженность (₽)</label>
                    <input
                      type="number"
                      value={currentdebit}
                      onChange={(e) => setCurrentdebit(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0"
                      step="0.01"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Последние 4 цифры</label>
                <input
                  type="text"
                  value={lastFourdigits}
                  onChange={(e) => setLastFourdigits(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="1234"
                  maxLength={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Цвет карты</label>
                <div className="flex flex-wrap gap-2">
                  {CARD_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full transition ${
                        color === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Добавление...' : 'Добавить карту'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
