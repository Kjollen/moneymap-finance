import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { ArrowUpDown, Plus, Trash2, X, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';

interface Card {
  id: string;
  name: string;
  balance: number;
  type: string;
}

interface Credit {
  id: string;
  name: string;
  remainingAmount: number;
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
  date: string;
  description: string;
  categoryId: string;
  cardId: string;
  field: string;
  userId: string;
  expand?: {
    categoryId?: Category;
  };
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Форма
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cardId, setCardId] = useState('');
  const [field, setField] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Фильтруем категории по типу при смене типа
    const filtered = allCategories.filter(c => c.type === type);
    setCategories(filtered);
    setCategoryId('');
  }, [type, allCategories]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [transactionsRes, cardsRes, creditsRes, categoriesRes] = await Promise.all([
        pb.collection('transactions').getFullList({
          filter: `userId = "${user.id}"`,
          sort: '-date',
          expand: 'categoryId',
        }),
        pb.collection('cards').getFullList({ filter: `userId = "${user.id}"` }),
        pb.collection('credits').getFullList({ filter: `userId = "${user.id}"` }),
        pb.collection('categories').getFullList({}),
      ]);
      setTransactions(transactionsRes as any);
      setCards(cardsRes as any);
      setCredits(creditsRes as any);
      setAllCategories(categoriesRes as any);
      setCategories((categoriesRes as any).filter((c: Category) => c.type === type));
    } catch (err) {
      console.error('Error loading ', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !user) return;

    setSubmitting(true);
    try {
      // Создаём транзакцию
      const record = await pb.collection('transactions').create({
        amount: parseFloat(amount),
        type,
        date,
        description: description.trim(),
        categoryId: categoryId || null,
        cardId: cardId || null,
        field: field.trim(),
        userId: user.id,
      });

      // Обновляем баланс карты
      if (cardId) {
        const card = cards.find(c => c.id === cardId);
        if (card) {
          const newBalance = type === 'income'
            ? card.balance + parseFloat(amount)
            : card.balance - parseFloat(amount);
          await pb.collection('cards').update(cardId, { balance: newBalance });
        }
      }

      // Обновляем данные
      setTransactions([record as any, ...transactions]);
      setAmount('');
      setDescription('');
      setCategoryId('');
      setCardId('');
      setField('');
      setShowAdd(false);

      // Перезагружаем для актуальности
      await loadData();
    } catch (err) {
      console.error('Error creating transaction:', err);
      alert('Ошибка при создании операции');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту операцию?')) return;

    try {
      const transaction = transactions.find(t => t.id === id);
      
      // Откатываем баланс карты
      if (transaction?.cardId) {
        const card = cards.find(c => c.id === transaction.cardId);
        if (card) {
          const newBalance = transaction.type === 'income'
            ? card.balance - transaction.amount
            : card.balance + transaction.amount;
          await pb.collection('cards').update(transaction.cardId, { balance: newBalance });
        }
      }

      // Удаляем транзакцию
      await pb.collection('transactions').delete(id);
      setTransactions(transactions.filter(t => t.id !== id));

      // Перезагружаем данные
      await loadData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Ошибка при удалении операции');
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryInfo = (transaction: Transaction): Category | undefined => {
    // Сначала пробуем из expand
    if (transaction.expand?.categoryId) {
      return transaction.expand.categoryId;
    }
    // Иначе ищем в allCategories
    return allCategories.find(c => c.id === transaction.categoryId);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

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
                  const category = getCategoryInfo(transaction);
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
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {category && <span>{category.name}</span>}
                          {transaction.field && <span>• {transaction.field}</span>}
                        </div>
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
                  onClick={() => setType('expense')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                    type === 'expense' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  Расход
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Доп. поле</label>
                <input
                  type="text"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Необязательно"
                />
              </div>

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
                disabled={submitting}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Добавление...' : 'Добавить операцию'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
