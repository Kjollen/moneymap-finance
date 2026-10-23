import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import {
  Wallet, CreditCard, TrendingUp, TrendingDown,
  PieChart, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';

interface Card {
  id: string;
  name: string;
  balance: number;
  type: string;
}

interface Credit {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
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
  expand?: {
    categoryId?: Category;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cardsRes, creditsRes, categoriesRes, transactionsRes] = await Promise.all([
        pb.collection('cards').getFullList({ filter: `userId = "${user.id}"` }),
        pb.collection('credits').getFullList({ filter: `userId = "${user.id}"` }),
        pb.collection('categories').getFullList({}),
        pb.collection('transactions').getFullList({ 
          filter: `userId = "${user.id}"`, 
          sort: '-date',
          expand: 'categoryId',
        }),
      ]);
      setCards(cardsRes as any);
      setCredits(creditsRes as any);
      setCategories(categoriesRes as any);
      setTransactions(transactionsRes as any);
    } catch (err) {
      console.error('Error loading ', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Разделяем карты на дебетовые и кредитные
  const debitCards = cards.filter(c => c.type === 'debit');
  const creditCards = cards.filter(c => c.type === 'credit');
  
  // Общий баланс = только дебетовые карты (реальные деньги)
  const totalBalance = debitCards.reduce((sum, c) => sum + c.balance, 0);
  
  // Долги = кредитные карты + кредиты
  const creditCardDebt = creditCards.reduce((sum, c) => sum + c.balance, 0);
  const creditsDebt = credits.reduce((sum, c) => sum + c.remainingAmount, 0);
  const totalDebt = creditCardDebt + creditsDebt;
  
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTransactions = transactions.filter(t => t.date.startsWith(thisMonth));
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const recentTransactions = transactions.slice(0, 5);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryInfo = (transaction: Transaction): Category | undefined => {
    if (transaction.expand?.categoryId) {
      return transaction.expand.categoryId;
    }
    return categories.find(c => c.id === transaction.categoryId);
  };

  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Привет, {user?.name || 'друг'}! 👋</h1>
        <p className="text-emerald-100 mt-1">Вот сводка по вашим финансам</p>
      </div>

      {/* Карточки со статистикой */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Общий баланс</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{formatMoney(totalBalance)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Доходы (месяц)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(monthIncome)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Расходы (месяц)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatMoney(monthExpense)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Общий долг</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatMoney(totalDebt)}</p>
              {creditCardDebt > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Кредитные карты: {formatMoney(creditCardDebt)}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Последние транзакции */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-gray-400" />
            Последние операции
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>Пока нет операций</p>
              <p className="text-sm mt-1">Добавьте первую транзакцию</p>
            </div>
          ) : (
            recentTransactions.map(transaction => {
              const category = getCategoryInfo(transaction);
              return (
                <div key={transaction.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: category ? `${category.color}20` : '#f3f4f6' }}
                  >
                    {category?.icon || '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {transaction.description || category?.name || 'Операция'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(transaction.date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {formatMoney(transaction.amount)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Карты */}
      {cards.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            Мои карты
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map(card => (
              <div key={card.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-white">
                <p className="text-sm text-gray-300">{card.name}</p>
                <p className="text-xl font-bold mt-2">{formatMoney(card.balance)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
