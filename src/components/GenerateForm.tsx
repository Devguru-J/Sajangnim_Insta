import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessType, Tone, Purpose } from '@/types';
import { supabase } from '@/lib/supabase';

interface GenerateFormProps {
    userIndustry?: string;
}

interface GeneratedPreview {
    id: string;
    caption: string;
    hashtags: string[];
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const resizeImageToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const maxDimension = 1280;
                const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
                const width = Math.max(1, Math.round(img.width * scale));
                const height = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to create canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.88;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                while (dataUrl.length > 1_600_000 && quality > 0.55) {
                    quality -= 0.08;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
            img.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
        reader.readAsDataURL(file);
    });

const formatDeviceTime = (date: Date): string =>
    new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);

export default function GenerateForm({ userIndustry }: GenerateFormProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Auto-set business type from user's profile industry
    const getBusinessTypeFromIndustry = (industry?: string): BusinessType => {
        if (!industry) return BusinessType.CAFE;

        const upperIndustry = industry.toUpperCase();
        if (upperIndustry === 'SALON') return BusinessType.SALON;
        if (upperIndustry === 'RESTAURANT') return BusinessType.RESTAURANT;
        if (upperIndustry === 'OTHER') return BusinessType.OTHER;
        if (upperIndustry === 'CAFE') return BusinessType.CAFE;

        return BusinessType.CAFE; // default
    };

    const [businessType] = useState<BusinessType>(getBusinessTypeFromIndustry(userIndustry));
    const [content, setContent] = useState('');
    const [tone, setTone] = useState<Tone>(Tone.EMOTIONAL);
    const [weather, setWeather] = useState('');
    const [inventoryStatus, setInventoryStatus] = useState('');
    const [customerReaction, setCustomerReaction] = useState('');
    const [showContextFields, setShowContextFields] = useState(false);
    const [preview, setPreview] = useState<GeneratedPreview | null>(null);
    const [deviceTime, setDeviceTime] = useState(() => formatDeviceTime(new Date()));
    const [imageDataUrl, setImageDataUrl] = useState('');
    const [imageName, setImageName] = useState('');

    useEffect(() => {
        const updateTime = () => {
            setDeviceTime(formatDeviceTime(new Date()));
        };

        updateTime();
        const msToNextSecond = 1000 - (Date.now() % 1000);
        let intervalId = 0;
        const timeoutId = window.setTimeout(() => {
            updateTime();
            intervalId = window.setInterval(updateTime, 1000);
        }, msToNextSecond);

        return () => {
            window.clearTimeout(timeoutId);
            if (intervalId) window.clearInterval(intervalId);
        };
    }, []);

    const handleGenerate = async () => {
        if (!content.trim()) {
            alert("홍보할 내용을 입력해주세요!");
            return;
        }

        setLoading(true);
        try {
            // Get auth token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("로그인이 필요합니다.");
                navigate('/login');
                return;
            }

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    businessType,
                    content,
                    tone,
                    purpose: Purpose.VISIT,
                    imageDataUrl: imageDataUrl || undefined,
                    todayContext: {
                        weather: weather.trim(),
                        inventoryStatus: inventoryStatus.trim(),
                        customerReaction: customerReaction.trim(),
                    },
                }),
            });

            if (!response.ok) {
                if (response.status === 402 || response.status === 403) {
                    navigate('/limit-reached');
                    return;
                }
                throw new Error('Failed to generate');
            }

            const data = await response.json();
            if (imageDataUrl && data.id) {
                window.sessionStorage.setItem(`generation-image:${data.id}`, imageDataUrl);
            }
            setPreview({
                id: data.id,
                caption: data.caption || '',
                hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
            });
        } catch (error) {
            console.error(error);
            alert("글 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const getIndustryLabel = (type: BusinessType) => {
        if (type === BusinessType.CAFE) return '카페';
        if (type === BusinessType.SALON) return '미용실';
        if (type === BusinessType.RESTAURANT) return '식당/요식업';
        if (type === BusinessType.OTHER) return '기타';
        return '카페';
    };

    const getIndustryIcon = (type: BusinessType) => {
        if (type === BusinessType.CAFE) return 'local_cafe';
        if (type === BusinessType.SALON) return 'content_cut';
        if (type === BusinessType.RESTAURANT) return 'restaurant';
        if (type === BusinessType.OTHER) return 'store';
        return 'local_cafe';
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            alert('이미지 파일은 2MB 이하여야 합니다.');
            return;
        }

        try {
            const compressed = await resizeImageToDataUrl(file);
            setImageDataUrl(compressed);
            setImageName(file.name);
        } catch (error) {
            console.error(error);
            alert('이미지 처리 중 오류가 발생했습니다.');
        } finally {
            e.target.value = '';
        }
    };

    const clearImage = () => {
        setImageDataUrl('');
        setImageName('');
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <section className="lg:col-span-5 space-y-8 animate-fade-in-up">
                    <div>
                        <h2 className="text-3xl font-bold mb-3 text-zinc-900 dark:text-zinc-50">오늘의 홍보 글쓰기</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">사장님이 손님께 알리고 싶은 내용을 편하게 적어주세요.</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-8">
                        {/* Business Type - Auto-selected from profile */}
                        <div>
                            <label className="block text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-50">업종</label>
                            <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-3xl">
                                    {getIndustryIcon(businessType)}
                                </span>
                                <div>
                                    <p className="font-bold text-primary">{getIndustryLabel(businessType)}</p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">프로필에서 설정한 업종입니다</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-50">사진 추가 (선택)</label>
                            <div className="space-y-3">
                                <label className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer hover:border-primary/60 transition-colors">
                                    <span className="material-symbols-outlined text-base">upload</span>
                                    <span className="text-sm font-medium">
                                        {imageDataUrl ? '다른 사진 선택' : '사진 업로드'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                </label>
                                {imageDataUrl && (
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{imageName || '업로드한 사진'}</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">캡션 생성 시 사진 분위기와 구성을 함께 반영합니다.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={clearImage}
                                            className="text-xs font-semibold text-red-500 hover:text-red-600 cursor-pointer"
                                        >
                                            제거
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-50">홍보할 내용</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="예: 신메뉴 딸기라떼 출시했습니다! 이번주 한정 할인해요."
                                className="w-full h-32 p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setShowContextFields((prev) => !prev)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:border-primary/60 transition-colors cursor-pointer"
                            >
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                        오늘 실제 상황 (선택)
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        상황 추가하기
                                    </p>
                                </div>
                                <span
                                    className={`material-symbols-outlined text-zinc-500 transition-transform ${showContextFields ? 'rotate-180' : ''
                                        }`}
                                >
                                    expand_more
                                </span>
                            </button>

                            {showContextFields && (
                                <div className="space-y-3 animate-fade-in">
                                    <input
                                        value={weather}
                                        onChange={(e) => setWeather(e.target.value)}
                                        placeholder="날씨 예: 비 와서 따뜻한 음료 주문이 많아요"
                                        className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                    <input
                                        value={inventoryStatus}
                                        onChange={(e) => setInventoryStatus(e.target.value)}
                                        placeholder="재고/운영상황 예: 딸기 재고가 넉넉해서 오늘은 딸기라떼 중심으로 준비"
                                        className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                    <input
                                        value={customerReaction}
                                        onChange={(e) => setCustomerReaction(e.target.value)}
                                        placeholder="손님 반응 예: 신메뉴 시음 반응이 좋아서 재주문이 나왔어요"
                                        className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-50">말투(톤) 선택</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: Tone.EMOTIONAL, label: "감성적인", icon: "✨" },
                                    { id: Tone.CASUAL, label: "캐주얼한", icon: "😄" },
                                    { id: Tone.PROFESSIONAL, label: "전문적인", icon: "👔" }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTone(t.id as Tone)}
                                        className={`p-3 rounded-lg border flex flex-col items-center text-xs transition-all ${tone === t.id ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
                                    >
                                        <span className="text-xl mb-1">{t.icon}</span>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    폰 미리보기 생성 중...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                    인스타 글 완성하기
                                </>
                            )}
                        </button>

                        {preview && (
                            <button
                                onClick={() => navigate(`/results/${preview.id}`)}
                                className="w-full py-3 rounded-xl border border-primary/30 text-primary font-bold hover:bg-primary/5 transition-colors cursor-pointer"
                            >
                                결과 페이지에서 전체 보기
                            </button>
                        )}
                    </div>
                </section>

                <section className="lg:col-span-7 flex flex-col items-center justify-center">
                    <div className="w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-4 border-[8px] border-zinc-900 dark:border-zinc-800 aspect-[9/19.5] relative overflow-hidden">
                        {/* Mock phone status bar */}
                        <div className="flex justify-between items-center px-6 pt-2 mb-4 text-[10px] font-bold text-zinc-900 dark:text-zinc-50">
                            <span>{deviceTime}</span>
                            <div className="flex gap-1">
                                <span className="material-symbols-outlined text-[12px]">signal_cellular_4_bar</span>
                                <span className="material-symbols-outlined text-[12px]">wifi</span>
                                <span className="material-symbols-outlined text-[12px]">battery_full</span>
                            </div>
                        </div>

                        <div className="h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <div className="size-8 rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
                                <div className="space-y-1 flex-grow">
                                    <div className="h-2 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="h-1.5 w-12 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                                </div>
                            </div>

                            <div className="aspect-square bg-zinc-200 dark:bg-zinc-700 rounded-lg mb-4 flex items-center justify-center text-zinc-400 dark:text-zinc-500 overflow-hidden">
                                {loading ? (
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-100 dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700 animate-pulse"></div>
                                ) : imageDataUrl ? (
                                    <img src={imageDataUrl} alt="업로드 미리보기" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-5xl">image</span>
                                )}
                            </div>

                            {preview ? (
                                <div className="px-2 space-y-3 animate-fade-in">
                                    <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                                        {preview.caption}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {preview.hashtags.slice(0, 6).map((tag, idx) => (
                                            <span
                                                key={`${tag}-${idx}`}
                                                className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 px-2">
                                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="h-2 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                </div>
                            )}

                            <div className="mt-auto pb-10 text-center text-zinc-500 dark:text-zinc-400 italic text-sm">
                                {loading
                                    ? '지금 실제 포스트 느낌으로 문구를 다듬는 중입니다...'
                                    : preview
                                        ? '생성 완료. 아래 버튼으로 전체 결과를 볼 수 있어요.'
                                        : '입력하신 내용으로 멋진 글이 생성될 예정입니다.'}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
