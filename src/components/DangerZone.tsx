import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DangerZone() {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') {
            alert('DELETE를 정확히 입력해주세요.');
            return;
        }

        if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        setDeleting(true);
        try {
            const response = await fetch('/api/profile/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmText }),
            });

            const result = await response.json();
            if (result.success) {
                navigate('/');
            } else {
                alert(result.error || '계정 삭제에 실패했습니다.');
                setDeleting(false);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제 중 오류가 발생했습니다.');
            setDeleting(false);
        }
    };

    return (
        <>
            <div className="mt-12 pt-8 border-t-2 border-red-200 dark:border-red-900/30">
                <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-900/30 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
                            warning
                        </span>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-900 dark:text-red-400 mb-2">
                                위험 구역
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                                계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowModal(true)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">delete_forever</span>
                                계정 삭제
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-red-600 text-4xl">
                                error
                            </span>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                                계정 삭제 확인
                            </h2>
                        </div>

                        <div className="space-y-4 mb-6">
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                계정을 삭제하면 다음 데이터가 영구적으로 삭제됩니다:
                            </p>
                            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-500 text-sm">close</span>
                                    모든 생성된 글
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-500 text-sm">close</span>
                                    프로필 정보
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-500 text-sm">close</span>
                                    구독 정보
                                </li>
                            </ul>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">
                                이 작업은 되돌릴 수 없습니다!
                            </p>

                            <div>
                                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                                    계속하려면 <span className="text-red-600">DELETE</span>를 입력하세요:
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                    disabled={deleting}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setConfirmText('');
                                }}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting || confirmText !== 'DELETE'}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        삭제 중...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">delete_forever</span>
                                        영구 삭제
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
