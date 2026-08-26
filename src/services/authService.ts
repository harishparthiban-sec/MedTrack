import type { UserProfile } from '../types';

const ACCOUNTS_KEY = 'medtrack_user_accounts_v3';

export interface SavedAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  created_at: string;
}

const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString();
};

export const getSavedAccounts = (): SavedAccount[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const registerAccount = async (
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  const cleanName = name.trim();

  if (!cleanEmail || !cleanPassword || !cleanName) {
    return { success: false, message: 'All fields are required.' };
  }

  // Check local account list first
  const accounts = getSavedAccounts();
  const existing = accounts.find((a) => a.email === cleanEmail);

  if (existing) {
    return {
      success: false,
      message: `An account with ${cleanEmail} already exists. Please switch to Sign In.`,
    };
  }

  // Try FastAPI Backend endpoint
  try {
    const res = await fetch('http://127.0.0.1:8000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanName, email: cleanEmail, password: cleanPassword }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data && data.user) {
      saveLocalAccount(cleanName, cleanEmail, cleanPassword);
      return { success: true, user: data.user };
    }
  } catch {
    // API offline, fallback to local account creation
  }

  // Create New Account Locally
  const newAccount: SavedAccount = {
    id: 'usr-' + Math.random().toString(36).substr(2, 7),
    name: cleanName,
    email: cleanEmail,
    passwordHash: hashString(cleanPassword),
    created_at: new Date().toISOString(),
  };

  accounts.push(newAccount);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

  return {
    success: true,
    user: { id: newAccount.id, name: newAccount.name, email: newAccount.email, streakDays: 1 },
  };
};

export const loginAccount = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, message: 'Please enter both email and password.' };
  }

  // 1. Check local accounts vault
  const accounts = getSavedAccounts();
  const localAccount = accounts.find((a) => a.email === cleanEmail);

  if (localAccount) {
    if (localAccount.passwordHash === hashString(cleanPassword)) {
      return {
        success: true,
        user: { id: localAccount.id, name: localAccount.name, email: localAccount.email, streakDays: 7 },
      };
    } else {
      return {
        success: false,
        message: 'Incorrect password. Click the Eye 👁️ icon to verify what you typed.',
      };
    }
  }

  // 2. Try FastAPI Backend Login
  try {
    const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User', email: cleanEmail, password: cleanPassword }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data && data.user) {
      saveLocalAccount(data.user.name, cleanEmail, cleanPassword);
      return { success: true, user: data.user };
    } else if (data && data.detail) {
      return { success: false, message: data.detail };
    }
  } catch {
    // API offline
  }

  // 3. STRICT REJECTION: If email is not found, DO NOT auto-create account on Sign In!
  return {
    success: false,
    message: `No account found for "${cleanEmail}". Please click "Sign Up" above to register an account first.`,
  };
};

const saveLocalAccount = (name: string, email: string, password: string) => {
  const accounts = getSavedAccounts();
  const cleanEmail = email.trim().toLowerCase();
  if (!accounts.some((a) => a.email === cleanEmail)) {
    accounts.push({
      id: 'usr-' + Math.random().toString(36).substr(2, 7),
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hashString(password.trim()),
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
};
