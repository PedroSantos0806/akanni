import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, isAdmin: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fallback: Garantir que o loading não dure para sempre se o Supabase não responder
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Supabase Auth timeout: Carregamento forçado após 10s.");
        setLoading(false);
      }
    }, 10000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error("Erro ao obter sessão inicial:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (currentUser: User) => {
    try {
      const isMaster = currentUser.email === 'ai.auroratech@gmail.com' || 
                      currentUser.email === 'pedro_santos@akanni.com' || 
                      currentUser.email === 'pedrohenrique0806@gmail.com';

      const cacheKey = `profile_${currentUser.id}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const cachedProfile = JSON.parse(cached);
        // Se for mestre, garante o cargo mestre no cache também
        if (isMaster) cachedProfile.role = 'super_admin';
        setProfile(cachedProfile);
        setLoading(false);
      }

      console.log(`Buscando perfil para: ${currentUser.email} (Mestre: ${isMaster})`);

      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', currentUser.id)
        .single();

      if (!data && currentUser.email) {
        const { data: emailData } = await supabase
          .from('users')
          .select('*')
          .eq('email', currentUser.email)
          .single();
        data = emailData;
      }

      if (data) {
        const newProfile: UserProfile = {
          id: data.id,
          uid: data.uid || currentUser.id,
          displayName: data.display_name || data.username || '',
          email: data.email,
          role: isMaster ? 'super_admin' : data.role
        };
        setProfile(newProfile);
        localStorage.setItem(cacheKey, JSON.stringify(newProfile));
        console.log("Perfil carregado do banco:", newProfile.role);
      } else if (isMaster) {
        const mProfile: UserProfile = {
          id: currentUser.email || currentUser.id,
          uid: currentUser.id,
          displayName: 'Administrador Mestre',
          email: currentUser.email!,
          role: 'super_admin'
        };
        setProfile(mProfile);
        localStorage.setItem(cacheKey, JSON.stringify(mProfile));
        
        // Auto-provisionamento silencioso
        supabase.from('users').upsert({
          id: currentUser.email || currentUser.id,
          email: currentUser.email,
          display_name: 'Administrador Mestre',
          role: 'super_admin',
          uid: currentUser.id
        }).then(() => console.log("Perfil mestre provisionado."));
      } else {
        console.warn("Perfil não encontrado no banco e não é mestre.");
        setProfile(null);
      }
    } catch (err) {
      console.error("Erro no fetchProfile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.role === 'super_admin' || profile?.role === 'admin_geral' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
