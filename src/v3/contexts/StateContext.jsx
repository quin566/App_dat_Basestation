import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { defaultState, mergeState } from '../utils/initialState';

const StateContext = createContext();

export const StateProvider = ({ children }) => {
  const [state, setState] = useState(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const saveTimeoutRef = useRef(null);

  // Load from IPC on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        if (window.electronAPI) {
          const stored = await window.electronAPI.getState();
          setState(mergeState(stored));
        } else {
          // Fallback for browser dev
          const local = localStorage.getItem('azphoto_state');
          if (local) setState(mergeState(JSON.parse(local)));
        }
      } catch (err) {
        console.error('Failed to load state:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // Debounced save to IPC
  const persistState = useCallback((newState) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      if (window.electronAPI) {
        window.electronAPI.setState(newState);
      } else {
        localStorage.setItem('azphoto_state', JSON.stringify(newState));
      }
      console.log('[V3] State Persisted');
    }, 1000); // 1s debounce
  }, []);

  const updateState = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      persistState(next);
      return next;
    });
  }, [persistState]);

  const value = {
    state,
    updateState,
    isLoaded,
    activeTab,
    setActiveTab,
  };

  return (
    <StateContext.Provider value={value}>
      {children}
    </StateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
};
