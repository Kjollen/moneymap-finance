import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { Wallet, Eye, EyeOff, Loader2, Server, WifiOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConnectionError(false);
    setLoading(true);

    try {
      if (isRegister) {
        // Регистрация
        if (!name.trim()) {
          setError('Введите имя');
          setLoading(false);
          return;
        }
        
        const data = {
          email,
          password,
          passwordConfirm: password,
          name: name.trim(),
        };

        const record = await pb.collection('users').create(data);
        
        // Авторизуемся сразу после регистрации
        const authData = await pb.collection('users').authWithPassword(email, password);
        
        login({
          id: authData.record.id,
          email: authData.record.email || '',
          name: authData.record.name || name.trim(),
        });
      } else {
        // Вход
        const authData = await pb.collection('users').authWithPassword(email, password);
        
        login({
          id: authData.record.id,
          email: authData.record.email || '',
          name: authData.record.name || authData.record.email || 'Пользователь',
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // Проверяем тип ошибки
      if (err.status === 0 || err.name === 'ClientResponseError' && !err.status) {
        setConnectionError(true);
        setError('Не удалось подключиться к серверу. Проверьте интернет-соединение.');
      } else if (err.status === 400) {
        if (isRegister) {
          // Ошибки валидации при регистрации
          const dataErrors = err.response?.data;
          if (dataErrors?.email) {
            setError('Этот email уже используется');
          } else if (dataErrors?.password) {
            setError('Пароль слишком простой (минимум 8 символов)');
          } else {
            setError('Ошибка регистрации. Проверьте данные.');
          }
        } else {
          setError('Неверный email или пароль');
        }
      } else {
        setError(err.message || 'Произошла ошибка');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <Wallet className="w-10 h-10 text-emerald-300" />
          </div>
          <h1 className="text-3xl font-bold text-white">MoneyMap</h1>
          <p className="text-emerald-200 mt-2">Ваш финансовый помощник</p>
        </div>

        {/* Статус подключения */}
        {connectionError && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-4 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 font-medium text-sm">Нет связи с сервером</p>
              <p className="text-red-300/70 text-xs mt-1">
                Убедитесь, что сервер PocketBase запущен на moneymap-finance.duckdns.org
              </p>
            </div>
          </div>
        )}

        {/* Форма */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            {isRegister ? 'Регистрация' : 'Вход в аккаунт'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-emerald-200 mb-1">
                  Имя
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  placeholder="Ваше имя"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-emerald-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-200 mb-1">
                Пароль
                {isRegister && <span className="text-emerald-300/60 ml-1">(мин. 8 символов)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition pr-12"
                  placeholder="••••••••"
                  required
                  minLength={isRegister ? 8 : 1}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Подключение...
                </>
              ) : (
                <>
                  {isRegister ? 'Зарегистрироваться' : 'Войти'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-emerald-300 hover:text-emerald-200 text-sm transition"
            >
              {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-white/40 text-xs">
          <Server className="w-3 h-3" />
          <span>Данные синхронизируются через сервер</span>
        </div>
      </div>
    </div>
  );
}
