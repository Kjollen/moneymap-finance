import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { Tag, Plus, Trash2, X, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  userId: string;
}

const DEFAULT_ICONS = ['🛒', '🏠', '🚗', '💊', '🎮', '📱', '👕', '🍕', '⛽', '💡', '📚', '✈️', '🎁', '💰', '💼', '🏥', '🎬', '🐕', '🏋️', '☕'];
const DEFAULT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState('#10b981');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const records = await pb.collection('categories').getFullList({
        filter: `userId = "${user.id}"`,
      });
      setCategories(records as any);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setSubmitting(true);
    try {
      const record = await pb.collection('categories').create({
        name: name.trim(),
        icon,
        color,
        type,
        userId: user.id,
      });
      setCategories([...categories, record as any]);
      setName('');
      setIcon('💰');
      setColor('#10b981');
      setShowAdd(false);
    } catch (err) {
      console.error('Error creating category:', err);
      alert('Ошибка при создании категории');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту категорию?')) return;
    try {
      await pb.collection('categories').delete(id);
      setCategories(categories.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Ошибка при удалении категории');
    }
  };

  const filteredCategories = categories.filter(c => filter === 'all' || c.type === filter);
  const incomeCategories = filteredCategories.filter(c => c.type === 'income');
  const expenseCategories = filteredCategories.filter(c => c.type === 'expense');

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
          <Tag className="w-7 h-7 text-purple-500" />
          Категории
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Фильтр */}
      <div className="flex gap-2">
        {(['all', 'expense', 'income'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'income' ? 'Доходы' : 'Расходы'}
          </button>
        ))}
      </div>

      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Нет категорий</p>
          <p className="text-gray-400 text-sm mt-1">Добавьте категории для ваших операций</p>
        </div>
      ) : (
        <div className="space-y-6">
          {incomeCategories.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-3">Доходы</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {incomeCategories.map(cat => (
                  <div key={cat.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 group relative">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <p className="text-sm font-medium text-gray-700">{cat.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expenseCategories.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">Расходы</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {expenseCategories.map(cat => (
                  <div key={cat.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 group relative">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <p className="text-sm font-medium text-gray-700">{cat.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно добавления */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Новая категория</h2>
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Например: Продукты"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      type === 'expense' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Расход
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      type === 'income' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Доход
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Иконка</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_ICONS.map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition ${
                        icon === i ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Цвет</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition ${
                        color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Добавление...' : 'Добавить категорию'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
