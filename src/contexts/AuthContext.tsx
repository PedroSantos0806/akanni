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
      // Tentar buscar por UID primeiro (mais seguro), depois por email
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
        setProfile({
          id: data.id,
          uid: data.uid || currentUser.id,
          displayName: data.display_name || data.username || '',
          email: data.email,
          role: data.role
        });
      } else {
        // Bootstrap logic for Master Admins in Supabase
        const isMaster = currentUser.email === 'ai.auroratech@gmail.com' || 
                        currentUser.email === 'pedro_santos@akanni.com' || 
                        currentUser.email === 'pedrohenrique0806@gmail.com';
        
        if (isMaster) {
          const newProfile: UserProfile = {
            id: currentUser.email || currentUser.id,
            uid: currentUser.id,
            displayName: 'Pedro Santos',
            email: currentUser.email!,
            role: 'super_admin'
          };
          
          const { error: insertError } = await supabase.from('users').insert({
            id: currentUser.email || currentUser.id,
            email: currentUser.email,
            display_name: 'Pedro Santos',
            role: 'super_admin',
            uid: currentUser.id
          });
          
          if (insertError) {
            console.error("Erro ao criar perfil mestre:", insertError);
            // Mesmo se falhar o insert, tentamos deixar o usuário entrar localmente
          }
          
          setProfile(newProfile);
        } else {
          console.error("Acesso não autorizado: perfil não encontrado no Supabase.");
          await supabase.auth.signOut();
          setProfile(null);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar perfil no Supabase:", err);
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
