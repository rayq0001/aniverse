import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface ManhwaContextType {
  manhwas: any[];
  loading: boolean;
}

const ManhwaContext = createContext<ManhwaContextType>({ manhwas: [], loading: true });

export const useManhwas = () => useContext(ManhwaContext);

export const ManhwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manhwas, setManhwas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'manhwas'), (snap) => {
      setManhwas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'manhwas');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <ManhwaContext.Provider value={{ manhwas, loading }}>
      {children}
    </ManhwaContext.Provider>
  );
};
