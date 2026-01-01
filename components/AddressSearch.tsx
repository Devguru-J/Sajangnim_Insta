'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AddressResult } from 'slick-address-kr/dist/types';

interface AddressSearchProps {
    value?: string;
    onComplete: (data: { address: string; zonecode: string; sido: string; sigungu: string }) => void;
}

export default function AddressSearch({ value = '', onComplete }: AddressSearchProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<AddressResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Sync query with value prop only if not editing (optional, but good for initial load)
    useEffect(() => {
        if (value && !isOpen) {
            setQuery(value);
        }
    }, [value, isOpen]);

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(-1);
    }, [results]);

    // Use ref to keep single instance of other objects if needed, or just state
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isComposing = useRef(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && resultRefs.current[selectedIndex]) {
            resultRefs.current[selectedIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [selectedIndex]);

    const handleSearch = async (keyword: string) => {
        if (!keyword || keyword.trim().length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        setIsOpen(true);

        try {
            // Call local proxy API instead of direct external call to avoid CORS
            const params = new URLSearchParams({
                keyword: keyword.trim(),
                currentPage: '1',
                countPerPage: '10'
            });

            const response = await fetch(`/api/juso?${params.toString()}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            if (data && data.results && data.results.juso) {
                // Map the raw API response to AddressResult type
                const mappedResults: AddressResult[] = data.results.juso.map((item: any) => ({
                    roadAddress: item.roadAddr,
                    jibunAddress: item.jibunAddr,
                    zipCode: item.zipNo,
                    buildingName: item.bdNm || '',
                    sido: item.siNm,
                    sigungu: item.sggNm,
                    bname: item.emdNm
                }));
                setResults(mappedResults);
            } else {
                setResults([]);
            }
        } catch (error) {
            console.error("Address search failed", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setQuery(text);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (text.trim().length > 1) {
            debounceTimer.current = setTimeout(() => {
                handleSearch(text);
            }, 300);
        } else {
            setIsOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || results.length === 0) return;

        // Ignore events strictly during IME composition
        if (isComposing.current) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => {
                    if (prev === -1) return 0; // Explicitly start at first item
                    return prev < results.length - 1 ? prev + 1 : prev;
                });
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > -1 ? prev - 1 : prev)); // Allow going back to input (-1)
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleSelect = (addr: AddressResult) => {
        const fullAddress = addr.roadAddress;
        setQuery(fullAddress);
        setIsOpen(false);
        onComplete({
            address: fullAddress,
            zonecode: addr.zipCode,
            sido: addr.sido || '',
            sigungu: addr.sigungu || ''
        });
    };

    return (
        <div className="w-full relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    autoComplete="off"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => isComposing.current = true}
                    onCompositionEnd={() => isComposing.current = false}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="도로명 또는 지번 주소 입력 (예: 강남대로 373)"
                    onFocus={() => {
                        if (query.trim().length > 1 && results.length > 0) setIsOpen(true);
                    }}
                />
                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl max-h-[600px] overflow-y-auto pb-4">
                    {results.map((addr, idx) => (
                        <div
                            key={`${addr.roadAddress}-${idx}`}
                            ref={el => { resultRefs.current[idx] = el; }}
                            onClick={() => handleSelect(addr)}
                            className={`p-4 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 ${idx === selectedIndex
                                ? 'bg-gray-100 dark:bg-zinc-700'
                                : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-text-sub dark:text-gray-400">도로명</span>
                                <span className="font-medium text-sm text-text-main dark:text-white">{addr.roadAddress}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">지번</span>
                                <span className="text-xs text-text-sub dark:text-gray-400">{addr.jibunAddress}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isOpen && !loading && results.length === 0 && query.trim().length > 1 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-4 text-center text-sm text-text-sub dark:text-gray-400">
                    검색 결과가 없습니다.
                </div>
            )}
        </div>
    );
}
