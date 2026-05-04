import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          const profileId = user.email || user.uid;
          const userRef = doc(db, 'users', profileId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const profileData = userSnap.data() as UserProfile;
            // Sync UID if it's missing or different
            if (profileData.uid !== user.uid) {
              await setDoc(userRef, { uid: user.uid }, { merge: true });
            }
            setProfile(profileData);
          } else {
            // Bootstrap logic for Master Admins
            const isMaster = user.email === 'ai.auroratech@gmail.com' || 
                            user.email === 'pedro_santos@akanni.com' || 
                            user.email === 'pedrohenrique0806@gmail.com';
            
            if (isMaster) {
              const newProfile: UserProfile = {
                uid: user.uid,
                displayName: 'Pedro Santos',
                email: user.email!,
                role: 'super_admin'
              };
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
            } else {
              // User logged in but has no profile -> reject
              console.error("Acesso não autorizado: perfil não encontrado.");
              await auth.signOut();
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Erro na inicialização do AuthContext:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.role === 'super_admin' || profile?.role === 'admin_geral' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
