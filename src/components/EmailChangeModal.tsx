import { useState } from 'react';

interface EmailChangeModalProps {
    currentEmail: string;
    onClose: () => void;
}

export default function EmailChangeModal({ currentEmail, onClose }: EmailChangeModalProps) {
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newEmail || !password) {
            setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' });
            return;
        }

        if (newEmail === currentEmail) {
            setMessage({ type: 'error', text: '현재 이메일과 동일합니다.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/profile/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newEmail, password }),
            });

            const result = await response.json();

            if (result.success) {
                setMessage({
                    type: 'success',
                    text: '인증 이메일이 발송되었습니다. 새 이메일 주소에서 확인해주세요.'
                });
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                setMessage({ type: 'error', text: result.error || '이메일 변경에 실패했습니다.' });
            }
        } catch (error) {
            console.error('Email change error:', error);
            setMessage({ type: 'error', text: '오류가 발생했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">email</span>
                        이메일 변경
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-zinc-500">close</span>
                    </button>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-4 ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                            현재 이메일
                        </label>
                        <input
                            type="email"
                            value={currentEmail}
                            disabled
                            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                            새 이메일
                        </label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="new@example.com"
                            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                            현재 비밀번호 (확인용)
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            disabled={loading}
                            required
                        />
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        새 이메일 주소로 인증 링크가 발송됩니다. 링크를 클릭하면 이메일이 변경됩니다.
                    </p>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    처리 중...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">send</span>
                                    인증 이메일 발송
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
