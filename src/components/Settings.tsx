import React, { useState } from 'react';
import { Lock, Save, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export const Settings = () => {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'As senhas não coincidem.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      // 1. Try standard Supabase Auth update
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      
      if (authError) {
        // If session is missing OR user is unconfirmed, try manual update on users table
        if (authError.message.includes('session missing') || authError.message.includes('Email not confirmed') || authError.message.includes('logins are disabled')) {
          const identifier = user?.email || (window as any)._lastLoginId; 
          
          if (identifier) {
            console.log("[Settings] Attempting manual password update for:", identifier);
            const { error: dbError } = await supabase
              .from('users')
              .update({ temp_password: newPassword })
              .or(`email.eq."${identifier}",id.eq."${identifier}"`);
            
            if (dbError) throw dbError;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      }

      setMessage({ text: 'Senha atualizada com sucesso!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password Update Error:', err);
      let errorMsg = 'Erro ao atualizar senha.';
      if (err.message?.includes('New password should be different')) {
        errorMsg = 'A nova senha deve ser diferente da atual.';
      }
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-zinc-900 rounded-xl text-white">
              <Lock size={20} />
            </div>
            <h2 className="text-xl font-bold text-zinc-900">Segurança da Conta</h2>
          </div>
          <p className="text-zinc-500 text-sm">Atualize sua senha de acesso ao sistema.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl flex items-center space-x-3 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{message.text}</span>
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Nova Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} className="mr-2" />
                Atualizar Senha
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-zinc-400">
            A segurança da sua conta é importante. Escolha uma senha forte e não compartilhe com ninguém.
          </p>
        </form>
      </div>
    </div>
  );
};
