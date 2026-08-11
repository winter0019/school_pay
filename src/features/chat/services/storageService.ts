import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: 'image' | 'video' | 'document';
}

export async function uploadChatMedia(
  conversationId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const storage = getStorage();
  
  // Determine media category
  let mediaCategory: 'image' | 'video' | 'document' = 'document';
  if (file.type.startsWith('image/')) {
    mediaCategory = 'image';
  } else if (file.type.startsWith('video/')) {
    mediaCategory = 'video';
  }

  // File path format: chat_attachments/{conversationId}/{timestamp}_{fileName}
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `chat_attachments/${conversationId}/${timestamp}_${safeFileName}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(progress));
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          url: downloadURL,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          type: mediaCategory,
        });
      }
    );
  });
}