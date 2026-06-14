import { useState } from 'react';

export function useModals() {
  const [modal, setModal] = useState({ type: null, data: null, meta: null });

  const openModal  = (type, data = null, meta = null) => setModal({ type, data, meta });
  const closeModal = () => setModal({ type: null, data: null, meta: null });

  return { modal, openModal, closeModal };
}
