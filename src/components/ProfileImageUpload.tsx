import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface ProfileImageUploadProps {
    currentAvatarUrl?: string | null;
    userId: string;
}

export default function ProfileImageUpload({ currentAvatarUrl, userId }: ProfileImageUploadProps) {
    const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('파일 크기는 2MB 이하여야 합니다.');
            return;
        }

        setUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/profile/avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (result.success && result.url) {
                setAvatarUrl(result.url);
            } else {
                alert(result.error || '업로드에 실패했습니다.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('업로드 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async () => {
        if (!confirm('프로필 이미지를 삭제하시겠습니까?')) return;

        setUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/profile/avatar', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
            });

            const result = await response.json();
            if (result.success) {
                setAvatarUrl(null);
            } else {
                alert(result.error || '삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="Profile"
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <span className="material-symbols-outlined text-6xl text-zinc-400">
                            person
                        </span>
                    )}
                </div>
                {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">upload</span>
                    {avatarUrl ? '변경' : '업로드'}
                </button>
                {avatarUrl && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={uploading}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-red-100 dark:hover:bg-red-900/20 text-zinc-700 dark:text-zinc-300 hover:text-red-600 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        삭제
                    </button>
                )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                JPG, PNG, WebP (최대 2MB)
            </p>
        </div>
    );
}
