import { createContext, useState, useEffect } from 'react';

export const AjustesContext = createContext();

export const AjustesProvider = ({ children }) => {
  const [ajustes, setAjustes] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('mediaverse_ajustes'));
      return stored || {
        tamanoTexto: 'normal', // normal, grande, muy-grande
        reducirAnimaciones: false,
      };
    } catch {
      return {
        tamanoTexto: 'normal',
        reducirAnimaciones: false,
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('mediaverse_ajustes', JSON.stringify(ajustes));

    const root = document.documentElement;
    const body = document.body;

    // Resetear clases
    root.classList.remove('text-grande', 'text-muy-grande', 'reduce-motion');
    body.classList.remove('text-grande', 'text-muy-grande', 'reduce-motion');

    // Aplicar nuevas clases
    if (ajustes.tamanoTexto === 'grande') root.classList.add('text-grande');
    if (ajustes.tamanoTexto === 'muy-grande') root.classList.add('text-muy-grande');
    if (ajustes.reducirAnimaciones) root.classList.add('reduce-motion');

  }, [ajustes]);

  return (
    <AjustesContext.Provider value={{ ajustes, setAjustes }}>
      {children}
    </AjustesContext.Provider>
  );
};
