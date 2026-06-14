import { useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { foldersApi } from '../../api/drive.js';
import { toast } from '../ui/Toast.jsx';
import { useTranslation } from 'react-i18next';

export function RenameModal({ folder, onClose, onRenamed }) {
  const { t } = useTranslation();
  const [name, setName] = useState(folder.name);
  const [loading, setLoading] = useState(false);

  async function handleRename() {
    if (!name.trim() || name === folder.name) { onClose(); return; }
    setLoading(true);
    try {
      const updated = await foldersApi.rename(folder.id, name.trim());
      toast.success('Folder renamed');
      onRenamed(updated.folder);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={t('drive.name')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('admin.cancel')}</Button>
          <Button onClick={handleRename} loading={loading}>{t('admin.save')}</Button>
        </>
      }
    >
      <Input
        label={t('drive.name')}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleRename()}
        autoFocus
      />
    </Modal>
  );
}
