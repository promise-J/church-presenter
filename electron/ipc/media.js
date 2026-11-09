import { ipcMain, dialog } from 'electron';

export function registerMediaIPC() {
  ipcMain.handle('media:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select media',
      properties: ['openFile'],
      filters: [
        { name: 'Media', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'mp4', 'webm', 'mov', 'mkv', 'avi'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
        { name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'mkv', 'avi'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const ext = filePath.split('.').pop().toLowerCase();
    const mediaType = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext) ? 'video' : 'image';
    return {
      path: filePath,
      mediaType,
      name: filePath.split(/[\\/]/).pop(),
    };
  });
}