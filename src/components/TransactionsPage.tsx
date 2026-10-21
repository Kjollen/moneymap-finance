import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Transaction, Card, Credit, Category,
  getItems, addItem, deleteItem, updateItem, generateId
} from '../lib/storage';
import { ArrowUpDown, Plus, Trash2, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(
    getItems<Transaction>('transactions').filter(t => t.userId === user?.id)
  );
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Форма
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cardId, setCardId] = useState('');
  const [creditId, setCreditId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const cards = getItems<Card>('cards').filter(c => c.userId === user?.id);
  const credits = getItems<Credit>('credits').filter(c => c.userId === user?.id);
  const categories = getItems<Category>('categories').filter(c => c.userId === user?.id && c.type === type);

  const refreshTransactions = () => {
    setTransactions(getItems<Transaction>('transactions').filter(t => t.userId === user?.id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    const transaction: Transaction = {
      id: generateId(),
      amount: parseFloat(amount),
      type,
      date,
      description: description.trim(),
      categoryId,
      cardId,
      creditId,
      userId: user!.id,
    };
    addItem('transactions', transaction);

    // Обновить баланс карты
    if (cardId) {
      const allCards = getItems<Card>('cards');
      const card = allCards.find(c => c.id === cardId);
      if (card) {
        const newBalance = type === 'income'
          ? card.balance + parseFloat(amount)
          : card.balance - parseFloat(amount);
        updateItem<Card>('cards', cardId, { balance: newBalance });
      }
    }

    // Обновить остаток кредита
    if (creditId && type === 'expense') {
      const allCredits = getItems<Credit>('credits');
      const credit = allCredits.find(c => c.id === creditId);
      if (credit) {
        const newRemaining = Math.max(0, credit.remainingAmount - parseFloat(amount));
        updateItem<Credit>('credits', creditId, { remainingAmount: newRemaining });
      }
    }

    setAmount('');
    setDescription('');
    setCategoryId('');
    setCardId('');
    setCreditId('');
    setShowAdd(false);
    refreshTransactions();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить эту операцию?')) return;
    
    // Откатить баланс карты
    const transaction = transactions.find(t => t.id === id);
    if (transaction?.cardId) {
      const allCards = getItems<Card>('cards');
      const card = allCards.find(c => c.id === transaction.cardId);
      if (card) {
        const newBalance = transaction.type === 'income'
          ? card.balance - transaction.amount
          : card.balance + transaction.amount;
        updateItem<Card>('cards', transaction.cardId, { balance: newBalance });
      }
    }

    deleteItem<Transaction>('transactions', id);
    refreshTransactions();
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryInfo = (catId: string) => {
    const allCategories = getItems<Category>('categories');
    return allCategories.find(c => c.id === catId);
  };

  const filteredTransactions = [...transactions]
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Группировка по дате
  const grouped: { [key: string]: Transaction[] } = {};
  filteredTransactions.forEach(t => {
    const dateKey = t.date;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(t);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ArrowUpDown className="w-7 h-7 text-blue-500" />
          Операции
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Фильтр */}
      <div className="flex gap-2">
        {(['all', 'income', 'expense'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'income' ? 'Доходы' : 'Расходы'}
          </button>
        ))}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <ArrowUpDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Нет операций</p>
          <p className="text-gray-400 text-sm mt-1">Добавьте первую операцию</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateKey, items]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-gray-400 mb-2 px-1">
                {new Date(dateKey).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {items.map(transaction => {
                  const category = getCategoryInfo(transaction.categoryId);
                  return (
                    <div key={transaction.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition group">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: category ? `${category.color}20` : '#f3f4f6' }}
                      >
                        {category?.icon || '💰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {transaction.description || category?.name || 'Операция'}
                        </p>
                        {category && (
                          <p className="text-xs text-gray-400">{category.name}</p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 font-semibold shrink-0 ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {formatMoney(transaction.amount)}
                      </div>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
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
              <h2 className="text-xl font-bold text-gray-800">Новая операция</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              {/* Тип */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategoryId(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                    type === 'expense' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  Расход
                </button>
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategoryId(''); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                    type === 'income' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Доход
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Сначала добавьте категории</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Карта</label>
                <select
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Без карты</option>
                  {cards.map(card => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
              </div>

              {type === 'expense' && credits.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Кредит (оплата)</label>
                  <select
                    value={creditId}
                    onChange={(e) => setCreditId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Без кредита</option>
                    {credits.map(credit => (
                      <option key={credit.id} value={credit.id}>{credit.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Необязательно"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition"
              >
                Добавить операцию
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
