// Локальное хранилище для демо-режима (замена PocketBase при отсутствии сервера)

export interface Card {
  id: string;
  name: string;
  balance: number;
  userId: string;
}

export interface Credit {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  userId: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  userId: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  description: string;
  categoryId: string;
  cardId: string;
  creditId: string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

const STORAGE_PREFIX = 'moneymap_';

function getKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function getItems<T>(collection: string): T[] {
  const data = localStorage.getItem(getKey(collection));
  return data ? JSON.parse(data) : [];
}

export function setItems<T>(collection: string, items: T[]): void {
  localStorage.setItem(getKey(collection), JSON.stringify(items));
}

export function addItem<T extends { id: string }>(collection: string, item: T): T {
  const items = getItems<T>(collection);
  items.push(item);
  setItems(collection, items);
  return item;
}

export function updateItem<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): T | null {
  const items = getItems<T>(collection);
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates };
  setItems(collection, items);
  return items[index];
}

export function deleteItem<T extends { id: string }>(collection: string, id: string): boolean {
  const items = getItems<T>(collection);
  const filtered = items.filter(item => item.id !== id);
  if (filtered.length === items.length) return false;
  setItems(collection, filtered);
  return true;
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Авторизация
export function saveUser(user: User): void {
  localStorage.setItem(getKey('currentUser'), JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(getKey('currentUser'));
  return data ? JSON.parse(data) : null;
}

export function clearUser(): void {
  localStorage.removeItem(getKey('currentUser'));
}

// Пользователи (регистрация)
export function getUsers(): { id: string; email: string; name: string; password: string }[] {
  const data = localStorage.getItem(getKey('users'));
  return data ? JSON.parse(data) : [];
}

export function registerUser(email: string, password: string, name: string): User | null {
  const users = getUsers();
  if (users.find(u => u.email === email)) return null;
  const user = { id: generateId(), email, name, password };
  users.push(user);
  localStorage.setItem(getKey('users'), JSON.stringify(users));
  return { id: user.id, email: user.email, name: user.name };
}

export function loginUser(email: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name };
}
