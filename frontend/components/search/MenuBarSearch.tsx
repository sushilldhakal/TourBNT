'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentContainer } from '@/components/layout/PublicLayoutClient';
import { getApprovedCategories } from '@/lib/api/globalApi';
import { getLatestTours, getTourSearch } from '@/lib/api/tours';
import './MenuBarSearch.css';
import type { Tour, Category } from '@/types/types';

const DEBOUNCE_MS = 350;

interface MenuBarSearchProps {
    headerSearch: boolean;
    handleSearch: () => void;
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

export function MenuBarSearch({ handleSearch, headerSearch }: MenuBarSearchProps) {
    const searchRef = useRef<HTMLDivElement | null>(null);
    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isHeaderFixed, setIsHeaderFixed] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Tour[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [latestTours, setLatestTours] = useState<Tour[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load suggestions only after the search panel opens. Fetching them on
    // every page mount duplicated the homepage's tour and category requests.
    useEffect(() => {
        if (!headerSearch) return;
        let cancelled = false;
        getApprovedCategories()
            .then((res: unknown) => {
                if (cancelled) return;
                const raw = res as { data?: Category[]; items?: Category[] } | Category[] | undefined;
                const list = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
                setCategories(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (!cancelled) setCategories([]);
            });
        getLatestTours()
            .then((res: unknown) => {
                if (cancelled) return;
                const raw = res as { data?: Tour[] } | Tour[] | undefined;
                const list = Array.isArray(raw) ? raw : raw?.data ?? [];
                setLatestTours(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (!cancelled) setLatestTours([]);
            });
        return () => { cancelled = true; };
    }, [headerSearch]);

    useEffect(() => {
        const checkHeaderFixed = () => {
            const header = document.getElementById('main-header');
            if (header) {
                setIsHeaderFixed(header.classList.contains('fixed'));
            }
        };

        window.addEventListener('scroll', checkHeaderFixed);
        checkHeaderFixed();

        return () => {
            window.removeEventListener('scroll', checkHeaderFixed);
        };
    }, []);

    const runSearch = useCallback(async (keyword: string, categoryId: string) => {
        setIsSearching(true);
        try {
            const categoryName = categoryId && categories.length
                ? (categories.find((c) => (c as { _id?: string })._id === categoryId || (c as { id?: string }).id === categoryId) as { name?: string } | undefined)?.name
                : undefined;
            const { items } = await getTourSearch({
                keyword: keyword.trim() || undefined,
                category: categoryName,
                page: 1,
                limit: 12,
            });
            setSearchResults(Array.isArray(items) ? (items as Tour[]) : []);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [categories]);

    // Debounced search when title or category changes
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const hasFilter = title.trim() || selectedCategory;
        if (!hasFilter) {
            setSearchResults([]);
            return;
        }
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            runSearch(title, selectedCategory);
        }, DEBOUNCE_MS);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [title, selectedCategory, runSearch]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category === 'all' ? '' : category);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        await runSearch(title, selectedCategory);
    };

    const clearSearch = () => {
        setTitle('');
        setSelectedCategory('');
        setSearchResults([]);
    };

    const displayTours = searchResults.length > 0 ? searchResults : latestTours;

    return (
        <div
            ref={searchRef}
            id="search"
            className={`cd-main-search fixed ${isHeaderFixed ? 'h-[66px]' : 'h-[106px]'
                } left-0 right-0 w-full bg-secondary shadow-md transition-all duration-500 ease-in-out ${headerSearch
                    ? 'visibilty-visible opacity-100 z-50 top-0'
                    : 'visibilty-hidden opacity-0 h-0 z-0 top-[-400px]'
                }`}
        >
            <ContentContainer className="h-full">
                <form onSubmit={handleSubmit} className="bg-secondary h-full w-full relative transition-all duration-300">
                    <Input
                        className="pr-60 text-foreground h-full w-full text-xl bg-transparent leading-10 focus-visible:ring-offset-0 focus-visible:ring-0 focus-visible:outline-none border-0 placeholder:text-muted-foreground"
                        type="search"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Search tours by name"
                    />
                    <div className="md:hidden cd-select flex z-10 absolute max-md:right-3 max-md:top-[50%] max-md:bottom-auto max-md:translate-y-[-50%]">
                        <button
                            type="submit"
                            className="cd-search-trigger cd-text-replace ml-3 bg-primary text-secondary h-10 w-10 rounded-full flex items-center justify-center"
                        >
                            <Search />
                        </button>
                        <button
                            type="button"
                            className="cd-search-trigger cd-text-replace ml-3"
                            onClick={() => {
                                clearSearch();
                                handleSearch();
                            }}
                        >
                            <X />
                        </button>
                    </div>
                    <div className="cd-select flex z-10 absolute md:right-3 md:top-[50%] md:bottom-auto md:translate-y-[-50%] max-md:pl-[70px]">
                        <span className="mt-2 mr-3">in</span>
                        <Select value={selectedCategory || 'all'} onValueChange={handleCategorySelect}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all">Select all Category</SelectItem>
                                    {categories.length > 0 ? (
                                        categories.map((category) => {
                                            const catId = (category as { _id?: string })._id ?? (category as { id?: string }).id ?? '';
                                            return (
                                                <SelectItem key={catId} value={catId}>
                                                    {category.name}
                                                </SelectItem>
                                            );
                                        })
                                    ) : (
                                        <SelectItem value="loading" disabled>
                                            No categories available
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <button
                            type="submit"
                            className="cd-search-trigger hidden md:flex cd-text-replace ml-3 bg-primary text-secondary h-10 w-10 rounded-full items-center justify-center"
                        >
                            <Search />
                        </button>
                        <button
                            type="button"
                            className="cd-search-trigger hidden md:flex justify-center items-center cd-text-replace ml-3"
                            onClick={() => {
                                clearSearch();
                                handleSearch();
                            }}
                        >
                            <X />
                        </button>
                    </div>
                </form>
            </ContentContainer>

            {headerSearch && (
                <ContentContainer className="cd-search-suggestions grid grid-flow-col transition-all duration-500 ease-in-out grid-cols-12 px-5 py-2 relative w-full bg-secondary">
                    <div className="news col-span-9">
                        <h3 className="mb-5">Tours</h3>
                        {isSearching && (
                            <div className="flex items-center space-x-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        )}
                        <ul>
                            {displayTours.length === 0 && !isSearching && <p>No tours found</p>}

                            {displayTours.map((tour) => {
                                const tourId = (tour as { _id?: string })._id ?? (tour as { id?: string }).id ?? '';
                                return (
                                    <li
                                        key={tourId}
                                        className="flex relative flex-col pl-[100px] mb-5 items-start"
                                    >
                                        <Link
                                            className="image-wrapper pr-5 absolute left-0 top-0"
                                            href={`/tours/${tourId}`}
                                        >
                                            <img
                                                className="w-20 h-15"
                                                src={(tour as { coverImage?: string }).coverImage ?? ''}
                                                alt={tour.title}
                                            />
                                        </Link>
                                        <h4>
                                            <Link className="cd-nowrap" href={`/tours/${tourId}`}>
                                                {tour.title}
                                            </Link>
                                        </h4>
                                        <time dateTime={(tour as { updatedAt?: string }).updatedAt ?? ''} className="text-xs mt-1">
                                            {(tour as { updatedAt?: string }).updatedAt
                                                ? formatDate((tour as { updatedAt: string }).updatedAt)
                                                : ''}
                                        </time>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="quick-links col-span-3 col-end-13 text-right hidden md:flex flex-col">
                        <ul>
                            <li>
                                <h3 className="mb-3">Quick Links</h3>
                            </li>
                            <li className="mb-2">
                                <Link href="/destinations">Find a Destination</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/faq">FAQ&apos;s</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/support">Support</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/contact">Contact Us</Link>
                            </li>
                        </ul>
                    </div>
                </ContentContainer>
            )}
        </div>
    );
}
